//! The traits that each supported node type implements.
//!
//! A node goes through two stages:
//! 1. When the workflow loads, a `NodeType` reads the node parameters and builds a `NodeInstance`.
//!    Invalid parameters fail here, before the runner accepts any webhook call.
//! 2. During an execution, the engine runs the instance once with all of its input items.

use async_trait::async_trait;

use crate::context::{ExecutionContext, ExpressionError, RespondError};
use crate::http::HttpError;
use crate::item::Item;
use crate::webhook::{WebhookRequest, WebhookSpec};
use crate::workflow::NodeDefinition;

/// The items that a node emits, one list per output index.
///
/// Most nodes return one list. The If node returns two: index 0 for true, index 1 for false.
pub type NodeOutput = Vec<Vec<Item>>;

/// A node type compiled into the binary.
pub trait NodeType: Send + Sync {
    /// The n8n type name, for example `n8n-nodes-base.set`.
    fn name(&self) -> &'static str;

    /// Reads the parameters of one workflow node and builds the instance that runs it.
    ///
    /// Returns `NodeError::UnsupportedVersion` for a `typeVersion` that the implementation does not handle.
    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError>;
}

pub enum NodeInstance {
    Trigger(Box<dyn TriggerNode>),
    Action(Box<dyn ActionNode>),
}

/// A node that starts executions. The webhook is the only trigger that the runner supports.
pub trait TriggerNode: Send + Sync {
    /// The endpoint that the engine registers on its HTTP server.
    fn webhook(&self) -> &WebhookSpec;

    /// Converts one webhook call into the items that the trigger emits on output 0.
    fn emit(&self, request: &WebhookRequest) -> Vec<Item>;
}

/// A node that transforms its input items.
#[async_trait]
pub trait ActionNode: Send + Sync {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError>;
}

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    #[error("unsupported type version {0}")]
    UnsupportedVersion(f64),
    #[error("invalid parameter `{name}`: {message}")]
    InvalidParameter { name: String, message: String },
    #[error(transparent)]
    Expression(#[from] ExpressionError),
    #[error(transparent)]
    Http(#[from] HttpError),
    #[error(transparent)]
    Respond(#[from] RespondError),
    /// Any other failure while the node runs.
    #[error("{0}")]
    Failed(String),
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::*;
    use crate::http::{Body, Headers, HttpResponse};
    use crate::testing::{TestContext, item};

    /// Answers the webhook call with its first input item and passes all items through.
    struct EchoNode;

    #[async_trait]
    impl ActionNode for EchoNode {
        async fn execute(
            &self,
            context: &dyn ExecutionContext,
            input: Vec<Item>,
        ) -> Result<NodeOutput, NodeError> {
            let first = input.first().cloned().unwrap_or_default();
            context.respond(HttpResponse {
                status: 200,
                headers: Headers::new(),
                body: Body::Json(Value::Object(first.json)),
            })?;
            Ok(vec![input])
        }
    }

    #[tokio::test]
    async fn action_node_calls_back_into_the_context() {
        let context = TestContext::default();
        let node: Box<dyn ActionNode> = Box::new(EchoNode);

        let output = node
            .execute(&context, vec![item(json!({ "name": "Ada" }))])
            .await
            .unwrap();

        assert_eq!(output, vec![vec![item(json!({ "name": "Ada" }))]]);
        assert_eq!(
            context.response().map(|response| response.body),
            Some(Body::Json(json!({ "name": "Ada" })))
        );
    }

    #[tokio::test]
    async fn second_response_fails() {
        let context = TestContext::default();
        let input = vec![Item::default()];

        EchoNode.execute(&context, input.clone()).await.unwrap();
        let error = EchoNode.execute(&context, input).await.unwrap_err();

        assert!(matches!(
            error,
            NodeError::Respond(RespondError::AlreadySent)
        ));
    }
}
