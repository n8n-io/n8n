//! The calls that a node makes into the engine during an execution.

use serde_json::Value;

use crate::http::{HttpClient, HttpResponse};
use crate::item::Item;

/// The engine creates one context per execution and passes it to every node it runs.
pub trait ExecutionContext: Send + Sync {
    fn execution_id(&self) -> &str;

    /// Resolves the n8n expressions in a parameter value against one input item.
    ///
    /// A value without expressions is returned unchanged. A string that starts
    /// with `=` is an expression, for example `={{ $json.body.name }}`.
    /// `item_index` is the position of `item` in the node input. The engine uses
    /// it to resolve references to earlier nodes, such as `$('Webhook').item.json`.
    fn evaluate(
        &self,
        value: &Value,
        item: &Item,
        item_index: usize,
    ) -> Result<Value, ExpressionError>;

    fn http_client(&self) -> &dyn HttpClient;

    /// Sends the answer for the webhook call that started this execution.
    ///
    /// The engine accepts one answer per execution, and only when the trigger
    /// uses `ResponseMode::ResponseNode`.
    fn respond(&self, response: HttpResponse) -> Result<(), RespondError>;
}

#[derive(Debug, thiserror::Error)]
#[error("cannot evaluate expression `{expression}`: {message}")]
pub struct ExpressionError {
    pub expression: String,
    pub message: String,
}

#[derive(Debug, PartialEq, Eq, thiserror::Error)]
pub enum RespondError {
    #[error("this execution has already sent its webhook response")]
    AlreadySent,
    #[error("the webhook trigger does not use the `responseNode` response mode")]
    NotExpected,
}
