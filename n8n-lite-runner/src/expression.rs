//! Evaluates the subset of n8n expressions that the runner supports.
//!
//! A parameter string that starts with `=` is a template. Each `{{ ... }}` block
//! in the template holds one expression. The supported expressions are:
//! 1. `$json` followed by a path, for example `$json.body.name` or `$json["first name"][0]`.
//! 2. `$('Node name').item.json` followed by a path. The item is the one at the
//!    same index as the current item. When the referenced node emitted exactly
//!    one item, that item is used for every index.
//!
//! When a template is exactly one block, the result keeps the JSON type of the
//! value. Otherwise the result is a string. A missing field resolves to `null`,
//! which renders as an empty string inside text. `.length` returns the length
//! of an array or a string.

use std::borrow::Cow;
use std::collections::HashMap;

use serde_json::{Map, Value};

use crate::context::ExpressionError;
use crate::convert::to_text;
use crate::item::Item;

/// The items that each node emitted in the current execution, keyed by node name.
pub type RunData = HashMap<String, Vec<Item>>;

/// The data that an expression can read.
pub struct Scope<'a> {
    pub item: &'a Item,
    pub item_index: usize,
    pub run_data: &'a RunData,
}

pub fn evaluate(value: &Value, scope: &Scope) -> Result<Value, ExpressionError> {
    match value {
        Value::String(text) => match text.strip_prefix('=') {
            Some(template) => render(template, scope),
            None => Ok(value.clone()),
        },
        Value::Array(values) => values
            .iter()
            .map(|value| evaluate(value, scope))
            .collect::<Result<_, _>>()
            .map(Value::Array),
        Value::Object(fields) => fields
            .iter()
            .map(|(key, value)| evaluate(value, scope).map(|value| (key.clone(), value)))
            .collect::<Result<_, _>>()
            .map(Value::Object),
        other => Ok(other.clone()),
    }
}

enum Segment<'t> {
    Text(&'t str),
    Expression(&'t str),
}

#[derive(Debug, PartialEq)]
enum Key {
    Field(String),
    Index(usize),
}

fn render(template: &str, scope: &Scope) -> Result<Value, ExpressionError> {
    let segments = split(template)?;
    if let [Segment::Expression(expression)] = segments.as_slice() {
        return resolve(expression, scope);
    }
    segments
        .iter()
        .map(|segment| match segment {
            Segment::Text(text) => Ok(text.to_string()),
            Segment::Expression(expression) => resolve(expression, scope).map(|v| to_text(&v)),
        })
        .collect::<Result<String, _>>()
        .map(Value::String)
}

fn split(template: &str) -> Result<Vec<Segment<'_>>, ExpressionError> {
    let mut segments = Vec::new();
    let mut rest = template.trim();
    while let Some(start) = rest.find("{{") {
        let end = rest[start..]
            .find("}}")
            .map(|offset| start + offset)
            .ok_or_else(|| error(template, "missing closing `}}`"))?;
        if start > 0 {
            segments.push(Segment::Text(&rest[..start]));
        }
        segments.push(Segment::Expression(rest[start + 2..end].trim()));
        rest = &rest[end + 2..];
    }
    if !rest.is_empty() {
        segments.push(Segment::Text(rest));
    }
    Ok(segments)
}

fn resolve(expression: &str, scope: &Scope) -> Result<Value, ExpressionError> {
    let (item, path) = source(expression, scope)?;
    let keys = parse_path(path).ok_or_else(|| error(expression, "unsupported syntax"))?;
    Ok(walk(&item.json, &keys))
}

/// Splits an expression into the item it reads and the path that follows.
fn source<'a, 'e>(
    expression: &'e str,
    scope: &Scope<'a>,
) -> Result<(&'a Item, &'e str), ExpressionError> {
    if let Some(path) = expression.strip_prefix("$json") {
        return Ok((scope.item, path));
    }
    let (node, rest) = expression
        .strip_prefix("$(")
        .and_then(quoted)
        .ok_or_else(|| error(expression, "expected `$json` or `$('Node name')`"))?;
    let path = rest
        .strip_prefix(").item.json")
        .ok_or_else(|| error(expression, "expected `.item.json` after the node reference"))?;
    Ok((paired_item(node, scope, expression)?, path))
}

fn paired_item<'a>(
    node: &str,
    scope: &Scope<'a>,
    expression: &str,
) -> Result<&'a Item, ExpressionError> {
    let items = scope
        .run_data
        .get(node)
        .ok_or_else(|| error(expression, &format!("node `{node}` has not run")))?;
    match items.as_slice() {
        [single] => Ok(single),
        _ => items.get(scope.item_index).ok_or_else(|| {
            let message = format!("node `{node}` has no item at index {}", scope.item_index);
            error(expression, &message)
        }),
    }
}

/// Parses a quoted string at the start of `text` and returns it with the text after it.
fn quoted(text: &str) -> Option<(&str, &str)> {
    let quote = text.chars().next().filter(|c| *c == '\'' || *c == '"')?;
    let body = &text[1..];
    let end = body.find(quote)?;
    Some((&body[..end], &body[end + 1..]))
}

fn parse_path(mut rest: &str) -> Option<Vec<Key>> {
    let mut keys = Vec::new();
    while !rest.is_empty() {
        let (key, next) = parse_key(rest)?;
        keys.push(key);
        rest = next;
    }
    Some(keys)
}

