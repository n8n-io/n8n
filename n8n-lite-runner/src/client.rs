//! The `HttpClient` that the binary uses, built on `reqwest`.

use async_trait::async_trait;

use crate::http::{Body, HttpClient, HttpError, HttpMethod, HttpRequest, HttpResponse};
use crate::wire::{content_type, decode_body, to_headers};

/// Sends requests through one shared `reqwest` connection pool.
#[derive(Default)]
pub struct ReqwestClient {
    client: reqwest::Client,
}

#[async_trait]
impl HttpClient for ReqwestClient {
    async fn send(&self, request: HttpRequest) -> Result<HttpResponse, HttpError> {
        let mut builder = self
            .client
            .request(method(request.method), &request.url)
            .query(&request.query);
        for (name, value) in &request.headers {
            builder = builder.header(name, value);
        }
        builder = match &request.body {
            Body::Empty => builder,
            Body::Json(value) => builder.json(value),
            Body::Text(text) => builder.body(text.clone()),
        };

        let response = builder.send().await.map_err(http_error)?;
        let status = response.status().as_u16();
        let headers = response.headers().clone();
        let bytes = response.bytes().await.map_err(http_error)?;
        Ok(HttpResponse {
            status,
            body: decode_body(content_type(&headers), &bytes),
            headers: to_headers(&headers),
        })
    }
}

fn method(method: HttpMethod) -> reqwest::Method {
    match method {
        HttpMethod::Get => reqwest::Method::GET,
        HttpMethod::Post => reqwest::Method::POST,
        HttpMethod::Put => reqwest::Method::PUT,
        HttpMethod::Patch => reqwest::Method::PATCH,
        HttpMethod::Delete => reqwest::Method::DELETE,
        HttpMethod::Head => reqwest::Method::HEAD,
        HttpMethod::Options => reqwest::Method::OPTIONS,
    }
}

fn http_error(error: reqwest::Error) -> HttpError {
    HttpError {
        message: error.to_string(),
    }
}
