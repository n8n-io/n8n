//! Runs the "Lead router" sample workflow, exported from n8n, over real HTTP on localhost.
//!
//! The workflow normalizes a lead, sends hot leads (score 50 or more) to sales
//! and the rest to nurture. Nurture leads are persisted with an HTTP call after
//! the webhook answer is sent.

mod common;

use std::sync::Arc;

use axum::routing::post;
use axum::{Json, Router};
use n8n_mini::engine::Engine;
use n8n_mini::n8n_report::{N8nReporter, ReportTarget};
use n8n_mini::nodes;
use n8n_mini::reporter::{ExecutionStatus, LogReporter, Reporters};
use n8n_mini::workflow::Workflow;
use serde_json::{Value, json};
use tokio::sync::mpsc;

use common::{
    ChannelReporter, Finished, REPORT_PATH, REPORT_TOKEN, ReceivedReport,
    assert_matches_report_schema, n8n_stub, next_report, serve, start_runner,
};

const SAMPLE: &str = include_str!("fixtures/sample-workflow.json");
/// The same workflow with a Slack node that notifies sales of hot leads.
const SAMPLE_WITH_SLACK: &str = include_str!("fixtures/sample-workflow-slack.json");

/// Loads the sample and points the "Persist lead" node at `url` instead of webhook.site.
fn sample_workflow(url: &str) -> Workflow {
    let mut workflow: Value = serde_json::from_str(SAMPLE).unwrap();
    let nodes = workflow["nodes"].as_array_mut().unwrap();
    let persist = nodes
        .iter_mut()
        .find(|node| node["name"] == "Persist lead")
        .expect("the sample has a Persist lead node");
    persist["parameters"]["url"] = json!(url);
    serde_json::from_value(workflow).unwrap()
}

/// A stand-in for the lead store. It sends the body of every `POST /leads` to the returned channel.
fn lead_store() -> (Router, mpsc::UnboundedReceiver<Value>) {
    let (sender, receiver) = mpsc::unbounded_channel();
    let router = Router::new().route(
        "/leads",
        post(move |Json(body): Json<Value>| async move {
            let _ = sender.send(body);
            Json(json!({ "stored": true }))
        }),
    );
    (router, receiver)
}

struct Harness {
    runner: String,
    finished: Finished,
    stored: mpsc::UnboundedReceiver<Value>,
    reports: mpsc::UnboundedReceiver<ReceivedReport>,
}

impl Harness {
    /// Starts the lead store, the n8n stub and the runner. The runner reports to
    /// n8n first, so a finished execution has already sent its report.
    async fn start() -> Self {
        let (store, stored) = lead_store();
        let store = serve(store).await;
        let (n8n, reports) = n8n_stub();
        let n8n = serve(n8n).await;
        let (finish_signal, finished) = ChannelReporter::new();
        let reporter = Reporters(vec![
            Arc::new(N8nReporter::new(ReportTarget {
                url: format!("{n8n}{REPORT_PATH}"),
                token: REPORT_TOKEN.into(),
            })),
            finish_signal,
        ]);
        let workflow = sample_workflow(&format!("{store}/leads"));
        let runner = start_runner(workflow, Arc::new(reporter)).await;
        Self {
            runner,
            finished,
            stored,
            reports,
        }
    }

    async fn post_lead(&self, lead: Value) -> (u16, Value) {
        let response = reqwest::Client::new()
            .post(format!("{}/webhook/leads", self.runner))
            .json(&lead)
            .send()
            .await
            .unwrap();
        (response.status().as_u16(), response.json().await.unwrap())
    }
}

#[test]
fn loads_the_exported_file_unchanged() {
    let workflow = Workflow::from_json(SAMPLE).unwrap();
    let engine = Engine::load(
        workflow,
        &nodes::registry(&nodes::Credentials::default()),
        Arc::new(n8n_mini::client::ReqwestClient::default()),
        Arc::new(LogReporter),
    )
    .unwrap();

    assert_eq!(engine.webhook().path, "leads");
}

