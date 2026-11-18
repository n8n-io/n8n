//! The Set node, `n8n-nodes-base.set`, shown as "Edit Fields". Versions 3.3 to 3.5.
//!
//! Supported: manual mapping with typed assignments, the `includeOtherFields`
//! switch with its `all`, `selected` and `except` modes, and the `dotNotation`
//! and `ignoreConversionErrors` options. The JSON mode is rejected when the
//! workflow loads.

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Map, Value};

use super::params::{self, set_field};
use crate::context::ExecutionContext;
use crate::convert::{self, FieldType};
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, NodeType};
use crate::workflow::NodeDefinition;

pub struct SetType;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    #[serde(default)]
    mode: Mode,
    #[serde(default)]
    assignments: Assignments,
    #[serde(default)]
    include_other_fields: bool,
    #[serde(default)]
    include: Include,
    #[serde(default)]
    include_fields: String,
    #[serde(default)]
    exclude_fields: String,
    #[serde(default)]
    options: Options,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Mode {
    #[default]
    Manual,
}

#[derive(Default, Deserialize)]
struct Assignments {
    #[serde(default)]
    assignments: Vec<Assignment>,
}

#[derive(Deserialize)]
struct Assignment {
    name: String,
    #[serde(default, rename = "type")]
    field_type: FieldType,
    #[serde(default)]
    value: Value,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Include {
    #[default]
    All,
    Selected,
    Except,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Options {
    #[serde(default = "enabled")]
    dot_notation: bool,
    #[serde(default)]
    ignore_conversion_errors: bool,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            dot_notation: true,
            ignore_conversion_errors: false,
        }
    }
}

fn enabled() -> bool {
    true
}

impl NodeType for SetType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.set"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 3.3, 3.5)?;
        let parameters: Parameters = params::parse(definition)?;
        // `Mode` lists only the manual mode, so parsing has already rejected the JSON mode.
        let Mode::Manual = parameters.mode;
        let kept = match (parameters.include_other_fields, parameters.include) {
            (false, _) => Kept::None,
            (true, Include::All) => Kept::All,
            (true, Include::Selected) => Kept::Only(field_list(&parameters.include_fields)),
            (true, Include::Except) => Kept::AllExcept(field_list(&parameters.exclude_fields)),
        };
        Ok(NodeInstance::Action(Box::new(Set {
            assignments: parameters.assignments.assignments,
            kept,
            dot_notation: parameters.options.dot_notation,
            ignore_conversion_errors: parameters.options.ignore_conversion_errors,
        })))
    }
}

/// Splits a comma-separated list of field names.
fn field_list(names: &str) -> Vec<String> {
    names
        .split(',')
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(String::from)
        .collect()
}

/// The input fields that the output item keeps, before the assignments are applied.
enum Kept {
    None,
    All,
    Only(Vec<String>),
    AllExcept(Vec<String>),
}

impl Kept {
    fn select(&self, json: &Map<String, Value>) -> Map<String, Value> {
        let keep = |name: &String| match self {
            Kept::None => false,
            Kept::All => true,
            Kept::Only(names) => names.contains(name),
            Kept::AllExcept(names) => !names.contains(name),
        };
        json.iter()
            .filter(|(name, _)| keep(name))
            .map(|(name, value)| (name.clone(), value.clone()))
            .collect()
    }
}

struct Set {
    assignments: Vec<Assignment>,
    kept: Kept,
    dot_notation: bool,
    ignore_conversion_errors: bool,
}

impl Set {
    /// Builds one output item. Every expression reads the input item, not the partly built output.
    fn transform(
        &self,
        context: &dyn ExecutionContext,
        item: &Item,
        index: usize,
    ) -> Result<Item, NodeError> {
        let mut json = self.kept.select(&item.json);
        for assignment in &self.assignments {
            let value = context.evaluate(&assignment.value, item, index)?;
            let value = self.convert(assignment, value, index)?;
            set_field(&mut json, &assignment.name, value, self.dot_notation);
        }
        Ok(Item::new(json))
    }

    /// With `ignoreConversionErrors`, a value that does not convert is kept as it is.
    fn convert(
        &self,
        assignment: &Assignment,
        value: Value,
        index: usize,
    ) -> Result<Value, NodeError> {
        match convert::convert(&value, assignment.field_type, false) {
            Ok(converted) => Ok(converted),
            Err(_) if self.ignore_conversion_errors => Ok(value),
            Err(error) => Err(NodeError::Failed(format!(
                "field `{}`, item {index}: {error}",
                assignment.name
            ))),
        }
    }
}

