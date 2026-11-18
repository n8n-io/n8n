//! Maps n8n type names to the node types compiled into the binary.

use std::collections::HashMap;

use crate::node::{NodeError, NodeInstance, NodeType};
use crate::workflow::NodeDefinition;

pub struct NodeRegistry {
    types: HashMap<&'static str, Box<dyn NodeType>>,
}

#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("node `{node}` has the unsupported type `{node_type}`")]
    UnknownType { node: String, node_type: String },
    #[error("node `{node}`: {source}")]
    InvalidNode { node: String, source: NodeError },
}

impl NodeRegistry {
    pub fn new(types: Vec<Box<dyn NodeType>>) -> Self {
        let types = types
            .into_iter()
            .map(|node_type| (node_type.name(), node_type))
            .collect();
        Self { types }
    }

    pub fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, RegistryError> {
        let node_type = self
            .types
            .get(definition.node_type.as_str())
            .ok_or_else(|| RegistryError::UnknownType {
                node: definition.name.clone(),
                node_type: definition.node_type.clone(),
            })?;

        node_type
            .create(definition)
            .map_err(|source| RegistryError::InvalidNode {
                node: definition.name.clone(),
                source,
            })
    }
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use serde_json::Map;

    use super::*;
    use crate::context::ExecutionContext;
    use crate::item::Item;
    use crate::node::{ActionNode, NodeOutput};

    struct NoOp;

    #[async_trait]
    impl ActionNode for NoOp {
        async fn execute(
            &self,
            _: &dyn ExecutionContext,
            input: Vec<Item>,
        ) -> Result<NodeOutput, NodeError> {
            Ok(vec![input])
        }
    }

    /// Accepts only `typeVersion` 1.
    struct NoOpType;

    impl NodeType for NoOpType {
        fn name(&self) -> &'static str {
            "n8n-nodes-base.noOp"
        }

        fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
            match definition.type_version {
                1.0 => Ok(NodeInstance::Action(Box::new(NoOp))),
                other => Err(NodeError::UnsupportedVersion(other)),
            }
        }
    }

    fn definition(node_type: &str, type_version: f64) -> NodeDefinition {
        NodeDefinition {
            id: "1".into(),
            name: "Node".into(),
            node_type: node_type.into(),
            type_version,
            parameters: Map::new(),
            disabled: false,
        }
    }

    fn registry() -> NodeRegistry {
        NodeRegistry::new(vec![Box::new(NoOpType)])
    }

    #[test]
    fn creates_a_registered_type() {
        let instance = registry().create(&definition("n8n-nodes-base.noOp", 1.0));
        assert!(matches!(instance, Ok(NodeInstance::Action(_))));
    }

    #[test]
    fn rejects_an_unknown_type() {
        let error = registry()
            .create(&definition("n8n-nodes-base.merge", 1.0))
            .err()
            .unwrap();
        assert!(matches!(error, RegistryError::UnknownType { .. }));
    }

    #[test]
    fn reports_the_node_name_for_invalid_nodes() {
        let error = registry()
            .create(&definition("n8n-nodes-base.noOp", 2.0))
            .err()
            .unwrap();
        assert_eq!(error.to_string(), "node `Node`: unsupported type version 2");
    }
}
