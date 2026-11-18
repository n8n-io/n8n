//! The Respond to Webhook node, `n8n-nodes-base.respondToWebhook`, versions 1 to 1.5.
//!
//! Supported answers: all incoming items, the first incoming item, JSON, text,
//! no data, and a redirect. Supported options: response code, response headers
//! and response key. As in n8n, the node evaluates its parameters against the
//! first input item, and passes all input items through to its output.

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Map, Value};

use super::params::{self, NameValue, set_field};
use crate::context::ExecutionContext;
use crate::convert::to_text;
use crate::http::{Body, Headers, HttpResponse};
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, NodeType};
use crate::workflow::NodeDefinition;

pub struct RespondToWebhookType;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    #[serde(default)]
    respond_with: RespondWith,
    #[serde(default)]
    response_body: Value,
    #[serde(default, rename = "redirectURL")]
    redirect_url: Value,
    #[serde(default)]
    options: Options,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
enum RespondWith {
    AllIncomingItems,
    #[default]
    FirstIncomingItem,
    Json,
    Text,
    NoData,
    Redirect,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Options {
    #[serde(default)]
    response_code: Option<u16>,
    #[serde(default)]
    response_headers: ResponseHeaders,
    #[serde(default)]
    response_key: Option<String>,
}

#[derive(Default, Deserialize)]
struct ResponseHeaders {
    #[serde(default)]
    entries: Vec<NameValue>,
}

impl NodeType for RespondToWebhookType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.respondToWebhook"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 1.0, 1.5)?;
        let parameters: Parameters = params::parse(definition)?;
        Ok(NodeInstance::Action(Box::new(RespondToWebhook(parameters))))
    }
}

struct RespondToWebhook(Parameters);

impl RespondToWebhook {
    fn response(
        &self,
        context: &dyn ExecutionContext,
        input: &[Item],
    ) -> Result<HttpResponse, NodeError> {
        let parameters = &self.0;
        let first = input.first().cloned().unwrap_or_default();
        let evaluate = |value: &Value| context.evaluate(value, &first, 0);
        let mut headers = self.headers(context, &first)?;
        let body = match parameters.respond_with {
            RespondWith::AllIncomingItems => {
                let all = input.iter().map(|item| Value::Object(item.json.clone()));
                Body::Json(self.wrap(Value::Array(all.collect())))
            }
            RespondWith::FirstIncomingItem => {
                Body::Json(self.wrap(Value::Object(first.json.clone())))
            }
            RespondWith::Json => Body::Json(params::evaluate_json(
                "responseBody",
                &parameters.response_body,
                context,
                &first,
                0,
            )?),
            RespondWith::Text => Body::Text(to_text(&evaluate(&parameters.response_body)?)),
            RespondWith::NoData => Body::Empty,
            RespondWith::Redirect => {
                let location = to_text(&evaluate(&parameters.redirect_url)?);
                headers.insert("location".into(), location);
                Body::Empty
            }
        };
        let default_status = match parameters.respond_with {
            RespondWith::Redirect => 307,
            _ => 200,
        };
        Ok(HttpResponse {
            status: parameters.options.response_code.unwrap_or(default_status),
            headers,
            body,
        })
    }

    /// Header names are lowercased, as in n8n.
    fn headers(&self, context: &dyn ExecutionContext, first: &Item) -> Result<Headers, NodeError> {
        let entries = &self.0.options.response_headers.entries;
        let values = params::evaluate_pairs(entries, context, first, 0)?;
        Ok(values
            .into_iter()
            .map(|(name, value)| (name.to_lowercase(), to_text(&value)))
            .collect())
    }

    /// Places `value` under the `responseKey` option, when it is set.
    fn wrap(&self, value: Value) -> Value {
        match self.0.options.response_key.as_deref() {
            Some(key) if !key.is_empty() => {
                let mut json = Map::new();
                set_field(&mut json, key, value, true);
                Value::Object(json)
            }
            _ => value,
        }
    }
}

#[async_trait]
impl ActionNode for RespondToWebhook {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let response = self.response(context, &input)?;
        context.respond(response)?;
        Ok(vec![input])
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::testing::{TestContext, action, definition, items};

    async fn respond(parameters: Value, input: &[Value]) -> HttpResponse {
        let definition = definition("n8n-nodes-base.respondToWebhook", 1.5, parameters);
        let node = action(RespondToWebhookType.create(&definition).unwrap());
        let context = TestContext::default();

        let output = node.execute(&context, items(input)).await.unwrap();

        assert_eq!(
            output,
            vec![items(input)],
            "the node passes its input through"
        );
        context.response().expect("the node sent no response")
    }

    #[tokio::test]
    async fn answers_with_the_first_item_by_default() {
        let response = respond(
            json!({ "options": {} }),
            &[json!({ "a": 1 }), json!({ "a": 2 })],
        )
        .await;

        assert_eq!(response.status, 200);
        assert_eq!(response.body, Body::Json(json!({ "a": 1 })));
    }

    #[tokio::test]
    async fn answers_with_all_items_under_a_response_key() {
        let parameters = json!({
            "respondWith": "allIncomingItems",
            "options": { "responseKey": "data.items" }
        });

        let response = respond(parameters, &[json!({ "a": 1 }), json!({ "a": 2 })]).await;

        assert_eq!(
            response.body,
            Body::Json(json!({ "data": { "items": [{ "a": 1 }, { "a": 2 }] } }))
        );
    }

    #[tokio::test]
    async fn answers_with_evaluated_json_code_and_headers() {
        let parameters = json!({
            "respondWith": "json",
            "responseBody": "={ \"greeting\": \"Hello {{ $json.name }}\" }",
            "options": {
                "responseCode": 201,
                "responseHeaders": { "entries": [{ "name": "X-Request", "value": "={{ $json.id }}" }] }
            }
        });

        let response = respond(parameters, &[json!({ "name": "Ada", "id": 7 })]).await;

        assert_eq!(response.status, 201);
        assert_eq!(
            response.headers,
            Headers::from([("x-request".into(), "7".into())])
        );
        assert_eq!(
            response.body,
            Body::Json(json!({ "greeting": "Hello Ada" }))
        );
    }

    #[tokio::test]
    async fn answers_with_text_no_data_or_a_redirect() {
        let text = json!({ "respondWith": "text", "responseBody": "=Hi {{ $json.name }}" });
        let redirect = json!({ "respondWith": "redirect", "redirectURL": "https://n8n.io" });
        let input = [json!({ "name": "Ada" })];

        let text = respond(text, &input).await;
        let empty = respond(json!({ "respondWith": "noData" }), &input).await;
        let redirect = respond(redirect, &input).await;

        assert_eq!(text.body, Body::Text("Hi Ada".into()));
        assert_eq!(empty.body, Body::Empty);
        assert_eq!(redirect.status, 307);
        assert_eq!(redirect.headers["location"], "https://n8n.io");
    }

    #[test]
    fn rejects_unsupported_answers() {
        for respond_with in ["binary", "jwt"] {
            let parameters = json!({ "respondWith": respond_with });
            let definition = definition("n8n-nodes-base.respondToWebhook", 1.5, parameters);
            assert!(
                RespondToWebhookType.create(&definition).is_err(),
                "{respond_with}"
            );
        }
    }
}
