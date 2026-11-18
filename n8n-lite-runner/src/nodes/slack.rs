//! The Slack node, `n8n-nodes-base.slack`, versions 2 to 2.7.
//!
//! Supported: the "Send" operation of the "Message" resource, to a channel
//! given by ID, with a simple text message. The options `mrkdwn`,
//! `unfurl_links`, `unfurl_media` and `link_names` are passed to Slack.
//!
//! The bot token comes from the runner's credentials, not from the n8n
//! credential that the node refers to. n8n appends a link to the workflow to
//! each message; the runner does not, because it does not know the workflow URL.

use async_trait::async_trait;
use serde::Deserialize;
use serde::de::IgnoredAny;
use serde_json::{Map, Value, json};

use super::params::{self, invalid};
use crate::context::ExecutionContext;
use crate::convert::to_text;
use crate::http::{Body, Headers, HttpMethod, HttpRequest, HttpResponse};
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, NodeType};
use crate::workflow::NodeDefinition;

const POST_MESSAGE_URL: &str = "https://slack.com/api/chat.postMessage";

pub struct SlackType {
    token: Option<String>,
}

impl SlackType {
    pub fn new(token: Option<String>) -> Self {
        Self { token }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    #[serde(default)]
    resource: Resource,
    #[serde(default)]
    operation: Operation,
    select: Select,
    channel_id: ChannelLocator,
    #[serde(default)]
    message_type: MessageType,
    #[serde(default)]
    text: Value,
    #[serde(default)]
    other_options: OtherOptions,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Resource {
    #[default]
    Message,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Operation {
    #[default]
    Post,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum Select {
    Channel,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum MessageType {
    #[default]
    Text,
}

/// The `channelId` resource locator. The "From list" and "By ID" modes both store the channel ID.
#[derive(Deserialize)]
struct ChannelLocator {
    #[serde(default)]
    mode: ChannelMode,
    #[serde(default)]
    value: Value,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ChannelMode {
    #[default]
    List,
    Id,
}

/// The options that the runner supports. Any other option, such as a thread
/// or an ephemeral message, fails when the workflow loads.
#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct OtherOptions {
    /// Accepted and ignored, see the module documentation.
    #[serde(default, rename = "includeLinkToWorkflow")]
    _include_link_to_workflow: Option<IgnoredAny>,
    #[serde(default)]
    mrkdwn: Option<bool>,
    #[serde(default)]
    unfurl_links: Option<bool>,
    #[serde(default)]
    unfurl_media: Option<bool>,
    #[serde(default)]
    link_names: Option<bool>,
}

impl OtherOptions {
    /// The options that are set, as fields of the request body.
    fn fields(&self) -> Map<String, Value> {
        [
            ("mrkdwn", self.mrkdwn),
            ("unfurl_links", self.unfurl_links),
            ("unfurl_media", self.unfurl_media),
            ("link_names", self.link_names),
        ]
        .into_iter()
        .filter_map(|(name, value)| value.map(|value| (name.to_string(), Value::Bool(value))))
        .collect()
    }
}

impl NodeType for SlackType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.slack"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 2.0, 2.7)?;
        let parameters: Parameters = params::parse(definition)?;
        // The enums list only the supported values, so parsing has already rejected the others.
        let (
            Resource::Message,
            Operation::Post,
            Select::Channel,
            MessageType::Text,
            ChannelMode::List | ChannelMode::Id,
        ) = (
            &parameters.resource,
            &parameters.operation,
            &parameters.select,
            &parameters.message_type,
            &parameters.channel_id.mode,
        );
        let token = self
            .token
            .clone()
            .ok_or_else(|| invalid("credentials", "set LITE_SLACK_TOKEN to the Slack bot token"))?;
        Ok(NodeInstance::Action(Box::new(Slack {
            token,
            channel: parameters.channel_id.value,
            text: parameters.text,
            options: parameters.other_options.fields(),
        })))
    }
}

struct Slack {
    token: String,
    channel: Value,
    text: Value,
    options: Map<String, Value>,
}

impl Slack {
    fn request(
        &self,
        context: &dyn ExecutionContext,
        item: &Item,
        index: usize,
    ) -> Result<HttpRequest, NodeError> {
        let channel = to_text(&context.evaluate(&self.channel, item, index)?);
        if channel.trim().is_empty() {
            return Err(invalid("channelId", "the channel ID is empty"));
        }
        let text = to_text(&context.evaluate(&self.text, item, index)?);
        let mut body = Map::from_iter([
            ("channel".to_string(), Value::String(channel)),
            ("text".to_string(), Value::String(text)),
        ]);
        body.extend(self.options.clone());
        Ok(HttpRequest {
            method: HttpMethod::Post,
            url: POST_MESSAGE_URL.to_string(),
            query: Vec::new(),
            headers: Headers::from([(
                "authorization".to_string(),
                format!("Bearer {}", self.token),
            )]),
            body: Body::Json(Value::Object(body)),
        })
    }
}

/// Converts a `chat.postMessage` response to an output item, as n8n does.
fn message_item(response: HttpResponse) -> Result<Item, NodeError> {
    let Body::Json(Value::Object(mut fields)) = response.body else {
        return Err(NodeError::Failed(format!(
            "Slack answered status {} without a JSON object",
            response.status
        )));
    };
    if fields.get("ok") == Some(&Value::Bool(false)) {
        return Err(NodeError::Failed(slack_error(&fields)));
    }
    if let Some(timestamp) = fields.remove("ts") {
        fields.insert("message_timestamp".to_string(), timestamp);
    }
    Ok(Item::new(fields))
}

/// The messages that n8n's `throwOnSlackApiError` uses for the errors a message post can return.
fn slack_error(fields: &Map<String, Value>) -> String {
    let error = fields.get("error").cloned().unwrap_or(Value::Null);
    match error.as_str() {
        Some("missing_scope") => format!(
            "Your Slack credential is missing required Oauth Scopes. Add the following scope(s) to your Slack App: {}",
            to_text(fields.get("needed").unwrap_or(&Value::Null))
        ),
        _ => format!("Slack error response: {}", json!(error)),
    }
}

#[async_trait]
impl ActionNode for Slack {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let mut output = Vec::new();
        for (index, item) in input.iter().enumerate() {
            let request = self.request(context, item, index)?;
            let response = context.http_client().send(request).await?;
            output.push(message_item(response)?);
        }
        Ok(vec![output])
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::testing::{
        MockHttp, TestContext, action, definition, items, json_response, output_json,
    };

    const TOKEN: &str = "xoxb-test";

    /// Parameters in the shape that n8n 2.3 stores for "Send a message" to a channel by ID.
    fn parameters(channel: &str, text: &str) -> Value {
        json!({
            "select": "channel",
            "channelId": { "__rl": true, "value": channel, "mode": "id" },
            "text": text,
            "otherOptions": {}
        })
    }

    fn node(parameters: Value) -> Result<Box<dyn ActionNode>, NodeError> {
        let definition = definition("n8n-nodes-base.slack", 2.3, parameters);
        SlackType::new(Some(TOKEN.into()))
            .create(&definition)
            .map(action)
    }

    fn posted(channel: &str, text: &str) -> HttpResponse {
        json_response(
            200,
            json!({
                "ok": true, "channel": channel, "ts": "1795000000.000100",
                "message": { "type": "message", "text": text }
            }),
        )
    }

    #[tokio::test]
    async fn posts_a_text_message_to_a_channel() {
        let context = TestContext::with_http(MockHttp::replying(|_| posted("C123", "Hello")));

        let output = node(parameters("C123", "Hello"))
            .unwrap()
            .execute(&context, items(&[json!({})]))
            .await
            .unwrap();

        assert_eq!(
            context.requests(),
            [HttpRequest {
                method: HttpMethod::Post,
                url: "https://slack.com/api/chat.postMessage".into(),
                query: vec![],
                headers: Headers::from([("authorization".into(), "Bearer xoxb-test".into())]),
                body: Body::Json(json!({ "channel": "C123", "text": "Hello" })),
            }]
        );
        assert_eq!(
            output_json(&output),
            [vec![json!({
                "ok": true, "channel": "C123", "message_timestamp": "1795000000.000100",
                "message": { "type": "message", "text": "Hello" }
            })]]
        );
    }

    #[tokio::test]
    async fn evaluates_the_channel_and_text_for_each_item() {
        let context = TestContext::with_http(MockHttp::replying(|_| posted("C1", "x")));
        let mut parameters = parameters("={{ $json.channel }}", "=New lead: {{ $json.email }}");
        parameters["otherOptions"] = json!({ "mrkdwn": false, "includeLinkToWorkflow": true });

        node(parameters)
            .unwrap()
            .execute(
                &context,
                items(&[
                    json!({ "channel": "C1", "email": "ada@example.com" }),
                    json!({ "channel": "C2", "email": "bob@example.com" }),
                ]),
            )
            .await
            .unwrap();

        let bodies: Vec<Body> = context.requests().into_iter().map(|r| r.body).collect();
        assert_eq!(
            bodies,
            [
                Body::Json(
                    json!({ "channel": "C1", "text": "New lead: ada@example.com", "mrkdwn": false })
                ),
                Body::Json(
                    json!({ "channel": "C2", "text": "New lead: bob@example.com", "mrkdwn": false })
                ),
            ]
        );
    }

    #[tokio::test]
    async fn fails_with_the_slack_error() {
        let failures = [
            (
                json!({ "ok": false, "error": "channel_not_found" }),
                "Slack error response: \"channel_not_found\"",
            ),
            (
                json!({ "ok": false, "error": "missing_scope", "needed": "chat:write" }),
                "Your Slack credential is missing required Oauth Scopes. Add the following scope(s) to your Slack App: chat:write",
            ),
        ];
        for (body, expected) in failures {
            let context = TestContext::with_http(MockHttp::replying(move |_| {
                json_response(200, body.clone())
            }));

            let error = node(parameters("C123", "Hello"))
                .unwrap()
                .execute(&context, items(&[json!({})]))
                .await
                .unwrap_err();

            assert_eq!(error.to_string(), expected);
        }
    }

    #[tokio::test]
    async fn fails_on_an_empty_channel_id() {
        let context = TestContext::default();

        let error = node(parameters("={{ $json.missing }}", "Hello"))
            .unwrap()
            .execute(&context, items(&[json!({})]))
            .await
            .unwrap_err();

        assert!(error.to_string().contains("channel ID is empty"), "{error}");
        assert!(context.requests().is_empty());
    }

    #[test]
    fn requires_a_token() {
        let definition = definition("n8n-nodes-base.slack", 2.3, parameters("C123", "Hello"));
        let error = SlackType::new(None).create(&definition).err().unwrap();
        assert!(error.to_string().contains("LITE_SLACK_TOKEN"), "{error}");
    }

    #[test]
    fn rejects_unsupported_settings() {
        let base = parameters("C123", "Hello");
        let with = |field: &str, value: Value| {
            let mut parameters = base.clone();
            parameters[field] = value;
            parameters
        };
        let cases = [
            with("operation", json!("update")),
            with("resource", json!("channel")),
            with("select", json!("user")),
            with("messageType", json!("block")),
            with(
                "channelId",
                json!({ "__rl": true, "value": "https://x.slack.com/archives/C1", "mode": "url" }),
            ),
            with(
                "otherOptions",
                json!({ "thread_ts": { "replyValues": {} } }),
            ),
            with("otherOptions", json!({ "ephemeral": {} })),
        ];
        for parameters in cases {
            assert!(node(parameters.clone()).is_err(), "{parameters}");
        }
        let version_1 = definition("n8n-nodes-base.slack", 1.0, base.clone());
        assert!(
            SlackType::new(Some(TOKEN.into()))
                .create(&version_1)
                .is_err()
        );
    }
}
