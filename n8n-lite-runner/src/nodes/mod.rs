//! The node types compiled into the binary.

mod filter;
mod http_request;
mod if_node;
mod params;
mod respond_to_webhook;
mod set;
mod slack;
mod webhook;

use crate::registry::NodeRegistry;

/// The secrets that nodes need. The binary reads them from its options or the
/// environment, because n8n does not put credentials into the runner config.
#[derive(Clone, Default)]
pub struct Credentials {
    /// The Slack bot token, which starts with `xoxb-`.
    pub slack_token: Option<String>,
}

/// Returns a registry with every supported node type.
pub fn registry(credentials: &Credentials) -> NodeRegistry {
    NodeRegistry::new(vec![
        Box::new(webhook::WebhookType),
        Box::new(if_node::IfType),
        Box::new(set::SetType),
        Box::new(respond_to_webhook::RespondToWebhookType),
        Box::new(http_request::HttpRequestType),
        Box::new(slack::SlackType::new(credentials.slack_token.clone())),
    ])
}
