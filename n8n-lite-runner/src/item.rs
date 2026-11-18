use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// One unit of data that a node receives or emits.
///
/// Mirrors `INodeExecutionData` in n8n, without binary data and pairing information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub json: Map<String, Value>,
}

impl Item {
    pub fn new(json: Map<String, Value>) -> Self {
        Self { json }
    }
}
