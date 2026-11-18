//! Reports finished executions to the n8n-lite module of an n8n instance.
//!
//! Follows `liteRunReportSchema` in n8n's `n8n-lite.schemas.ts`. The runner
//! sends one `POST` per execution to the report URL, with the report token as a
//! bearer token. n8n stores the report as an execution of the workflow.

use std::collections::BTreeMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::node::NodeOutput;
use crate::reporter::{ExecutionReporter, ExecutionStatus, ExecutionSummary, NodeRun, ReportError};

/// Where and how to send reports. n8n writes these values into the runner config.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct ReportTarget {
    pub url: String,
    /// An HMAC of the workflow ID that only the n8n instance can create.
    pub token: String,
}

pub struct N8nReporter {
    client: reqwest::Client,
    target: ReportTarget,
}

impl N8nReporter {
    pub fn new(target: ReportTarget) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self { client, target }
    }
}

#[async_trait]
impl ExecutionReporter for N8nReporter {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        let body = report_body(&summary)?;
        let response = self
            .client
            .post(&self.target.url)
            .bearer_auth(&self.target.token)
            .json(&body)
            .send()
            .await
            .map_err(|error| report_error(format!("n8n is not reachable: {error}")))?;
        let status = response.status();
        if status.is_success() {
            return Ok(());
        }
        let text = response.text().await.unwrap_or_default();
        Err(report_error(format!("n8n answered {status}: {text}")))
    }
}

/// Builds the request body in the shape of `liteRunReportSchema`.
pub fn report_body(summary: &ExecutionSummary) -> Result<Value, ReportError> {
    let workflow_id = summary
        .workflow_id
        .as_deref()
        .filter(|id| !id.is_empty())
        .ok_or_else(|| report_error("the workflow has no ID".into()))?;
    let mut body = json!({
        "workflowId": workflow_id,
        "status": match summary.status {
            ExecutionStatus::Success => "success",
            ExecutionStatus::Error => "error",
        },
        "startedAt": iso_date(summary.started_at),
        "stoppedAt": iso_date(summary.finished_at),
        "runData": run_data(&summary.runs),
    });
    if let Some(last) = summary.runs.last() {
        body["lastNodeExecuted"] = json!(last.node);
    }
    if let Some(message) = &summary.error {
        body["error"] = json!({ "message": message });
    }
    Ok(body)
}

/// Groups the runs by node, in the shape of n8n's `IRunData`.
fn run_data(runs: &[NodeRun]) -> BTreeMap<&str, Vec<Value>> {
    runs.iter()
        .enumerate()
        .fold(BTreeMap::new(), |mut data, (execution_index, run)| {
            data.entry(run.node.as_str())
                .or_default()
                .push(task_data(run, execution_index));
            data
        })
}

/// Converts one run to n8n's `ITaskData`. A failed run has `error` instead of `data`.
fn task_data(run: &NodeRun, execution_index: usize) -> Value {
    let source: Vec<Value> = run
        .source
        .iter()
        .map(|source| {
            json!({
                "previousNode": source.node,
                "previousNodeOutput": source.output,
                "previousNodeRun": source.run_index,
            })
        })
        .collect();
    let mut task = json!({
        "startTime": epoch_millis(run.started_at),
        "executionTime": run.duration.as_millis() as u64,
        "executionIndex": execution_index,
        "executionStatus": if run.result.is_ok() { "success" } else { "error" },
        "source": source,
    });
    match &run.result {
        Ok(output) => task["data"] = json!({ "main": main_data(output) }),
        Err(message) => task["error"] = json!({ "message": message }),
    }
    task
}

/// Wraps each item as `{ "json": ... }`, one list per output.
fn main_data(output: &NodeOutput) -> Vec<Vec<Value>> {
    output
        .iter()
        .map(|items| {
            items
                .iter()
                .map(|item| json!({ "json": item.json }))
                .collect()
        })
        .collect()
}

/// Formats a time as UTC with milliseconds, for example `2026-11-18T10:25:04.123Z`, as zod's `datetime()` expects.
fn iso_date(time: SystemTime) -> String {
    humantime::format_rfc3339_millis(time).to_string()
}

