//! The HTTP server that receives webhook calls and starts one execution per call.
//!
//! The workflow's webhook is served at `/webhook/<path>`, the path of production
//! webhooks in n8n. Each call waits for the answer of its own execution, so
//! calls run in parallel.

use std::sync::Arc;

use axum::body::{Body as AxumBody, Bytes};
use axum::extract::{Query, RawPathParams, State};
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{MethodFilter, on};
use axum::{Json, Router};
use serde_json::{Value, json};
use std::collections::BTreeMap;

use crate::engine::Engine;
use crate::http::{Body, HttpMethod, HttpResponse};
use crate::webhook::WebhookRequest;
use crate::wire::{content_type, decode_body, to_headers};

/// Builds the routes for the engine's webhook. Other paths answer 404 and other methods 405.
pub fn router(engine: Arc<Engine>) -> Router {
    let webhook = engine.webhook();
    let route = format!("/webhook/{}", route_path(&webhook.path));
    Router::new()
        .route(&route, on(method_filter(webhook.method), handle))
        .fallback(not_found)
        .with_state(engine)
}

/// Converts n8n path parameters such as `:id` to the axum syntax `{id}`.
fn route_path(path: &str) -> String {
    path.split('/')
        .map(|segment| match segment.strip_prefix(':') {
            Some(name) => format!("{{{name}}}"),
            None => segment.to_string(),
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn method_filter(method: HttpMethod) -> MethodFilter {
    match method {
        HttpMethod::Get => MethodFilter::GET,
        HttpMethod::Post => MethodFilter::POST,
        HttpMethod::Put => MethodFilter::PUT,
        HttpMethod::Patch => MethodFilter::PATCH,
        HttpMethod::Delete => MethodFilter::DELETE,
        HttpMethod::Head => MethodFilter::HEAD,
        HttpMethod::Options => MethodFilter::OPTIONS,
    }
}

async fn handle(
    State(engine): State<Arc<Engine>>,
    params: RawPathParams,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let webhook = engine.webhook();
    let request = WebhookRequest {
        method: webhook.method,
        path: webhook.path.clone(),
        headers: to_headers(&headers),
        params: params
            .iter()
            .map(|(name, value)| (name.to_string(), value.to_string()))
            .collect(),
        query,
        body: parse_body(content_type(&headers), &body),
    };
    match engine.spawn(request).await {
        Ok(response) => into_response(response),
        // The execution task ended without an answer, which only happens when it panics.
        Err(_) => error(StatusCode::INTERNAL_SERVER_ERROR, "Error in workflow"),
    }
}

/// Parses the request body as n8n does: JSON, form fields, or text. An empty body is `{}`.
fn parse_body(content_type: Option<&str>, bytes: &[u8]) -> Value {
    let is_form =
        content_type.is_some_and(|value| value.starts_with("application/x-www-form-urlencoded"));
    if is_form && let Ok(fields) = serde_urlencoded::from_bytes::<Vec<(String, String)>>(bytes) {
        return Value::Object(
            fields
                .into_iter()
                .map(|(name, value)| (name, Value::String(value)))
                .collect(),
        );
    }
    match decode_body(content_type, bytes) {
        Body::Empty => json!({}),
        Body::Json(value) => value,
        Body::Text(text) => Value::String(text),
    }
}

/// Sets a JSON or text content type unless the response headers already set one.
fn into_response(response: HttpResponse) -> Response {
    let status = StatusCode::from_u16(response.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let (default_type, bytes) = match response.body {
        Body::Empty => (None, Vec::new()),
        Body::Json(value) => (
            Some("application/json; charset=utf-8"),
            value.to_string().into_bytes(),
        ),
        Body::Text(text) => (Some("text/plain; charset=utf-8"), text.into_bytes()),
    };
    let mut builder = Response::builder().status(status);
    for (name, value) in &response.headers {
        builder = builder.header(name, value);
    }
    if let Some(default_type) =
        default_type.filter(|_| !response.headers.contains_key("content-type"))
    {
        builder = builder.header(CONTENT_TYPE, default_type);
    }
    builder
        .body(AxumBody::from(bytes))
        .unwrap_or_else(|_| error(StatusCode::INTERNAL_SERVER_ERROR, "invalid response header"))
}

async fn not_found() -> Response {
    error(
        StatusCode::NOT_FOUND,
        "The requested webhook is not registered.",
    )
}

fn error(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(json!({ "code": status.as_u16(), "message": message })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use axum::http::Request;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    use super::*;
    use crate::nodes;
    use crate::testing::{MockReporter, NoHttp};
    use crate::workflow::Workflow;

    /// A webhook in `lastNode` mode with no other node, so the answer is the webhook item.
    fn echo_router(path: &str) -> Router {
        let workflow: Workflow = serde_json::from_value(json!({
            "nodes": [{
                "id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                "parameters": { "httpMethod": "POST", "path": path, "responseMode": "lastNode" }
            }],
            "connections": {}
        }))
        .unwrap();
        let engine = Engine::load(
            workflow,
            &nodes::registry(),
            Arc::new(NoHttp),
            Arc::new(MockReporter::default()),
        )
        .unwrap();
        router(Arc::new(engine))
    }

    async fn call(router: Router, request: Request<AxumBody>) -> (StatusCode, HeaderMap, Value) {
        let response = router.oneshot(request).await.unwrap();
        let status = response.status();
        let headers = response.headers().clone();
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        (
            status,
            headers,
            serde_json::from_slice(&bytes).unwrap_or(Value::Null),
        )
    }

    fn post(uri: &str, content_type: &str, body: &'static str) -> Request<AxumBody> {
        Request::post(uri)
            .header(CONTENT_TYPE, content_type)
            .body(AxumBody::from(body))
            .unwrap()
    }

    #[test]
    fn converts_path_parameters() {
        assert_eq!(
            route_path("orders/:id/items/:item"),
            "orders/{id}/items/{item}"
        );
        assert_eq!(route_path("plain"), "plain");
    }

    #[tokio::test]
    async fn passes_the_call_to_the_execution() {
        let request = post(
            "/webhook/orders/42?expand=true",
            "application/json",
            r#"{"total":5}"#,
        );

        let (status, headers, body) = call(echo_router("orders/:id"), request).await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(headers[CONTENT_TYPE], "application/json; charset=utf-8");
        assert_eq!(body["params"], json!({ "id": "42" }));
        assert_eq!(body["query"], json!({ "expand": "true" }));
        assert_eq!(body["body"], json!({ "total": 5 }));
        assert_eq!(body["headers"]["content-type"], "application/json");
    }

    #[tokio::test]
    async fn parses_form_and_text_bodies() {
        let form = post(
            "/webhook/in",
            "application/x-www-form-urlencoded",
            "a=1&b=x+y",
        );
        let text = post("/webhook/in", "text/plain", "hello");

        let (_, _, form) = call(echo_router("in"), form).await;
        let (_, _, text) = call(echo_router("in"), text).await;

        assert_eq!(form["body"], json!({ "a": "1", "b": "x y" }));
        assert_eq!(text["body"], json!("hello"));
    }

    #[tokio::test]
    async fn rejects_other_paths_and_methods() {
        let other_path = post("/webhook/other", "application/json", "{}");
        let other_method = Request::get("/webhook/in").body(AxumBody::empty()).unwrap();

        let (not_found, _, body) = call(echo_router("in"), other_path).await;
        let (not_allowed, _, _) = call(echo_router("in"), other_method).await;

        assert_eq!(not_found, StatusCode::NOT_FOUND);
        assert_eq!(body["code"], 404);
        assert_eq!(not_allowed, StatusCode::METHOD_NOT_ALLOWED);
    }

    #[test]
    fn keeps_a_content_type_set_by_the_workflow() {
        let response = into_response(HttpResponse {
            status: 201,
            headers: [("content-type".to_string(), "text/html".to_string())].into(),
            body: Body::Text("<p>hi</p>".into()),
        });

        assert_eq!(response.status(), StatusCode::CREATED);
        assert_eq!(response.headers()[CONTENT_TYPE], "text/html");
    }
}
