//! Helpers that read node parameters from a workflow definition.
//!
//! Each node declares its parameters as a serde struct with the n8n defaults.
//! An enum that lists only the supported values rejects every other value when
//! the workflow loads.

use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Map, Value};

use crate::context::ExecutionContext;
use crate::item::Item;
use crate::node::NodeError;
use crate::workflow::NodeDefinition;

/// One entry of an n8n `fixedCollection` of name and value pairs.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct NameValue {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub value: Value,
}

/// Reads the parameters of `definition` into `T`.
pub fn parse<T: DeserializeOwned>(definition: &NodeDefinition) -> Result<T, NodeError> {
    let parameters = Value::Object(definition.parameters.clone());
    serde_path_to_error::deserialize(parameters).map_err(|error| NodeError::InvalidParameter {
        name: error.path().to_string(),
        message: error.into_inner().to_string(),
    })
}

/// Fails unless the `typeVersion` of `definition` is between `min` and `max`, inclusive.
pub fn check_version(definition: &NodeDefinition, min: f64, max: f64) -> Result<(), NodeError> {
    match definition.type_version {
        version if (min..=max).contains(&version) => Ok(()),
        version => Err(NodeError::UnsupportedVersion(version)),
    }
}

pub fn invalid(name: &str, message: impl Into<String>) -> NodeError {
    NodeError::InvalidParameter {
        name: name.to_string(),
        message: message.into(),
    }
}

/// Evaluates name and value pairs into an object. An entry with an empty name is skipped.
pub fn evaluate_pairs(
    pairs: &[NameValue],
    context: &dyn ExecutionContext,
    item: &Item,
    index: usize,
) -> Result<Map<String, Value>, NodeError> {
    pairs
        .iter()
        .filter(|pair| !pair.name.is_empty())
        .map(|pair| {
            let value = context.evaluate(&pair.value, item, index)?;
            Ok((pair.name.clone(), value))
        })
        .collect()
}

/// Evaluates a parameter that holds JSON, either as a value or as JSON text.
pub fn evaluate_json(
    name: &str,
    value: &Value,
    context: &dyn ExecutionContext,
    item: &Item,
    index: usize,
) -> Result<Value, NodeError> {
    match context.evaluate(value, item, index)? {
        Value::String(text) => serde_json::from_str(&text)
            .map_err(|error| invalid(name, format!("invalid JSON: {error}"))),
        other => Ok(other),
    }
}

/// Sets `value` at `path` in `json`.
///
/// With `dot_notation`, `a.b` sets field `b` inside object `a` and creates or
/// replaces `a` when it is not an object. Without it, `a.b` is one field name.
pub fn set_field(json: &mut Map<String, Value>, path: &str, value: Value, dot_notation: bool) {
    let Some((head, rest)) = path.split_once('.').filter(|_| dot_notation) else {
        json.insert(path.to_string(), value);
        return;
    };
    let child = json
        .entry(head)
        .and_modify(|child| {
            if !child.is_object() {
                *child = Value::Object(Map::new());
            }
        })
        .or_insert_with(|| Value::Object(Map::new()));
    if let Value::Object(fields) = child {
        set_field(fields, rest, value, true);
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::testing::definition;

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Example {
        #[serde(default)]
        options: ExampleOptions,
    }

    #[derive(Debug, Default, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ExampleOptions {
        #[serde(default)]
        format: Format,
    }

    #[derive(Debug, Default, Deserialize)]
    #[serde(rename_all = "camelCase")]
    enum Format {
        #[default]
        Json,
    }

    #[test]
    fn applies_defaults_for_missing_parameters() {
        let parsed: Example = parse(&definition("x", 1.0, json!({}))).unwrap();
        assert!(matches!(parsed.options.format, Format::Json));
    }

    #[test]
    fn names_the_invalid_parameter() {
        let definition = definition("x", 1.0, json!({ "options": { "format": "file" } }));
        let error = parse::<Example>(&definition).unwrap_err().to_string();
        assert_eq!(
            error,
            "invalid parameter `options.format`: unknown variant `file`, expected `json`"
        );
    }

    #[test]
    fn checks_the_version_range() {
        assert!(check_version(&definition("x", 2.1, json!({})), 2.0, 2.2).is_ok());
        assert!(check_version(&definition("x", 3.0, json!({})), 2.0, 2.2).is_err());
    }

    #[test]
    fn sets_nested_fields_with_dot_notation() {
        let mut json = Map::new();
        set_field(&mut json, "a.b", json!(1), true);
        set_field(&mut json, "a.c", json!(2), true);
        set_field(&mut json, "x.y", json!(3), false);
        assert_eq!(
            Value::Object(json),
            json!({ "a": { "b": 1, "c": 2 }, "x.y": 3 })
        );
    }

    #[test]
    fn replaces_a_scalar_on_the_path() {
        let mut json = json!({ "a": 5 }).as_object().unwrap().clone();
        set_field(&mut json, "a.b", json!(1), true);
        assert_eq!(Value::Object(json), json!({ "a": { "b": 1 } }));
    }
}
