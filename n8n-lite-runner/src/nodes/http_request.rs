//! The HTTP Request node, `n8n-nodes-base.httpRequest`, versions 3 to 4.5.
//!
//! The node sends one request for each input item. Supported settings:
//! 1. Method and URL, without authentication.
//! 2. Query parameters, headers and a JSON body, given as fields or as JSON.
//! 3. The response options `fullResponse`, `neverError`, `responseFormat`
//!    (autodetect, JSON or text) and `outputPropertyName`.
//!
//! Other body content types and credentials are rejected when the workflow
//! loads. Options such as batching, pagination and timeouts are ignored.

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Map, Value, json};

use super::params::{self, NameValue};
use crate::context::ExecutionContext;
use crate::convert::to_text;
use crate::http::{Body, HttpMethod, HttpRequest, HttpResponse};
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, NodeType};
use crate::workflow::NodeDefinition;

pub struct HttpRequestType;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    #[serde(default)]
    method: HttpMethod,
    url: Value,
    #[serde(default)]
    authentication: Authentication,
    #[serde(default)]
    send_query: bool,
    #[serde(default)]
    specify_query: Specify,
    #[serde(default)]
    query_parameters: Pairs,
    #[serde(default)]
    json_query: Value,
    #[serde(default)]
    send_headers: bool,
    #[serde(default)]
    specify_headers: Specify,
    #[serde(default)]
    header_parameters: Pairs,
    #[serde(default)]
    json_headers: Value,
    #[serde(default)]
    send_body: bool,
    #[serde(default)]
    content_type: ContentType,
    #[serde(default)]
    specify_body: Specify,
    #[serde(default)]
    body_parameters: Pairs,
    #[serde(default)]
    json_body: Value,
    #[serde(default)]
    options: Options,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Authentication {
    #[default]
    None,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ContentType {
    #[default]
    Json,
}

/// Whether a group of values comes from name and value fields or from one JSON parameter.
#[derive(Default, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Specify {
    #[default]
    Keypair,
    Json,
}

#[derive(Default, Deserialize)]
struct Pairs {
    #[serde(default)]
    parameters: Vec<NameValue>,
}

#[derive(Default, Deserialize)]
struct Options {
    #[serde(default)]
    response: ResponseGroup,
}

/// n8n stores the response options one level deeper, under `response.response`.
#[derive(Default, Deserialize)]
struct ResponseGroup {
    #[serde(default)]
    response: ResponseOptions,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResponseOptions {
    #[serde(default)]
    full_response: bool,
    #[serde(default)]
    never_error: bool,
    #[serde(default)]
    response_format: ResponseFormat,
    #[serde(default = "data")]
    output_property_name: String,
}

impl Default for ResponseOptions {
    fn default() -> Self {
        Self {
            full_response: false,
            never_error: false,
            response_format: ResponseFormat::default(),
            output_property_name: data(),
        }
    }
}

fn data() -> String {
    "data".to_string()
}

#[derive(Default, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ResponseFormat {
    #[default]
    Autodetect,
    Json,
    Text,
}

/// A response body after the response format is applied.
enum Decoded {
    Json(Value),
    Text(String),
}

impl NodeType for HttpRequestType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.httpRequest"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 3.0, 4.5)?;
        let parameters: Parameters = params::parse(definition)?;
        let (Authentication::None, ContentType::Json) =
            (&parameters.authentication, &parameters.content_type);
        Ok(NodeInstance::Action(Box::new(HttpRequestNode(parameters))))
    }
}

struct HttpRequestNode(Parameters);

impl HttpRequestNode {
    fn request(
        &self,
        context: &dyn ExecutionContext,
        item: &Item,
        index: usize,
    ) -> Result<HttpRequest, NodeError> {
        let parameters = &self.0;
        let group = |send: bool, specify: Specify, pairs: &Pairs, json: &Value, name: &str| match (
            send, specify,
        ) {
            (false, _) => Ok(Map::new()),
            (true, Specify::Keypair) => {
                params::evaluate_pairs(&pairs.parameters, context, item, index)
            }
            (true, Specify::Json) => {
                match params::evaluate_json(name, json, context, item, index)? {
                    Value::Object(fields) => Ok(fields),
                    _ => Err(params::invalid(name, "expected a JSON object")),
                }
            }
        };
        let query = group(
            parameters.send_query,
            parameters.specify_query,
            &parameters.query_parameters,
            &parameters.json_query,
            "jsonQuery",
        )?;
        let headers = group(
            parameters.send_headers,
            parameters.specify_headers,
            &parameters.header_parameters,
            &parameters.json_headers,
            "jsonHeaders",
        )?;
        Ok(HttpRequest {
            method: parameters.method,
            url: to_text(&context.evaluate(&parameters.url, item, index)?),
            query: query
                .iter()
                .map(|(name, value)| (name.clone(), to_text(value)))
                .collect(),
            headers: headers
                .iter()
                .map(|(name, value)| (name.to_lowercase(), to_text(value)))
                .collect(),
            body: self.body(context, item, index)?,
        })
    }

