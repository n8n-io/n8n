//! Types for the webhook trigger: the endpoint it listens on and the calls it receives.

use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

use crate::http::{Headers, HttpMethod};

/// When the server answers a webhook call. Mirrors the Webhook node `responseMode` parameter.
///
/// n8n also supports `streaming`, which the runner does not.
/// The default is `onReceived`, as in the Webhook node.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ResponseMode {
    /// The server answers as soon as the call arrives, before the workflow runs.
    #[default]
    OnReceived,
    /// The server answers with the output of the last node that ran.
    LastNode,
    /// A Respond to Webhook node answers through `ExecutionContext::respond`.
    ResponseNode,
}

/// The endpoint that a trigger node listens on.
#[derive(Debug, Clone, PartialEq)]
pub struct WebhookSpec {
    pub method: HttpMethod,
    /// The path after the webhook prefix, without a leading slash.
    pub path: String,
    pub response_mode: ResponseMode,
}

/// An incoming webhook call, after the server has parsed it.
#[derive(Debug, Clone, PartialEq)]
pub struct WebhookRequest {
    pub method: HttpMethod,
    pub path: String,
    pub headers: Headers,
    /// Values of the path parameters, such as `:id` in `users/:id`.
    pub params: BTreeMap<String, String>,
    pub query: BTreeMap<String, String>,
    /// The parsed JSON body, or `Value::Null` when the call has no body.
    pub body: Value,
}