#[async_trait]
impl ActionNode for Set {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let output = input
            .iter()
            .enumerate()
            .map(|(index, item)| self.transform(context, item, index))
            .collect::<Result<_, _>>()?;
        Ok(vec![output])
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::testing::{TestContext, action, definition, items, output_json};

    fn assignment(name: &str, field_type: &str, value: Value) -> Value {
        json!({ "id": name, "name": name, "type": field_type, "value": value })
    }

    fn parameters(assignments: Vec<Value>) -> Value {
        json!({ "assignments": { "assignments": assignments }, "options": {} })
    }

    async fn run(parameters: Value, input: &[Value]) -> Result<Vec<Value>, NodeError> {
        let node = action(SetType.create(&definition("n8n-nodes-base.set", 3.4, parameters))?);
        let output = node.execute(&TestContext::default(), items(input)).await?;
        Ok(output_json(&output).remove(0))
    }

    #[tokio::test]
    async fn assigns_typed_fields_and_drops_other_fields() {
        let parameters = parameters(vec![
            assignment("greeting", "string", json!("=Hello {{ $json.name }}")),
            assignment("age", "number", json!("={{ $json.age }}")),
            assignment("adult", "boolean", json!("true")),
            assignment("tags", "array", json!("[\"a\"]")),
        ]);

        let output = run(parameters, &[json!({ "name": "Ada", "age": "36" })])
            .await
            .unwrap();

        assert_eq!(
            output,
            [json!({ "greeting": "Hello Ada", "age": 36, "adult": true, "tags": ["a"] })]
        );
    }

    #[tokio::test]
    async fn keeps_input_fields_when_asked() {
        let input = [json!({ "a": 1, "b": 2, "c": 3 })];
        let with = |include: Value| {
            let mut parameters = parameters(vec![assignment("d", "number", json!(4))]);
            parameters["includeOtherFields"] = json!(true);
            if let Value::Object(extra) = include {
                parameters.as_object_mut().unwrap().extend(extra);
            }
            parameters
        };

        let all = run(with(json!({})), &input).await.unwrap();
        let selected = run(
            with(json!({ "include": "selected", "includeFields": "a, c" })),
            &input,
        )
        .await
        .unwrap();
        let except = run(
            with(json!({ "include": "except", "excludeFields": "a" })),
            &input,
        )
        .await
        .unwrap();

        assert_eq!(all, [json!({ "a": 1, "b": 2, "c": 3, "d": 4 })]);
        assert_eq!(selected, [json!({ "a": 1, "c": 3, "d": 4 })]);
        assert_eq!(except, [json!({ "b": 2, "c": 3, "d": 4 })]);
    }

    #[tokio::test]
    async fn uses_dot_notation_unless_disabled() {
        let assignments = vec![assignment("user.name", "string", json!("Ada"))];
        let mut flat = parameters(assignments.clone());
        flat["options"] = json!({ "dotNotation": false });

        let nested = run(parameters(assignments), &[json!({})]).await.unwrap();
        let flat = run(flat, &[json!({})]).await.unwrap();

        assert_eq!(nested, [json!({ "user": { "name": "Ada" } })]);
        assert_eq!(flat, [json!({ "user.name": "Ada" })]);
    }

    #[tokio::test]
    async fn fails_on_conversion_errors_unless_ignored() {
        let assignments = vec![assignment("n", "number", json!("abc"))];
        let mut ignoring = parameters(assignments.clone());
        ignoring["options"] = json!({ "ignoreConversionErrors": true });

        let error = run(parameters(assignments), &[json!({})])
            .await
            .unwrap_err();
        let kept = run(ignoring, &[json!({})]).await.unwrap();

        assert!(error.to_string().contains("field `n`"), "{error}");
        assert_eq!(kept, [json!({ "n": "abc" })]);
    }

    #[test]
    fn rejects_the_json_mode() {
        let raw = json!({ "mode": "raw", "jsonOutput": "{}" });
        assert!(
            SetType
                .create(&definition("n8n-nodes-base.set", 3.4, raw))
                .is_err()
        );
    }
}