    fn body(
        &self,
        context: &dyn ExecutionContext,
        item: &Item,
        index: usize,
    ) -> Result<Body, NodeError> {
        let parameters = &self.0;
        match (parameters.send_body, parameters.specify_body) {
            (false, _) => Ok(Body::Empty),
            (true, Specify::Keypair) => {
                let fields = params::evaluate_pairs(
                    &parameters.body_parameters.parameters,
                    context,
                    item,
                    index,
                )?;
                Ok(Body::Json(Value::Object(fields)))
            }
            (true, Specify::Json) => {
                params::evaluate_json("jsonBody", &parameters.json_body, context, item, index)
                    .map(Body::Json)
            }
        }
    }

    /// Converts one response into output items, as n8n does.
    fn items(&self, response: HttpResponse) -> Result<Vec<Item>, NodeError> {
        let options = &self.0.options.response.response;
        if !(200..300).contains(&response.status) && !options.never_error {
            return Err(NodeError::Failed(format!(
                "request failed with status code {}",
                response.status
            )));
        }
        let decoded = decode(response.body, options.response_format)?;
        let property = &options.output_property_name;
        if options.full_response {
            let body = match decoded {
                Decoded::Json(value) => ("body", value),
                Decoded::Text(text) => (property.as_str(), Value::String(text)),
            };
            let full = json!({
                body.0: body.1,
                "headers": response.headers,
                "statusCode": response.status,
            });
            return Ok(vec![object_item(full, property)]);
        }
        Ok(match decoded {
            Decoded::Json(Value::Array(values)) => values
                .into_iter()
                .map(|value| object_item(value, property))
                .collect(),
            Decoded::Json(value) => vec![object_item(value, property)],
            Decoded::Text(text) => vec![object_item(json!({ property: text }), property)],
        })
    }
}

fn decode(body: Body, format: ResponseFormat) -> Result<Decoded, NodeError> {
    match (format, body) {
        (ResponseFormat::Text, Body::Json(value)) => Ok(Decoded::Text(value.to_string())),
        (ResponseFormat::Text, Body::Text(text)) => Ok(Decoded::Text(text)),
        (ResponseFormat::Text, Body::Empty) => Ok(Decoded::Text(String::new())),
        (_, Body::Json(value)) => Ok(Decoded::Json(value)),
        (_, Body::Empty) => Ok(Decoded::Json(json!({}))),
        (ResponseFormat::Autodetect, Body::Text(text)) => Ok(Decoded::Text(text)),
        (ResponseFormat::Json, Body::Text(text)) => {
            serde_json::from_str(&text).map(Decoded::Json).map_err(|_| {
                NodeError::Failed(
                    "response body is not valid JSON. Change \"Response Format\" to \"Text\""
                        .into(),
                )
            })
        }
    }
}

/// Wraps a value that is not an object under `property`, so every item has a JSON object.
fn object_item(value: Value, property: &str) -> Item {
    match value {
        Value::Object(fields) => Item::new(fields),
        other => Item::new(Map::from_iter([(property.to_string(), other)])),
    }
}

#[async_trait]
impl ActionNode for HttpRequestNode {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let mut output = Vec::new();
        for (index, item) in input.iter().enumerate() {
            let request = self.request(context, item, index)?;
            let response = context.http_client().send(request).await?;
            output.extend(self.items(response)?);
        }
        Ok(vec![output])
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::http::Headers;
    use crate::testing::{
        MockHttp, TestContext, action, definition, items, json_response, output_json,
    };

    fn node(parameters: Value) -> Box<dyn ActionNode> {
        let definition = definition("n8n-nodes-base.httpRequest", 4.2, parameters);
        action(HttpRequestType.create(&definition).unwrap())
    }

    fn replying(response: HttpResponse) -> TestContext {
        TestContext::with_http(MockHttp::replying(move |_| response.clone()))
    }

    async fn run(
        parameters: Value,
        context: &TestContext,
        input: &[Value],
    ) -> Result<Vec<Value>, NodeError> {
        let output = node(parameters).execute(context, items(input)).await?;
        Ok(output_json(&output).remove(0))
    }

