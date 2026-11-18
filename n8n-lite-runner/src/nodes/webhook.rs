//! The Webhook trigger, `n8n-nodes-base.webhook`, versions 1 to 2.2.
//!
//! Supported: one HTTP method, a path, and the `onReceived`, `lastNode` and
//! `responseNode` response modes. In `lastNode` mode only the default
//! `firstEntryJson` response data is supported. Webhook authentication is
//! rejected, so a protected webhook never runs without its protection.

use serde::Deserialize;
use serde_json::{Map, json};

use super::params::{self, invalid};
use crate::http::HttpMethod;
use crate::item::Item;
use crate::node::{NodeError, NodeInstance, NodeType, TriggerNode};
use crate::webhook::{ResponseMode, WebhookRequest, WebhookSpec};
use crate::workflow::NodeDefinition;

pub struct WebhookType;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    #[serde(default)]
    http_method: HttpMethod,
    #[serde(default)]
    multiple_methods: bool,
    #[serde(default)]
    path: String,
    #[serde(default)]
    authentication: Authentication,
    #[serde(default)]
    response_mode: ResponseMode,
    #[serde(default)]
    response_data: Option<String>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Authentication {
    #[default]
    None,
}

impl NodeType for WebhookType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.webhook"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 1.0, 2.2)?;
        let parameters: Parameters = params::parse(definition)?;
        // `Authentication` lists only `none`, so parsing has already rejected the other methods.
        let Authentication::None = parameters.authentication;
        if parameters.multiple_methods {
            return Err(invalid(
                "multipleMethods",
                "only one HTTP method is supported",
            ));
        }
        let path = parameters.path.trim_matches('/');
        if path.is_empty() {
            return Err(invalid("path", "the path must not be empty"));
        }
        let response_data = parameters.response_data.as_deref();
        if parameters.response_mode == ResponseMode::LastNode
            && response_data.is_some_and(|data| data != "firstEntryJson")
        {
            return Err(invalid(
                "responseData",
                "only `firstEntryJson` is supported",
            ));
        }
        Ok(NodeInstance::Trigger(Box::new(Webhook(WebhookSpec {
            method: parameters.http_method,
            path: path.to_string(),
            response_mode: parameters.response_mode,
        }))))
    }
}

struct Webhook(WebhookSpec);

impl TriggerNode for Webhook {
    fn webhook(&self) -> &WebhookSpec {
        &self.0
    }

    /// Emits one item with the same fields as n8n: `headers`, `params`, `query` and `body`.
    fn emit(&self, request: &WebhookRequest) -> Vec<Item> {
        let fields = Map::from_iter([
            ("headers".to_string(), json!(request.headers)),
            ("params".to_string(), json!(request.params)),
            ("query".to_string(), json!(request.query)),
            ("body".to_string(), request.body.clone()),
        ]);
        vec![Item::new(fields)]
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::*;
    use crate::http::Headers;
    use crate::testing::definition;

    fn create(parameters: Value) -> Result<Box<dyn TriggerNode>, NodeError> {
        match WebhookType.create(&definition("n8n-nodes-base.webhook", 2.0, parameters))? {
            NodeInstance::Trigger(node) => Ok(node),
            NodeInstance::Action(_) => panic!("expected a trigger"),
        }
    }

    #[test]
    fn reads_the_endpoint_with_n8n_defaults() {
        let node = create(json!({ "path": "/orders/" })).unwrap();
        assert_eq!(
            node.webhook(),
            &WebhookSpec {
                method: HttpMethod::Get,
                path: "orders".into(),
                response_mode: ResponseMode::OnReceived,
            }
        );

        let node = create(json!({
            "httpMethod": "POST", "path": "orders/:id", "responseMode": "responseNode", "options": {}
        }))
        .unwrap();
        assert_eq!(node.webhook().method, HttpMethod::Post);
        assert_eq!(node.webhook().path, "orders/:id");
        assert_eq!(node.webhook().response_mode, ResponseMode::ResponseNode);
    }

    #[test]
    fn rejects_unsupported_settings() {
        let cases = [
            json!({ "path": "" }),
            json!({ "path": "a", "responseMode": "streaming" }),
            json!({ "path": "a", "multipleMethods": true, "httpMethod": ["GET", "POST"] }),
            json!({ "path": "a", "responseMode": "lastNode", "responseData": "allEntries" }),
            json!({ "path": "a", "authentication": "basicAuth" }),
        ];
        for parameters in cases {
            assert!(create(parameters.clone()).is_err(), "{parameters}");
        }
    }

    #[test]
    fn emits_the_request_as_one_item() {
        let node = create(json!({ "path": "a" })).unwrap();
        let request = WebhookRequest {
            method: HttpMethod::Post,
            path: "a/7".into(),
            headers: Headers::from([("content-type".into(), "application/json".into())]),
            params: [("id".to_string(), "7".to_string())].into(),
            query: [("q".to_string(), "x".to_string())].into(),
            body: json!({ "name": "Ada" }),
        };

        let items = node.emit(&request);

        assert_eq!(items.len(), 1);
        assert_eq!(
            Value::Object(items[0].json.clone()),
            json!({
                "headers": { "content-type": "application/json" },
                "params": { "id": "7" },
                "query": { "q": "x" },
                "body": { "name": "Ada" },
            })
        );
    }
}