fn epoch_millis(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn report_error(message: String) -> ReportError {
    ReportError { message }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::reporter::RunSource;
    use crate::testing::items;

    fn at(millis: u64) -> SystemTime {
        UNIX_EPOCH + Duration::from_millis(millis)
    }

    fn run(
        node: &str,
        run_index: usize,
        source: Option<(&str, usize)>,
        result: Result<NodeOutput, String>,
    ) -> NodeRun {
        NodeRun {
            node: node.into(),
            run_index,
            started_at: at(1_000),
            duration: Duration::from_millis(3),
            source: source.map(|(node, output)| RunSource {
                node: node.into(),
                output,
                run_index: 0,
            }),
            result,
        }
    }

    fn summary(
        status: ExecutionStatus,
        error: Option<&str>,
        runs: Vec<NodeRun>,
    ) -> ExecutionSummary {
        ExecutionSummary {
            execution_id: "1".into(),
            workflow_id: Some("wf1".into()),
            status,
            started_at: at(1_000),
            finished_at: at(1_250),
            error: error.map(String::from),
            runs,
        }
    }

    #[test]
    fn reports_a_successful_execution() {
        let runs = vec![
            run(
                "Webhook",
                0,
                None,
                Ok(vec![items(&[json!({ "body": {} })])]),
            ),
            run(
                "If",
                0,
                Some(("Webhook", 0)),
                Ok(vec![vec![], items(&[json!({ "a": 1 })])]),
            ),
            run(
                "Set",
                0,
                Some(("If", 1)),
                Ok(vec![items(&[json!({ "a": 2 })])]),
            ),
        ];

        let body = report_body(&summary(ExecutionStatus::Success, None, runs)).unwrap();

        assert_eq!(
            body,
            json!({
                "workflowId": "wf1",
                "status": "success",
                "startedAt": "1970-01-01T00:00:01.000Z",
                "stoppedAt": "1970-01-01T00:00:01.250Z",
                "lastNodeExecuted": "Set",
                "runData": {
                    "Webhook": [{
                        "startTime": 1000, "executionTime": 3, "executionIndex": 0,
                        "executionStatus": "success", "source": [],
                        "data": { "main": [[{ "json": { "body": {} } }]] }
                    }],
                    "If": [{
                        "startTime": 1000, "executionTime": 3, "executionIndex": 1,
                        "executionStatus": "success",
                        "source": [{ "previousNode": "Webhook", "previousNodeOutput": 0, "previousNodeRun": 0 }],
                        "data": { "main": [[], [{ "json": { "a": 1 } }]] }
                    }],
                    "Set": [{
                        "startTime": 1000, "executionTime": 3, "executionIndex": 2,
                        "executionStatus": "success",
                        "source": [{ "previousNode": "If", "previousNodeOutput": 1, "previousNodeRun": 0 }],
                        "data": { "main": [[{ "json": { "a": 2 } }]] }
                    }]
                }
            })
        );
    }

    #[test]
    fn reports_a_failed_execution() {
        let runs = vec![
            run("Webhook", 0, None, Ok(vec![items(&[json!({})])])),
            run(
                "Call API",
                0,
                Some(("Webhook", 0)),
                Err("request failed with status code 500".into()),
            ),
        ];
        let error = "node `Call API` failed: request failed with status code 500";

        let body = report_body(&summary(ExecutionStatus::Error, Some(error), runs)).unwrap();

        assert_eq!(body["status"], "error");
        assert_eq!(body["error"], json!({ "message": error }));
        assert_eq!(body["lastNodeExecuted"], "Call API");
        let failed = &body["runData"]["Call API"][0];
        assert_eq!(failed["executionStatus"], "error");
        assert_eq!(
            failed["error"]["message"],
            "request failed with status code 500"
        );
        assert!(failed.get("data").is_none());
    }

    #[test]
    fn lists_repeated_runs_of_a_node_in_order() {
        let runs = vec![
            run("Webhook", 0, None, Ok(vec![items(&[json!({})])])),
            run("Log", 0, Some(("Webhook", 0)), Ok(vec![vec![]])),
            run("Log", 1, Some(("Webhook", 0)), Ok(vec![vec![]])),
        ];

        let body = report_body(&summary(ExecutionStatus::Success, None, runs)).unwrap();

        let indexes: Vec<&Value> = body["runData"]["Log"]
            .as_array()
            .unwrap()
            .iter()
            .map(|task| &task["executionIndex"])
            .collect();
        assert_eq!(indexes, [&json!(1), &json!(2)]);
    }

    #[test]
    fn requires_a_workflow_id() {
        let mut summary = summary(ExecutionStatus::Success, None, Vec::new());
        summary.workflow_id = None;
        assert!(report_body(&summary).is_err());
    }
}
