//! Helpers shared by the integration tests.

#![allow(
    dead_code,
    reason = "each test file compiles this module and uses a different part of it"
)]

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use n8n_mini::client::ReqwestClient;
use n8n_mini::engine::Engine;
use n8n_mini::reporter::{ExecutionReporter, ExecutionSummary, ReportError};
use n8n_mini::workflow::Workflow;
use n8n_mini::{nodes, server};
use serde_json::{Value, json};
use tokio::net::TcpListener;
use tokio::sync::mpsc;

/// The path of the report endpoint in n8n, under the default `rest` prefix.
pub const REPORT_PATH: &str = "/rest/n8n-lite/runs";
pub const REPORT_TOKEN: &str = "test-token";

/// A report as the n8n stub received it.
#[derive(Debug)]
pub struct ReceivedReport {
    pub authorization: Option<String>,
    pub body: Value,
}

/// A stand-in for n8n's report endpoint. It accepts only `REPORT_TOKEN`, as n8n
/// accepts only the token for the workflow, and sends each accepted report to the channel.
pub fn n8n_stub() -> (Router, mpsc::UnboundedReceiver<ReceivedReport>) {
    let (sender, receiver) = mpsc::unbounded_channel();
    let router = Router::new().route(
        REPORT_PATH,
        post(
            move |headers: HeaderMap, Json(body): Json<Value>| async move {
                let authorization = headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok())
                    .map(String::from);
                if authorization.as_deref() != Some(&format!("Bearer {REPORT_TOKEN}")) {
                    let error = json!({ "message": "Invalid n8n-lite report token" });
                    return (StatusCode::FORBIDDEN, Json(error));
                }
                let _ = sender.send(ReceivedReport {
                    authorization,
                    body,
                });
                (
                    StatusCode::OK,
                    Json(json!({ "data": { "executionId": "1" } })),
                )
            },
        ),
    );
    (router, receiver)
}

/// Waits up to five seconds for the next report.
pub async fn next_report(reports: &mut mpsc::UnboundedReceiver<ReceivedReport>) -> ReceivedReport {
    tokio::time::timeout(Duration::from_secs(5), reports.recv())
        .await
        .expect("no report arrived within five seconds")
        .expect("the n8n stub stopped")
}

/// Checks `report` against the rules of `liteRunReportSchema` in n8n's `n8n-lite.schemas.ts`.
pub fn assert_matches_report_schema(report: &Value) {
    let is_datetime = |value: &Value| {
        value
            .as_str()
            .is_some_and(|text| text.ends_with('Z') && humantime::parse_rfc3339(text).is_ok())
    };
    let is_task_data = |task: &Value| {
        task["startTime"].is_number()
            && task["executionTime"].is_number()
            && task["executionIndex"].is_number()
            && task["source"].is_array()
            && (task.get("data").is_none() || task["data"].is_object())
    };
    let run_data_is_valid = report["runData"].as_object().is_some_and(|nodes| {
        nodes.values().all(|runs| {
            runs.as_array()
                .is_some_and(|runs| runs.iter().all(is_task_data))
        })
    });

    assert!(
        report["workflowId"]
            .as_str()
            .is_some_and(|id| !id.is_empty()),
        "workflowId: {report}"
    );
    assert!(
        matches!(report["status"].as_str(), Some("success" | "error")),
        "status: {report}"
    );
    assert!(is_datetime(&report["startedAt"]), "startedAt: {report}");
    assert!(is_datetime(&report["stoppedAt"]), "stoppedAt: {report}");
    assert!(
        report.get("lastNodeExecuted").is_none_or(Value::is_string),
        "lastNodeExecuted: {report}"
    );
    assert!(run_data_is_valid, "runData: {report}");
    assert!(
        report
            .get("error")
            .is_none_or(|error| error["message"].is_string()),
        "error: {report}"
    );
}

/// Serves `router` on a free local port and returns its base URL.
pub async fn serve(router: Router) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, router).await.unwrap() });
    format!("http://{address}")
}

/// Loads `workflow` with the real nodes and HTTP client, serves it, and returns its base URL.
pub async fn start_runner(workflow: Workflow, reporter: Arc<dyn ExecutionReporter>) -> String {
    let engine = Engine::load(
        workflow,
        &nodes::registry(),
        Arc::new(ReqwestClient::default()),
        reporter,
    )
    .unwrap();
    serve(server::router(Arc::new(engine))).await
}

/// Sends every execution summary to a channel, so a test can wait until an execution ends.
pub struct ChannelReporter(mpsc::UnboundedSender<ExecutionSummary>);

impl ChannelReporter {
    pub fn new() -> (Arc<Self>, Finished) {
        let (sender, receiver) = mpsc::unbounded_channel();
        (Arc::new(Self(sender)), Finished(receiver))
    }
}

#[async_trait]
impl ExecutionReporter for ChannelReporter {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        // The test may have stopped listening. The summary is then not needed.
        let _ = self.0.send(summary);
        Ok(())
    }
}

/// The receiving end of a `ChannelReporter`.
pub struct Finished(mpsc::UnboundedReceiver<ExecutionSummary>);

impl Finished {
    /// Waits up to five seconds for the next execution to end.
    pub async fn next(&mut self) -> ExecutionSummary {
        tokio::time::timeout(Duration::from_secs(5), self.0.recv())
            .await
            .expect("no execution finished within five seconds")
            .expect("the reporter was dropped")
    }
}
