//! The subset of the n8n workflow JSON that the runner reads.
//!
//! Serde ignores every field that these types do not declare, so a full
//! workflow exported from n8n deserializes without changes.

use std::collections::HashMap;

use serde::Deserialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Deserialize)]
pub struct Workflow {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: String,
    pub nodes: Vec<NodeDefinition>,
    /// Outgoing connections, keyed by the name of the source node.
    #[serde(default)]
    pub connections: HashMap<String, NodeConnections>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDefinition {
    pub id: String,
    pub name: String,
    /// The n8n type name, for example `n8n-nodes-base.set`.
    #[serde(rename = "type")]
    pub node_type: String,
    pub type_version: f64,
    #[serde(default)]
    pub parameters: Map<String, Value>,
    #[serde(default)]
    pub disabled: bool,
}

/// The outgoing connections of one node.
///
/// n8n keys these by connection type. The runner reads only `main` and
/// ignores the AI connection types.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct NodeConnections {
    /// One slot per output index. n8n stores `null` for an output with no connections.
    #[serde(default)]
    pub main: Vec<Option<Vec<Connection>>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Connection {
    /// The name of the destination node.
    pub node: String,
    /// The input index on the destination node.
    #[serde(default)]
    pub index: usize,
}

impl Workflow {
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    pub fn node(&self, name: &str) -> Option<&NodeDefinition> {
        self.nodes.iter().find(|node| node.name == name)
    }

    /// Returns the connections that leave `output` of the node named `source`.
    pub fn targets(&self, source: &str, output: usize) -> &[Connection] {
        self.connections
            .get(source)
            .and_then(|connections| connections.main.get(output))
            .and_then(|slot| slot.as_deref())
            .unwrap_or_default()
    }

    /// Returns the connections that leave any output of the node named `source`.
    pub fn successors(&self, source: &str) -> impl Iterator<Item = &Connection> {
        self.connections
            .get(source)
            .into_iter()
            .flat_map(|connections| connections.main.iter().flatten().flatten())
    }

    /// Returns every connection in the workflow, paired with the name of its source node.
    pub fn edges(&self) -> impl Iterator<Item = (&str, &Connection)> {
        self.connections
            .keys()
            .flat_map(|source| self.successors(source).map(move |c| (source.as_str(), c)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A workflow in the shape that n8n master exports, including fields the runner ignores.
    const WORKFLOW: &str = r#"{
        "id": "wf-1",
        "name": "Greeting",
        "active": true,
        "settings": { "executionOrder": "v1" },
        "nodes": [
            {
                "id": "a1", "name": "Webhook", "type": "n8n-nodes-base.webhook",
                "typeVersion": 2.1, "position": [0, 0], "webhookId": "abc",
                "parameters": { "httpMethod": "POST", "path": "greet", "responseMode": "responseNode" }
            },
            {
                "id": "a2", "name": "If", "type": "n8n-nodes-base.if",
                "typeVersion": 2.2, "position": [200, 0], "parameters": {}
            },
            {
                "id": "a3", "name": "Respond", "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.4, "position": [400, 0], "disabled": true
            }
        ],
        "connections": {
            "Webhook": { "main": [[{ "node": "If", "type": "main", "index": 0 }]] },
            "If": {
                "main": [null, [{ "node": "Respond", "type": "main", "index": 0 }]],
                "ai_tool": [[{ "node": "Agent", "type": "ai_tool", "index": 0 }]]
            }
        }
    }"#;

    #[test]
    fn reads_an_n8n_workflow() {
        let workflow = Workflow::from_json(WORKFLOW).unwrap();

        assert_eq!(workflow.id.as_deref(), Some("wf-1"));
        assert_eq!(workflow.nodes.len(), 3);

        let webhook = workflow.node("Webhook").unwrap();
        assert_eq!(webhook.node_type, "n8n-nodes-base.webhook");
        assert_eq!(webhook.type_version, 2.1);
        assert_eq!(webhook.parameters["path"], "greet");

        let respond = workflow.node("Respond").unwrap();
        assert!(respond.disabled);
        assert!(respond.parameters.is_empty());
    }

    #[test]
    fn resolves_targets_per_output() {
        let workflow = Workflow::from_json(WORKFLOW).unwrap();

        assert_eq!(
            workflow.targets("Webhook", 0),
            [Connection {
                node: "If".into(),
                index: 0
            }]
        );
        assert!(workflow.targets("If", 0).is_empty());
        assert_eq!(workflow.targets("If", 1)[0].node, "Respond");
        assert!(workflow.targets("If", 2).is_empty());
        assert!(workflow.targets("Respond", 0).is_empty());
    }
}
