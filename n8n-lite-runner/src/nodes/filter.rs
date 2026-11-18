//! The n8n `filter` parameter: a list of conditions joined by AND or OR.
//!
//! Follows `executeFilterCondition` in n8n's `filter-parameter.ts`. Supported
//! operator types: string, number, boolean, array, object, and the `exists`
//! and `notExists` checks for any type. Date and regex operators are rejected
//! when the workflow loads.

use serde::Deserialize;
use serde_json::Value;

use crate::context::ExecutionContext;
use crate::convert::{self, ConversionError};
use crate::item::Item;
use crate::node::NodeError;

/// The stored value of a `filter` parameter.
#[derive(Debug, Deserialize)]
pub struct FilterValue {
    #[serde(default)]
    pub conditions: Vec<Condition>,
    #[serde(default)]
    pub combinator: Combinator,
    #[serde(default)]
    pub options: FilterOptions,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Combinator {
    #[default]
    And,
    Or,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterOptions {
    #[serde(default = "enabled")]
    pub case_sensitive: bool,
    #[serde(default)]
    pub type_validation: TypeValidation,
}

impl Default for FilterOptions {
    fn default() -> Self {
        Self {
            case_sensitive: true,
            type_validation: TypeValidation::default(),
        }
    }
}

fn enabled() -> bool {
    true
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TypeValidation {
    #[default]
    Strict,
    Loose,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Condition {
    #[serde(default)]
    left_value: Value,
    #[serde(default)]
    right_value: Value,
    operator: Operator,
}

/// How values are compared, after the node options are applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Settings {
    pub strict: bool,
    pub case_sensitive: bool,
}

/// A filter that is ready to run against items.
#[derive(Debug)]
pub struct Filter {
    conditions: Vec<Condition>,
    combinator: Combinator,
    settings: Settings,
}

impl Filter {
    pub fn new(value: FilterValue, settings: Settings) -> Self {
        Self {
            conditions: value.conditions,
            combinator: value.combinator,
            settings,
        }
    }

    /// Returns whether `item` passes. AND stops at the first failing condition, OR at the first passing one.
    pub fn passes(
        &self,
        context: &dyn ExecutionContext,
        item: &Item,
        index: usize,
    ) -> Result<bool, NodeError> {
        let decisive = self.combinator == Combinator::Or;
        for (position, condition) in self.conditions.iter().enumerate() {
            let left = context.evaluate(&condition.left_value, item, index)?;
            let right = context.evaluate(&condition.right_value, item, index)?;
            let pass = condition
                .operator
                .check(&left, &right, &self.settings)
                .map_err(|error| {
                    NodeError::Failed(format!("condition {position}, item {index}: {error}"))
                })?;
            if pass == decisive {
                return Ok(decisive);
            }
        }
        Ok(!decisive)
    }
}

/// An operator from the `operator` field, for example `{ "type": "number", "operation": "gt" }`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(try_from = "RawOperator")]
pub enum Operator {
    Exists,
    NotExists,
    String(StringOperation),
    Number(NumberOperation),
    Boolean(BooleanOperation),
    Array(ArrayOperation),
    Object(ObjectOperation),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StringOperation {
    Empty,
    NotEmpty,
    Equals,
    NotEquals,
    Contains,
    NotContains,
    StartsWith,
    NotStartsWith,
    EndsWith,
    NotEndsWith,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NumberOperation {
    Empty,
    NotEmpty,
    Equals,
    NotEquals,
    Gt,
    Lt,
    Gte,
    Lte,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BooleanOperation {
    Empty,
    NotEmpty,
    True,
    False,
    Equals,
    NotEquals,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ArrayOperation {
    Empty,
    NotEmpty,
    Contains,
    NotContains,
    LengthEquals,
    LengthNotEquals,
    LengthGt,
    LengthLt,
    LengthGte,
    LengthLte,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ObjectOperation {
    Empty,
    NotEmpty,
}

#[derive(Deserialize)]
struct RawOperator {
    #[serde(rename = "type")]
    operand_type: String,
    operation: String,
}

impl TryFrom<RawOperator> for Operator {
    type Error = String;

    fn try_from(raw: RawOperator) -> Result<Self, Self::Error> {
        let operation = Value::String(raw.operation.clone());
        let parsed = match (raw.operand_type.as_str(), raw.operation.as_str()) {
            (_, "exists") => Ok(Operator::Exists),
            (_, "notExists") => Ok(Operator::NotExists),
            ("string", _) => serde_json::from_value(operation).map(Operator::String),
            ("number", _) => serde_json::from_value(operation).map(Operator::Number),
            ("boolean", _) => serde_json::from_value(operation).map(Operator::Boolean),
            ("array", _) => serde_json::from_value(operation).map(Operator::Array),
            ("object", _) => serde_json::from_value(operation).map(Operator::Object),
            _ => return Err(unsupported(&raw)),
        };
        parsed.map_err(|_| unsupported(&raw))
    }
}

fn unsupported(raw: &RawOperator) -> String {
    format!(
        "unsupported operator `{}:{}`",
        raw.operand_type, raw.operation
    )
}

impl Operator {
    fn check(
        &self,
        left: &Value,
        right: &Value,
        settings: &Settings,
    ) -> Result<bool, ConversionError> {
        match self {
            Operator::Exists => Ok(!left.is_null()),
            Operator::NotExists => Ok(left.is_null()),
            Operator::String(operation) => check_string(*operation, left, right, settings),
            Operator::Number(operation) => check_number(*operation, left, right, settings),
            Operator::Boolean(operation) => check_boolean(*operation, left, right, settings),
            Operator::Array(operation) => check_array(*operation, left, right, settings),
            Operator::Object(operation) => check_object(*operation, left, settings),
        }
    }
}

fn check_string(
    operation: StringOperation,
    left: &Value,
    right: &Value,
    settings: &Settings,
) -> Result<bool, ConversionError> {
    use StringOperation::*;
    let text = |value: &Value| -> Result<String, ConversionError> {
        let text = convert::to_string(value, settings.strict)?.unwrap_or_default();
        Ok(if settings.case_sensitive {
            text
        } else {
            text.to_lowercase()
        })
    };
    let left = text(left)?;
    let right = || text(right);
    Ok(match operation {
        Empty => left.is_empty(),
        NotEmpty => !left.is_empty(),
        Equals => left == right()?,
        NotEquals => left != right()?,
        Contains => left.contains(&right()?),
        NotContains => !left.contains(&right()?),
        StartsWith => left.starts_with(&right()?),
        NotStartsWith => !left.starts_with(&right()?),
        EndsWith => left.ends_with(&right()?),
        NotEndsWith => !left.ends_with(&right()?),
    })
}

/// A missing number makes every ordering comparison false, as `undefined > 1` is in JavaScript.
fn check_number(
    operation: NumberOperation,
    left: &Value,
    right: &Value,
    settings: &Settings,
) -> Result<bool, ConversionError> {
    use NumberOperation::*;
    let left = convert::to_number(left, settings.strict)?;
    let right = || convert::to_number(right, settings.strict);
    let compare = |right: Option<f64>, test: fn(f64, f64) -> bool| match (left, right) {
        (Some(left), Some(right)) => test(left, right),
        _ => false,
    };
    Ok(match operation {
        Empty => left.is_none(),
        NotEmpty => left.is_some(),
        Equals => left == right()?,
        NotEquals => left != right()?,
        Gt => compare(right()?, |a, b| a > b),
        Lt => compare(right()?, |a, b| a < b),
        Gte => compare(right()?, |a, b| a >= b),
        Lte => compare(right()?, |a, b| a <= b),
    })
}

fn check_boolean(
    operation: BooleanOperation,
    left: &Value,
    right: &Value,
    settings: &Settings,
) -> Result<bool, ConversionError> {
    use BooleanOperation::*;
    let left = convert::to_boolean(left, settings.strict)?;
    let right = || convert::to_boolean(right, settings.strict);
    Ok(match operation {
        Empty => left.is_none(),
        NotEmpty => left.is_some(),
        True => left == Some(true),
        False => left != Some(true),
        Equals => left == right()?,
        NotEquals => left != right()?,
    })
}

/// `contains` compares the right value as is. The length operations convert it to a number.
fn check_array(
    operation: ArrayOperation,
    left: &Value,
    right: &Value,
    settings: &Settings,
) -> Result<bool, ConversionError> {
    use ArrayOperation::*;
    let left = convert::to_array(left, settings.strict)?.unwrap_or_default();
    let contains = || array_contains(&left, right, settings.case_sensitive);
    let length = left.len() as f64;
    let compare = |test: fn(f64, f64) -> bool| -> Result<bool, ConversionError> {
        Ok(convert::to_number(right, settings.strict)?.is_some_and(|right| test(length, right)))
    };
    match operation {
        Empty => Ok(left.is_empty()),
        NotEmpty => Ok(!left.is_empty()),
        Contains => Ok(contains()),
        NotContains => Ok(!contains()),
        LengthEquals => compare(|a, b| a == b),
        LengthNotEquals => compare(|a, b| a != b),
        LengthGt => compare(|a, b| a > b),
        LengthLt => compare(|a, b| a < b),
        LengthGte => compare(|a, b| a >= b),
        LengthLte => compare(|a, b| a <= b),
    }
}

fn array_contains(items: &[Value], value: &Value, case_sensitive: bool) -> bool {
    match value {
        Value::String(needle) if !case_sensitive => items.iter().any(|item| {
            item.as_str()
                .is_some_and(|text| text.to_lowercase() == needle.to_lowercase())
        }),
        _ => items.contains(value),
    }
}

fn check_object(
    operation: ObjectOperation,
    left: &Value,
    settings: &Settings,
) -> Result<bool, ConversionError> {
    let empty = convert::to_object(left, settings.strict)?.is_none_or(|fields| fields.is_empty());
    Ok(match operation {
        ObjectOperation::Empty => empty,
        ObjectOperation::NotEmpty => !empty,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    const STRICT: Settings = Settings {
        strict: true,
        case_sensitive: true,
    };

    fn operator(operand_type: &str, operation: &str) -> Operator {
        serde_json::from_value(json!({ "type": operand_type, "operation": operation })).unwrap()
    }

    fn check(operation: (&str, &str), left: Value, right: Value, settings: Settings) -> bool {
        operator(operation.0, operation.1)
            .check(&left, &right, &settings)
            .unwrap()
    }

    #[test]
    fn parses_supported_operators() {
        assert_eq!(operator("any", "exists"), Operator::Exists);
        assert_eq!(
            operator("number", "gt"),
            Operator::Number(NumberOperation::Gt)
        );
        assert_eq!(
            operator("string", "startsWith"),
            Operator::String(StringOperation::StartsWith)
        );
    }

    #[test]
    fn rejects_unsupported_operators() {
        let cases = [
            ("dateTime", "before"),
            ("string", "regex"),
            ("number", "contains"),
        ];
        for (operand_type, operation) in cases {
            let parsed = serde_json::from_value::<Operator>(
                json!({ "type": operand_type, "operation": operation }),
            );
            let error = parsed.unwrap_err().to_string();
            assert!(error.contains("unsupported operator"), "{error}");
        }
    }

    #[test]
    fn compares_strings() {
        let loose_case = Settings {
            strict: true,
            case_sensitive: false,
        };
        assert!(check(
            ("string", "equals"),
            json!("Ada"),
            json!("Ada"),
            STRICT
        ));
        assert!(!check(
            ("string", "equals"),
            json!("Ada"),
            json!("ada"),
            STRICT
        ));
        assert!(check(
            ("string", "equals"),
            json!("Ada"),
            json!("ada"),
            loose_case
        ));
        assert!(check(
            ("string", "startsWith"),
            json!("sam"),
            json!("s"),
            STRICT
        ));
        assert!(check(
            ("string", "endsWith"),
            json!("a@yahoo.com"),
            json!("@yahoo.com"),
            STRICT
        ));
        assert!(check(
            ("string", "notContains"),
            json!("abc"),
            json!("x"),
            STRICT
        ));
        assert!(check(("string", "empty"), Value::Null, Value::Null, STRICT));
    }

    #[test]
    fn compares_numbers() {
        assert!(check(("number", "gt"), json!(6), json!(5), STRICT));
        assert!(!check(("number", "gt"), Value::Null, json!(5), STRICT));
        assert!(check(("number", "lte"), json!(5), json!(5), STRICT));
        assert!(check(
            ("number", "notEquals"),
            Value::Null,
            json!(5),
            STRICT
        ));
        assert!(check(("number", "empty"), Value::Null, json!(""), STRICT));
    }

    #[test]
    fn checks_booleans_arrays_and_objects() {
        assert!(check(("boolean", "true"), json!(true), json!(""), STRICT));
        assert!(check(("boolean", "false"), Value::Null, json!(""), STRICT));
        assert!(check(
            ("array", "contains"),
            json!(["a", 1]),
            json!(1),
            STRICT
        ));
        assert!(check(
            ("array", "lengthGt"),
            json!([1, 2]),
            json!(1),
            STRICT
        ));
        assert!(check(
            ("object", "notEmpty"),
            json!({ "a": 1 }),
            json!(""),
            STRICT
        ));
        assert!(check(("any", "exists"), json!(0), Value::Null, STRICT));
        assert!(check(
            ("any", "notExists"),
            Value::Null,
            Value::Null,
            STRICT
        ));
    }

    #[test]
    fn strict_mode_fails_on_wrong_types_and_loose_mode_converts() {
        let gt = operator("number", "gt");
        assert!(gt.check(&json!("6"), &json!(5), &STRICT).is_err());
        let loose = Settings {
            strict: false,
            case_sensitive: true,
        };
        assert_eq!(gt.check(&json!("6"), &json!("5"), &loose), Ok(true));
    }
}
