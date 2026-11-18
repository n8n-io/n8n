//! The summary of a finished execution, and the reporters that receive it.

use std::io::Write;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use async_trait::async_trait;

use crate::node::NodeOutput;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionStatus {
    Success,
    Error,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExecutionSummary {
    pub execution_id: String,
    pub workflow_id: Option<String>,
    pub status: ExecutionStatus,
    pub started_at: SystemTime,
    pub finished_at: SystemTime,
    /// The error message when `status` is `Error`.
    pub error: Option<String>,
    /// Every node run, in the order the engine ran them. The trigger run is first.
    pub runs: Vec<NodeRun>,
}

/// One run of one node.
#[derive(Debug, Clone, PartialEq)]
pub struct NodeRun {
    pub node: String,
    /// The position of this run among the runs of the same node, starting at 0.
    pub run_index: usize,
    pub started_at: SystemTime,
    pub duration: Duration,
    /// The run whose output was this run's input. `None` for the trigger.
    pub source: Option<RunSource>,
    /// The items on each output, or the error message when the node failed.
    pub result: Result<NodeOutput, String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunSource {
    pub node: String,
    pub output: usize,
    pub run_index: usize,
}

#[derive(Debug, thiserror::Error)]
#[error("cannot report execution: {message}")]
pub struct ReportError {
    pub message: String,
}

/// The engine calls `report` once for each execution, after the last node finishes or fails.
#[async_trait]
pub trait ExecutionReporter: Send + Sync {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError>;
}

/// Prints one line per execution to standard error.
pub struct LogReporter;

#[async_trait]
impl ExecutionReporter for LogReporter {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        let duration = summary
            .finished_at
            .duration_since(summary.started_at)
            .unwrap_or_default();
        let outcome = match (&summary.status, &summary.error) {
            (ExecutionStatus::Success, _) => "success".to_string(),
            (ExecutionStatus::Error, Some(error)) => format!("error: {error}"),
            (ExecutionStatus::Error, None) => "error".to_string(),
        };
        log_line(&format!(
            "execution {} finished in {} ms, {outcome}",
            summary.execution_id,
            duration.as_millis()
        ));
        Ok(())
    }
}

/// Writes one line to standard error. Unlike `eprintln!`, it does not panic when
/// standard error is closed, so a missing log never stops an execution or its report.
pub fn log_line(line: &str) {
    let _ = writeln!(std::io::stderr(), "{line}");
}

/// Passes each summary to every reporter in order. Returns the first error after all reporters ran.
pub struct Reporters(pub Vec<Arc<dyn ExecutionReporter>>);

#[async_trait]
impl ExecutionReporter for Reporters {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        let mut first_error = None;
        for reporter in &self.0 {
            if let Err(error) = reporter.report(summary.clone()).await {
                first_error.get_or_insert(error);
            }
        }
        first_error.map_or(Ok(()), Err)
    }
}
