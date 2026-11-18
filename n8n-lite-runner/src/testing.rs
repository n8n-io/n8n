//! Mocks and builders shared by the unit tests.

use std::sync::Mutex;

use async_trait::async_trait;
use serde_json::{Value, json};

use crate::context::{ExecutionContext, ExpressionError, RespondError};
use crate::expression::{self, RunData, Scope};
use crate::http::{Body, Headers, HttpClient, HttpError, HttpRequest, HttpResponse};
use crate::item::Item;
use crate::node::{ActionNode, NodeInstance, NodeOutput};
use crate::reporter::{ExecutionReporter, ExecutionSummary, ReportError};
use crate::workflow::NodeDefinition;

pub fn item(value: Value) -> Item {
    match value {
        Value::Object(json) => Item::new(json),
        other => panic!("expected a JSON object, got {other}"),
    }
}

pub fn items(values: &[Value]) -> Vec<Item> {
    values.iter().cloned().map(item).collect()
}

/// Returns the JSON of every item on every output.
pub fn output_json(output: &NodeOutput) -> Vec<Vec<Value>> {
    output
        .iter()
        .map(|items| {
            items
                .iter()
                .map(|item| Value::Object(item.json.clone()))
                .collect()
        })
        .collect()
}

pub fn definition(node_type: &str, type_version: f64, parameters: Value) -> NodeDefinition {
    serde_json::from_value(json!({
        "id": "1",
        "name": "Node",
        "type": node_type,
        "typeVersion": type_version,
        "parameters": parameters,
    }))
    .unwrap()
}

/// Unwraps an action node, and panics on a trigger node.
pub fn action(instance: NodeInstance) -> Box<dyn ActionNode> {
    match instance {
        NodeInstance::Action(node) => node,
        NodeInstance::Trigger(_) => panic!("expected an action node"),
    }
}

pub fn json_response(status: u16, body: Value) -> HttpResponse {
    HttpResponse {
        status,
        headers: Headers::new(),
        body: Body::Json(body),
    }
}

/// Fails every request, for tests that must not reach the network.
pub struct NoHttp;

#[async_trait]
impl HttpClient for NoHttp {
    async fn send(&self, _: HttpRequest) -> Result<HttpResponse, HttpError> {
        Err(HttpError {
            message: "no network in tests".into(),
        })
    }
}

type Reply = Box<dyn Fn(&HttpRequest) -> HttpResponse + Send + Sync>;

/// Stores every request and answers each one with `reply`.
pub struct MockHttp {
    pub requests: Mutex<Vec<HttpRequest>>,
    reply: Reply,
}

impl MockHttp {
    pub fn replying(reply: impl Fn(&HttpRequest) -> HttpResponse + Send + Sync + 'static) -> Self {
        Self {
            requests: Mutex::new(Vec::new()),
            reply: Box::new(reply),
        }
    }
}

#[async_trait]
impl HttpClient for MockHttp {
    async fn send(&self, request: HttpRequest) -> Result<HttpResponse, HttpError> {
        let response = (self.reply)(&request);
        self.requests.lock().unwrap().push(request);
        Ok(response)
    }
}

/// A context with the real expression evaluator. It stores the webhook response.
pub struct TestContext {
    pub run_data: RunData,
    pub http: MockHttp,
    pub response: Mutex<Option<HttpResponse>>,
}

impl Default for TestContext {
    fn default() -> Self {
        Self::with_http(MockHttp::replying(|_| json_response(200, json!({}))))
    }
}

impl TestContext {
    pub fn with_http(http: MockHttp) -> Self {
        Self {
            run_data: RunData::new(),
            http,
            response: Mutex::new(None),
        }
    }

    pub fn response(&self) -> Option<HttpResponse> {
        self.response.lock().unwrap().clone()
    }

    pub fn requests(&self) -> Vec<HttpRequest> {
        self.http.requests.lock().unwrap().clone()
    }
}

impl ExecutionContext for TestContext {
    fn execution_id(&self) -> &str {
        "test"
    }

    fn evaluate(
        &self,
        value: &Value,
        item: &Item,
        item_index: usize,
    ) -> Result<Value, ExpressionError> {
        let scope = Scope {
            item,
            item_index,
            run_data: &self.run_data,
        };
        expression::evaluate(value, &scope)
    }

    fn http_client(&self) -> &dyn HttpClient {
        &self.http
    }

    fn respond(&self, response: HttpResponse) -> Result<(), RespondError> {
        let mut slot = self.response.lock().unwrap();
        match *slot {
            Some(_) => Err(RespondError::AlreadySent),
            None => {
                *slot = Some(response);
                Ok(())
            }
        }
    }
}

/// Stores every summary it receives.
#[derive(Default)]
pub struct MockReporter {
    pub summaries: Mutex<Vec<ExecutionSummary>>,
}

#[async_trait]
impl ExecutionReporter for MockReporter {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        self.summaries.lock().unwrap().push(summary);
        Ok(())
    }
}
