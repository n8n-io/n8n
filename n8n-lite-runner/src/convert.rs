//! Type conversions that follow n8n's `validateFieldType` and `tryToParse*` functions.
//!
//! In strict mode a value must already have the target type. In loose mode a
//! value is converted when n8n would convert it. `null` is valid for every type
//! and converts to `None`.

use serde::Deserialize;
use serde_json::{Map, Number, Value};

/// The value types that the Set node and the If node work with.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FieldType {
    #[default]
    String,
    Number,
    Boolean,
    Array,
    Object,
}

#[derive(Debug, PartialEq, thiserror::Error)]
#[error("expected {expected} but got {value}")]
pub struct ConversionError {
    expected: &'static str,
    value: String,
}

/// Converts `value` to `to` and returns it as JSON.
pub fn convert(value: &Value, to: FieldType, strict: bool) -> Result<Value, ConversionError> {
    let converted = match to {
        FieldType::String => to_string(value, strict)?.map(Value::String),
        FieldType::Number => to_number(value, strict)?.map(number_value),
        FieldType::Boolean => to_boolean(value, strict)?.map(Value::Bool),
        FieldType::Array => to_array(value, strict)?.map(Value::Array),
        FieldType::Object => to_object(value, strict)?.map(Value::Object),
    };
    Ok(converted.unwrap_or(Value::Null))
}

pub fn to_string(value: &Value, strict: bool) -> Result<Option<String>, ConversionError> {
    match value {
        Value::Null => Ok(None),
        Value::String(text) => Ok(Some(text.clone())),
        _ if strict => Err(error("a string", value)),
        other => Ok(Some(to_text(other))),
    }
}

/// Follows JavaScript `Number()`: `""` is 0, `true` is 1, and other text must parse as a number.
pub fn to_number(value: &Value, strict: bool) -> Result<Option<f64>, ConversionError> {
    let number = match value {
        Value::Null => return Ok(None),
        Value::Number(number) => number.as_f64(),
        _ if strict => None,
        Value::Bool(flag) => Some(f64::from(u8::from(*flag))),
        Value::String(text) => parse_number(text),
        _ => None,
    };
    number.map(Some).ok_or_else(|| error("a number", value))
}

/// Accepts `true` and `false` in any letter case, and any value that converts to the number 0 or 1.
pub fn to_boolean(value: &Value, strict: bool) -> Result<Option<bool>, ConversionError> {
    let flag = match value {
        Value::Null => return Ok(None),
        Value::Bool(flag) => Some(*flag),
        _ if strict => None,
        Value::String(text) if text.eq_ignore_ascii_case("true") => Some(true),
        Value::String(text) if text.eq_ignore_ascii_case("false") => Some(false),
        Value::String(text) if text.trim().is_empty() => None,
        other => match to_number(other, false) {
            Ok(Some(0.0)) => Some(false),
            Ok(Some(1.0)) => Some(true),
            _ => None,
        },
    };
    flag.map(Some).ok_or_else(|| error("a boolean", value))
}

/// Accepts an array, or in loose mode a string that holds a JSON array.
pub fn to_array(value: &Value, strict: bool) -> Result<Option<Vec<Value>>, ConversionError> {
    match value {
        Value::Null => Ok(None),
        Value::Array(items) => Ok(Some(items.clone())),
        Value::String(text) if !strict => serde_json::from_str(text)
            .map(Some)
            .map_err(|_| error("an array", value)),
        _ => Err(error("an array", value)),
    }
}

/// Accepts an object, or in loose mode a string that holds a JSON object.
pub fn to_object(
    value: &Value,
    strict: bool,
) -> Result<Option<Map<String, Value>>, ConversionError> {
    match value {
        Value::Null => Ok(None),
        Value::Object(fields) => Ok(Some(fields.clone())),
        Value::String(text) if !strict => serde_json::from_str(text)
            .map(Some)
            .map_err(|_| error("an object", value)),
        _ => Err(error("an object", value)),
    }
}

/// Renders a value as text: a string as is, `null` as an empty string, anything else as JSON.
pub fn to_text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        other => other.to_string(),
    }
}

/// Returns an integer JSON number when `number` has no fraction, so 5.0 renders as `5`.
pub fn number_value(number: f64) -> Value {
    const SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
    if number.fract() == 0.0 && number.abs() <= SAFE_INTEGER {
        Value::from(number as i64)
    } else {
        Number::from_f64(number).map_or(Value::Null, Value::Number)
    }
}

fn parse_number(text: &str) -> Option<f64> {
    let text = text.trim();
    if text.is_empty() {
        return Some(0.0);
    }
    text.parse::<f64>().ok().filter(|number| number.is_finite())
}

fn error(expected: &'static str, value: &Value) -> ConversionError {
    ConversionError {
        expected,
        value: describe(value),
    }
}

fn describe(value: &Value) -> String {
    let kind = match value {
        Value::Null => "null",
        Value::Bool(_) => "the boolean",
        Value::Number(_) => "the number",
        Value::String(_) => "the string",
        Value::Array(_) => "the array",
        Value::Object(_) => "the object",
    };
    format!("{kind} {value}")
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn strict_mode_requires_the_exact_type() {
        assert_eq!(convert(&json!(5), FieldType::Number, true), Ok(json!(5)));
        assert!(convert(&json!("5"), FieldType::Number, true).is_err());
        assert!(convert(&json!(1), FieldType::String, true).is_err());
        assert_eq!(
            convert(&Value::Null, FieldType::Boolean, true),
            Ok(Value::Null)
        );
    }

    #[test]
    fn loose_mode_converts_like_n8n() {
        let cases = [
            (json!(" 42 "), FieldType::Number, json!(42)),
            (json!("2.5"), FieldType::Number, json!(2.5)),
            (json!(""), FieldType::Number, json!(0)),
            (json!(true), FieldType::Number, json!(1)),
            (json!("TRUE"), FieldType::Boolean, json!(true)),
            (json!("0"), FieldType::Boolean, json!(false)),
            (json!(1), FieldType::Boolean, json!(true)),
            (json!(3), FieldType::String, json!("3")),
            (json!({ "a": 1 }), FieldType::String, json!("{\"a\":1}")),
            (json!("[1,2]"), FieldType::Array, json!([1, 2])),
            (json!("{\"a\":1}"), FieldType::Object, json!({ "a": 1 })),
        ];
        for (value, to, expected) in cases {
            assert_eq!(
                convert(&value, to, false),
                Ok(expected),
                "{value} to {to:?}"
            );
        }
    }

    #[test]
    fn loose_mode_rejects_values_n8n_rejects() {
        let cases = [
            (json!("abc"), FieldType::Number),
            (json!("NaN"), FieldType::Number),
            (json!([1]), FieldType::Number),
            (json!(""), FieldType::Boolean),
            (json!(2), FieldType::Boolean),
            (json!("yes"), FieldType::Boolean),
            (json!("{"), FieldType::Object),
            (json!("[1]"), FieldType::Object),
        ];
        for (value, to) in cases {
            assert!(convert(&value, to, false).is_err(), "{value} to {to:?}");
        }
    }

    #[test]
    fn describes_the_rejected_value() {
        let message = convert(&json!("5"), FieldType::Number, true)
            .unwrap_err()
            .to_string();
        assert_eq!(message, "expected a number but got the string \"5\"");
    }
}