fn load_with_slack(credentials: &nodes::Credentials) -> Result<Engine, String> {
    Engine::load(
        Workflow::from_json(SAMPLE_WITH_SLACK).unwrap(),
        &nodes::registry(credentials),
        Arc::new(n8n_mini::client::ReqwestClient::default()),
        Arc::new(LogReporter),
    )
    .map_err(|error| error.to_string())
}

#[test]
fn loads_the_slack_variant_only_with_a_token() {
    let with_token = nodes::Credentials {
        slack_token: Some("xoxb-test".into()),
    };

    assert!(load_with_slack(&with_token).is_ok());
    let error = load_with_slack(&nodes::Credentials::default())
        .err()
        .unwrap();
    assert!(
        error.contains("Notify sales") && error.contains("LITE_SLACK_TOKEN"),
        "{error}"
    );
}

#[tokio::test]
async fn routes_a_hot_lead_to_sales() {
    let mut harness = Harness::start().await;

    let (status, body) = harness
        .post_lead(json!({ "email": "ada@example.com", "score": 80 }))
        .await;

    assert_eq!(status, 200);
    assert_eq!(
        body,
        json!({ "email": "ada@example.com", "score": 80, "source": "n8n-lite", "route": "sales" })
    );
    assert_eq!(
        harness.finished.next().await.status,
        ExecutionStatus::Success
    );
    assert!(
        harness.stored.try_recv().is_err(),
        "the sales branch must not persist the lead"
    );
}

#[tokio::test]
async fn routes_a_cold_lead_to_nurture_and_persists_it() {
    let mut harness = Harness::start().await;

    // A score sent as text. The Normalize node converts it to a number.
    let (status, body) = harness
        .post_lead(json!({ "email": "bob@example.com", "score": "30" }))
        .await;

    assert_eq!(status, 200);
    assert_eq!(
        body,
        json!({ "email": "bob@example.com", "score": 30, "source": "n8n-lite", "route": "nurture" })
    );
    // The answer is sent before Persist lead runs, so wait until the execution ends.
    let summary = harness.finished.next().await;
    assert_eq!(
        summary.status,
        ExecutionStatus::Success,
        "{:?}",
        summary.error
    );
    assert_eq!(
        harness.stored.try_recv().unwrap(),
        json!({ "email": "bob@example.com", "route": "nurture", "source": "n8n-lite" })
    );
}

#[tokio::test]
async fn reports_each_execution_to_n8n() {
    let mut harness = Harness::start().await;

    harness
        .post_lead(json!({ "email": "bob@example.com", "score": 30 }))
        .await;
    let report = next_report(&mut harness.reports).await;

    assert_eq!(report.authorization.as_deref(), Some("Bearer test-token"));
    let body = &report.body;
    assert_matches_report_schema(body);
    assert_eq!(body["workflowId"], "Ae8lrPpFGeSuJqN4");
    assert_eq!(body["status"], "success");
    assert_eq!(body["lastNodeExecuted"], "Persist lead");
    assert!(body.get("error").is_none());

    let run_data = body["runData"].as_object().unwrap();
    let mut runs: Vec<(&str, u64)> = run_data
        .iter()
        .map(|(node, runs)| (node.as_str(), runs[0]["executionIndex"].as_u64().unwrap()))
        .collect();
    runs.sort_by_key(|(_, execution_index)| *execution_index);
    let nodes: Vec<&str> = runs.iter().map(|(node, _)| *node).collect();
    assert_eq!(
        nodes,
        [
            "Webhook",
            "Normalize",
            "Hot lead?",
            "Nurture",
            "Respond nurture",
            "Persist lead"
        ]
    );
    assert_eq!(
        run_data["Hot lead?"][0]["data"]["main"][1][0]["json"],
        json!({ "email": "bob@example.com", "score": 30, "source": "n8n-lite" })
    );
    assert_eq!(
        run_data["Nurture"][0]["source"],
        json!([{ "previousNode": "Hot lead?", "previousNodeOutput": 1, "previousNodeRun": 0 }])
    );
}
