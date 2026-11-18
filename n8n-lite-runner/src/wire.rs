//! Conversions between the `http` crate types, which axum and reqwest share,
//! and the crate's own HTTP types.

use axum::http::HeaderMap;
use axum::http::header::CONTENT_TYPE;

use crate::http::{Body, Headers};

pub fn content_type(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
}

/// Lowercases header names and joins repeated headers with `, `.
pub fn to_headers(headers: &HeaderMap) -> Headers {
    headers
        .iter()
        .fold(Headers::new(), |mut all, (name, value)| {
            let value = String::from_utf8_lossy(value.as_bytes()).into_owned();
            all.entry(name.as_str().to_lowercase())
                .and_modify(|existing| {
                    existing.push_str(", ");
                    existing.push_str(&value);
                })
                .or_insert(value);
            all
        })
}

/// Returns JSON for a JSON content type with a valid JSON body, and text for any other non-empty body.
pub fn decode_body(content_type: Option<&str>, bytes: &[u8]) -> Body {
    if bytes.is_empty() {
        return Body::Empty;
    }
    let is_json = content_type.is_some_and(|value| value.to_lowercase().contains("json"));
    match serde_json::from_slice(bytes) {
        Ok(value) if is_json => Body::Json(value),
        _ => Body::Text(String::from_utf8_lossy(bytes).into_owned()),
    }
}

#[cfg(test)]
mod tests {
    use axum::http::HeaderValue;
    use serde_json::json;

    use super::*;

    #[test]
    fn decodes_json_only_for_json_content_types() {
        assert_eq!(
            decode_body(Some("application/json; charset=utf-8"), b"{\"a\":1}"),
            Body::Json(json!({ "a": 1 }))
        );
        assert_eq!(
            decode_body(Some("application/problem+json"), b"[1]"),
            Body::Json(json!([1]))
        );
        assert_eq!(
            decode_body(Some("text/plain"), b"{\"a\":1}"),
            Body::Text("{\"a\":1}".into())
        );
        assert_eq!(
            decode_body(Some("application/json"), b"oops"),
            Body::Text("oops".into())
        );
        assert_eq!(decode_body(None, b""), Body::Empty);
    }

    #[test]
    fn joins_repeated_headers() {
        let mut headers = HeaderMap::new();
        headers.append("Set-Cookie", HeaderValue::from_static("a=1"));
        headers.append("Set-Cookie", HeaderValue::from_static("b=2"));
        headers.append("X-Id", HeaderValue::from_static("7"));

        assert_eq!(
            to_headers(&headers),
            Headers::from([
                ("set-cookie".into(), "a=1, b=2".into()),
                ("x-id".into(), "7".into()),
            ])
        );
    }
}