    #[tokio::test]
    async fn sends_one_request_per_item() {
        // The fields of a stored node, with expressions in the URL, query, headers and body.
        let parameters = json!({
            "method": "POST",
            "url": "=https://api.test/users/{{ $json.id }}",
            "sendQuery": true,
            "queryParameters": { "parameters": [{ "name": "limit", "value": 2 }] },
            "sendHeaders": true,
            "headerParameters": { "parameters": [{ "name": "Authorization", "value": "Bearer 1" }] },
            "sendBody": true,
            "bodyParameters": { "parameters": [{ "name": "name", "value": "={{ $json.name }}" }] },
            "options": {}
        });
        let context = TestContext::default();

        run(
            parameters,
            &context,
            &[
                json!({ "id": 1, "name": "Ada" }),
                json!({ "id": 2, "name": "Bob" }),
            ],
        )
        .await
        .unwrap();

        let requests = context.requests();
        assert_eq!(requests.len(), 2);
        assert_eq!(
            requests[0],
            HttpRequest {
                method: HttpMethod::Post,
                url: "https://api.test/users/1".into(),
                query: vec![("limit".into(), "2".into())],
                headers: Headers::from([("authorization".into(), "Bearer 1".into())]),
                body: Body::Json(json!({ "name": "Ada" })),
            }
        );
        assert_eq!(requests[1].url, "https://api.test/users/2");
    }

    #[tokio::test]
    async fn sends_a_json_body_and_json_query() {
        let parameters = json!({
            "url": "https://api.test",
            "sendQuery": true, "specifyQuery": "json", "jsonQuery": "{\"a\": \"1\"}",
            "sendBody": true, "specifyBody": "json", "jsonBody": "={ \"id\": {{ $json.id }} }"
        });
        let context = TestContext::default();

        run(parameters, &context, &[json!({ "id": 7 })])
            .await
            .unwrap();

        let request = &context.requests()[0];
        assert_eq!(request.method, HttpMethod::Get);
        assert_eq!(request.query, [("a".to_string(), "1".to_string())]);
        assert_eq!(request.body, Body::Json(json!({ "id": 7 })));
    }

    #[tokio::test]
    async fn splits_a_json_array_into_items() {
        let context = replying(json_response(200, json!([{ "a": 1 }, { "a": 2 }, 3])));

        let output = run(json!({ "url": "https://api.test" }), &context, &[json!({})])
            .await
            .unwrap();

        assert_eq!(
            output,
            [json!({ "a": 1 }), json!({ "a": 2 }), json!({ "data": 3 })]
        );
    }

    #[tokio::test]
    async fn returns_text_and_full_responses() {
        let text = HttpResponse {
            status: 200,
            headers: Headers::from([("content-type".into(), "text/plain".into())]),
            body: Body::Text("hello".into()),
        };
        let full = json!({
            "url": "https://api.test",
            "options": { "response": { "response": { "fullResponse": true } } }
        });

        let plain = run(
            json!({ "url": "https://api.test" }),
            &replying(text.clone()),
            &[json!({})],
        )
        .await
        .unwrap();
        let full = run(full, &replying(text), &[json!({})]).await.unwrap();

        assert_eq!(plain, [json!({ "data": "hello" })]);
        assert_eq!(
            full,
            [
                json!({ "data": "hello", "headers": { "content-type": "text/plain" }, "statusCode": 200 })
            ]
        );
    }

    #[tokio::test]
    async fn fails_on_error_status_unless_never_error() {
        let never_error = json!({
            "url": "https://api.test",
            "options": { "response": { "response": { "neverError": true } } }
        });

        let error = run(
            json!({ "url": "https://api.test" }),
            &replying(json_response(404, json!({}))),
            &[json!({})],
        )
        .await
        .unwrap_err();
        let output = run(
            never_error,
            &replying(json_response(404, json!({ "e": 1 }))),
            &[json!({})],
        )
        .await
        .unwrap();

        assert_eq!(error.to_string(), "request failed with status code 404");
        assert_eq!(output, [json!({ "e": 1 })]);
    }

    #[test]
    fn rejects_credentials_and_other_content_types() {
        let cases = [
            json!({ "url": "x", "authentication": "genericCredentialType" }),
            json!({ "url": "x", "sendBody": true, "contentType": "form-urlencoded" }),
            json!({ "url": "x", "options": { "response": { "response": { "responseFormat": "file" } } } }),
        ];
        for parameters in cases {
            let definition = definition("n8n-nodes-base.httpRequest", 4.2, parameters.clone());
            assert!(HttpRequestType.create(&definition).is_err(), "{parameters}");
        }
    }
}
