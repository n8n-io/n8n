//! The node types compiled into the binary.

mod filter;
mod http_request;
mod if_node;
mod params;
mod respond_to_webhook;
mod set;
mod webhook;

use crate::registry::NodeRegistry;

/// Returns a registry with every supported node type.
pub fn registry() -> NodeRegistry {
    NodeRegistry::new(vec![
        Box::new(webhook::WebhookType),
        Box::new(if_node::IfType),
        Box::new(set::SetType),
        Box::new(respond_to_webhook::RespondToWebhookType),
        Box::new(http_request::HttpRequestType),
    ])
}
