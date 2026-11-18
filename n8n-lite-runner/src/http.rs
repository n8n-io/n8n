//! HTTP types shared by the webhook trigger, Respond to Webhook, and HTTP Request.
//!
//! They do not depend on an HTTP library, so nodes can be tested with a mock client.

use std::collections::BTreeMap;

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

/// The default is `GET`, as in the Webhook and HTTP Request nodes.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    #[default]
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

impl HttpMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Patch => "PATCH",
            HttpMethod::Delete => "DELETE",
            HttpMethod::Head => "HEAD",
            HttpMethod::Options => "OPTIONS",
        }
    }
}

/// Header names in lowercase, mapped to their values.
pub type Headers = BTreeMap<String, String>;

#[derive(Debug, Clone, Default, PartialEq)]
pub enum Body {
    #[default]
    Empty,
    Json(Value),
    Text(String),
}

/// An outgoing request that the HTTP Request node builds.
#[derive(Debug, Clone, PartialEq)]
pub struct HttpRequest {
    pub method: HttpMethod,
    pub url: String,
    pub query: Vec<(String, String)>,
    pub headers: Headers,
    pub body: Body,
}

/// A response: either received by the HTTP Request node, or sent back to a webhook caller.
#[derive(Debug, Clone, PartialEq)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: Headers,
    pub body: Body,
}

#[derive(Debug, thiserror::Error)]
#[error("HTTP request failed: {message}")]
pub struct HttpError {
    pub message: String,
}

/// Sends outgoing HTTP requests. The engine provides the real client and tests provide a mock.
///
/// The client returns `Body::Json` when the response has a JSON content type and
/// a valid JSON body. It returns `Body::Text` for any other non-empty body.
/// A request returns `Ok` for every status code. `Err` means that no response arrived.
#[async_trait]
pub trait HttpClient: Send + Sync {
    async fn send(&self, request: HttpRequest) -> Result<HttpResponse, HttpError>;
}