/// Parses one `.field`, `["field"]`, or `[0]` accessor.
fn parse_key(text: &str) -> Option<(Key, &str)> {
    if let Some(after) = text.strip_prefix('.') {
        let end = after
            .find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$'))
            .unwrap_or(after.len());
        return (end > 0).then(|| (Key::Field(after[..end].to_string()), &after[end..]));
    }
    let inner = text.strip_prefix('[')?;
    if let Some((field, after)) = quoted(inner) {
        return Some((Key::Field(field.to_string()), after.strip_prefix(']')?));
    }
    let end = inner.find(']')?;
    let index = inner[..end].trim().parse().ok()?;
    Some((Key::Index(index), &inner[end + 1..]))
}

fn walk(json: &Map<String, Value>, keys: &[Key]) -> Value {
    match keys.split_first() {
        None => Value::Object(json.clone()),
        Some((Key::Field(name), rest)) => json
            .get(name)
            .and_then(|value| rest.iter().try_fold(Cow::Borrowed(value), step))
            .map(Cow::into_owned)
            .unwrap_or(Value::Null),
        Some((Key::Index(_), _)) => Value::Null,
    }
}

/// Reads one key from `value`. `length` on an array or a string returns its length, as in JavaScript.
fn step<'v>(value: Cow<'v, Value>, key: &Key) -> Option<Cow<'v, Value>> {
    let Cow::Borrowed(value) = value else {
        // Only a computed length is owned, and a number has no keys.
        return None;
    };
    match (key, value) {
        (Key::Field(name), Value::Array(items)) if name == "length" => {
            Some(Cow::Owned(items.len().into()))
        }
        (Key::Field(name), Value::String(text)) if name == "length" => {
            Some(Cow::Owned(text.chars().count().into()))
        }
        (Key::Field(name), _) => value.get(name.as_str()).map(Cow::Borrowed),
        (Key::Index(index), _) => value.get(*index).map(Cow::Borrowed),
    }
}

fn error(expression: &str, message: &str) -> ExpressionError {
    ExpressionError {
        expression: expression.to_string(),
        message: message.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::testing::item;

    fn eval_with(
        value: Value,
        item_index: usize,
        run_data: &RunData,
    ) -> Result<Value, ExpressionError> {
        let current = item(json!({
            "body": { "name": "Ada", "age": 36, "tags": ["a", "b"], "first name": "A" }
        }));
        let scope = Scope {
            item: &current,
            item_index,
            run_data,
        };
        evaluate(&value, &scope)
    }

    fn eval(value: Value) -> Value {
        eval_with(value, 0, &RunData::new()).unwrap()
    }

    fn run_data() -> RunData {
        RunData::from([
            ("Webhook".to_string(), vec![item(json!({ "id": "w" }))]),
            (
                "Split".to_string(),
                vec![item(json!({ "n": 0 })), item(json!({ "n": 1 }))],
            ),
        ])
    }

    #[test]
    fn leaves_plain_values_unchanged() {
        assert_eq!(eval(json!("hello")), json!("hello"));
        assert_eq!(eval(json!(42)), json!(42));
        assert_eq!(
            eval(json!("{{ $json.body.name }}")),
            json!("{{ $json.body.name }}")
        );
    }

    #[test]
    fn keeps_the_type_of_a_single_expression() {
        assert_eq!(eval(json!("={{ $json.body.age }}")), json!(36));
        assert_eq!(eval(json!("={{ $json.body.tags }}")), json!(["a", "b"]));
        assert_eq!(eval(json!("={{ $json }}"))["body"]["name"], json!("Ada"));
    }

    #[test]
    fn renders_text_templates() {
        assert_eq!(
            eval(json!(
                "=Hi {{ $json.body.name }}, age {{ $json.body.age }}{{ $json.nope }}!"
            )),
            json!("Hi Ada, age 36!")
        );
    }

    #[test]
    fn reads_bracket_paths() {
        assert_eq!(eval(json!("={{ $json.body.tags[1] }}")), json!("b"));
        assert_eq!(
            eval(json!("={{ $json[\"body\"]['first name'] }}")),
            json!("A")
        );
    }

    #[test]
    fn reads_the_length_of_arrays_and_strings() {
        assert_eq!(eval(json!("={{ $json.body.tags.length }}")), json!(2));
        assert_eq!(eval(json!("={{ $json.body.name.length }}")), json!(3));
        assert_eq!(
            eval(json!("={{ $json.body.tags.length.more }}")),
            Value::Null
        );
    }

    #[test]
    fn resolves_missing_fields_to_null() {
        assert_eq!(eval(json!("={{ $json.missing.deeper }}")), Value::Null);
        assert_eq!(eval(json!("={{ $json.body.tags[9] }}")), Value::Null);
    }

    #[test]
    fn evaluates_nested_parameters() {
        assert_eq!(
            eval(json!({ "list": ["={{ $json.body.name }}", 1], "fixed": true })),
            json!({ "list": ["Ada", 1], "fixed": true })
        );
    }

    #[test]
    fn reads_earlier_nodes() {
        let run_data = run_data();
        let reference = json!("={{ $('Split').item.json.n }}");

        assert_eq!(
            eval_with(reference.clone(), 1, &run_data).unwrap(),
            json!(1)
        );
        assert_eq!(
            eval_with(json!("={{ $(\"Webhook\").item.json.id }}"), 1, &run_data).unwrap(),
            json!("w")
        );
        assert!(eval_with(reference, 2, &run_data).is_err());
    }

    #[test]
    fn rejects_unsupported_expressions() {
        let run_data = run_data();
        let failures = [
            "={{ $json.body.name.toUpperCase() }}",
            "={{ 1 + 1 }}",
            "={{ $('Missing').item.json }}",
            "={{ $('Webhook').first().json }}",
            "={{ $json.body",
        ];
        for expression in failures {
            assert!(
                eval_with(json!(expression), 0, &run_data).is_err(),
                "expected `{expression}` to fail"
            );
        }
    }
}
