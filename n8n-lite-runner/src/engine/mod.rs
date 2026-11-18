//! Loads a workflow and runs one execution per webhook call.
//!
//! The engine runs nodes one at a time, depth first, in the order of n8n's `v1`
//! execution order: the branch on output 0 finishes before the branch on output 1.
//! A node with no items on an output does not start the nodes connected to it.
//! The engine is immutable after loading, so many executions can run at once.

mod context;
mod response;
mod runs;
#[cfg(test)]
mod tests;

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::SystemTime;

use tokio::sync::oneshot;

use crate::http::{HttpClient, HttpResponse};
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, TriggerNode};
use crate::registry::{NodeRegistry, RegistryError};
use crate::reporter::{ExecutionReporter, ExecutionStatus, ExecutionSummary, RunSource, log_line};
use crate::webhook::{ResponseMode, WebhookRequest, WebhookSpec};
use crate::workflow::Workflow;
use context::EngineContext;
use response::ResponseSlot;
use runs::{RunLog, Started};

pub struct Engine {
    workflow: Workflow,
    trigger_name: String,
    trigger: Box<dyn TriggerNode>,
    /// The enabled action nodes. Disabled nodes are absent and pass their input through.
    actions: HashMap<String, Box<dyn ActionNode>>,
    http: Arc<dyn HttpClient>,
    reporter: Arc<dyn ExecutionReporter>,
    answer_timing: AnswerTiming,
    next_execution: AtomicU64,
}

/// When the engine sends the HTTP answer of an execution.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum AnswerTiming {
    /// As soon as the response mode allows: when the call arrives, when the
    /// last node finishes, or when Respond to Webhook runs.
    #[default]
    Immediate,
    /// After the run ends and the reporter returns, in every response mode. For
    /// hosts that may stop the process after the answer, such as AWS Lambda.
    AfterReport,
}

#[derive(Debug, thiserror::Error)]
pub enum LoadError {
    #[error(transparent)]
    Node(#[from] RegistryError),
    #[error("the workflow has no enabled trigger node")]
    NoTrigger,
    #[error("the workflow has more than one trigger node: {0:?}")]
    MultipleTriggers(Vec<String>),
    #[error("node `{from}` connects to the unknown node `{to}`")]
    UnknownTarget { from: String, to: String },
    #[error("the workflow contains a loop through node `{0}`")]
    Loop(String),
}

#[derive(Debug, thiserror::Error)]
#[error("node `{node}` failed: {source}")]
struct ExecutionError {
    node: String,
    source: NodeError,
}

/// A node waiting to run, with the items it receives and the run that produced them.
struct PendingRun {
    node: String,
    input: Vec<Item>,
    source: RunSource,
}

impl Engine {
    pub fn load(
        workflow: Workflow,
        registry: &NodeRegistry,
        http: Arc<dyn HttpClient>,
        reporter: Arc<dyn ExecutionReporter>,
    ) -> Result<Self, LoadError> {
        check_targets(&workflow)?;
        if let Some(node) = find_loop(&workflow) {
            return Err(LoadError::Loop(node));
        }
        let (mut triggers, actions) = create_nodes(&workflow, registry)?;
        if triggers.len() > 1 {
            let names = triggers.into_iter().map(|(name, _)| name).collect();
            return Err(LoadError::MultipleTriggers(names));
        }
        let (trigger_name, trigger) = triggers.pop().ok_or(LoadError::NoTrigger)?;
        Ok(Self {
            workflow,
            trigger_name,
            trigger,
            actions,
            http,
            reporter,
            answer_timing: AnswerTiming::default(),
            next_execution: AtomicU64::new(1),
        })
    }

    pub fn with_answer_timing(self, answer_timing: AnswerTiming) -> Self {
        Self {
            answer_timing,
            ..self
        }
    }

    /// The endpoint that the HTTP server must route to this engine.
    pub fn webhook(&self) -> &WebhookSpec {
        self.trigger.webhook()
    }

    /// Starts an execution on the tokio runtime and returns the receiver of its HTTP answer.
    pub fn spawn(self: &Arc<Self>, request: WebhookRequest) -> oneshot::Receiver<HttpResponse> {
        let (sender, receiver) = oneshot::channel();
        let engine = Arc::clone(self);
        tokio::spawn(async move { engine.execute(request, sender).await });
        receiver
    }

    /// Runs one execution to the end and reports it.
    ///
    /// `response` receives exactly one answer. When it is sent depends on the
    /// response mode of the trigger and on the answer timing.
    pub async fn execute(
        &self,
        request: WebhookRequest,
        response: oneshot::Sender<HttpResponse>,
    ) -> ExecutionSummary {
        let started_at = SystemTime::now();
        let execution_id = self.next_execution_id();
        let mode = self.webhook().response_mode;
        let context = EngineContext::new(
            execution_id.clone(),
            Arc::clone(&self.http),
            mode,
            ResponseSlot::new(response, self.answer_timing == AnswerTiming::AfterReport),
        );
        if mode == ResponseMode::OnReceived {
            context
                .response()
                .send_default(response::workflow_started());
        }

        let mut log = RunLog::default();
        let outcome = self.run(&context, &request, &mut log).await;
        context.response().send_default(match &outcome {
            Err(_) => response::workflow_failed(),
            Ok(last) if mode == ResponseMode::LastNode => {
                response::first_item(context.first_item_of(last))
            }
            Ok(_) => response::empty(),
        });

        let summary = ExecutionSummary {
            execution_id,
            workflow_id: self.workflow.id.clone(),
            status: match outcome {
                Ok(_) => ExecutionStatus::Success,
                Err(_) => ExecutionStatus::Error,
            },
            started_at,
            finished_at: SystemTime::now(),
            error: outcome.err().map(|error| error.to_string()),
            runs: log.into_runs(),
        };
        if let Err(error) = self.reporter.report(summary.clone()).await {
            log_line(&format!("execution {}: {error}", summary.execution_id));
        }
        context.response().release();
        summary
    }

    /// Runs the trigger and the nodes after it, records every run in `log`, and
    /// returns the name of the last node that ran.
    async fn run(
        &self,
        context: &EngineContext,
        request: &WebhookRequest,
        log: &mut RunLog,
    ) -> Result<String, ExecutionError> {
        let started = Started::now();
        let trigger_output = vec![self.trigger.emit(request)];
        let run_index = log.record(&self.trigger_name, None, started, Ok(&trigger_output));
        context.record(&self.trigger_name, &trigger_output);
        let mut pending = self.next_runs(&self.trigger_name, run_index, &trigger_output);
        let mut last = self.trigger_name.clone();

        while let Some(PendingRun {
            node,
            input,
            source,
        }) = pending.pop()
        {
            let started = Started::now();
            let result = self.run_node(context, &node, input).await;
            let recorded = result.as_ref().map_err(|error| error.source.to_string());
            let run_index = log.record(&node, Some(source), started, recorded);
            let output = result?;
            context.record(&node, &output);
            pending.extend(self.next_runs(&node, run_index, &output));
            last = node;
        }
        Ok(last)
    }

    async fn run_node(
        &self,
        context: &EngineContext,
        node: &str,
        input: Vec<Item>,
    ) -> Result<NodeOutput, ExecutionError> {
        match self.actions.get(node) {
            Some(action) => action
                .execute(context, input)
                .await
                .map_err(|source| ExecutionError {
                    node: node.to_string(),
                    source,
                }),
            None => Ok(vec![input]),
        }
    }

    /// Returns the runs that `output` of run `run_index` of `node` starts, in
    /// reverse order for the stack in `run`.
    fn next_runs(&self, node: &str, run_index: usize, output: &NodeOutput) -> Vec<PendingRun> {
        let mut runs: Vec<PendingRun> = output
            .iter()
            .enumerate()
            .filter(|(_, items)| !items.is_empty())
            .flat_map(|(index, items)| {
                self.workflow
                    .targets(node, index)
                    .iter()
                    .map(move |target| PendingRun {
                        node: target.node.clone(),
                        input: items.clone(),
                        source: RunSource {
                            node: node.to_string(),
                            output: index,
                            run_index,
                        },
                    })
            })
            .collect();
        runs.reverse();
        runs
    }

    fn next_execution_id(&self) -> String {
        self.next_execution
            .fetch_add(1, Ordering::Relaxed)
            .to_string()
    }
}

type Triggers = Vec<(String, Box<dyn TriggerNode>)>;
type Actions = HashMap<String, Box<dyn ActionNode>>;

/// Builds every enabled node. Disabled nodes are skipped, so their type does not need to be supported.
fn create_nodes(
    workflow: &Workflow,
    registry: &NodeRegistry,
) -> Result<(Triggers, Actions), LoadError> {
    let mut triggers = Triggers::new();
    let mut actions = Actions::new();
    for definition in workflow.nodes.iter().filter(|node| !node.disabled) {
        match registry.create(definition)? {
            NodeInstance::Trigger(node) => triggers.push((definition.name.clone(), node)),
            NodeInstance::Action(node) => {
                actions.insert(definition.name.clone(), node);
            }
        }
    }
    Ok((triggers, actions))
}

fn check_targets(workflow: &Workflow) -> Result<(), LoadError> {
    match workflow
        .edges()
        .find(|(_, target)| workflow.node(&target.node).is_none())
    {
        Some((from, target)) => Err(LoadError::UnknownTarget {
            from: from.to_string(),
            to: target.node.clone(),
        }),
        None => Ok(()),
    }
}

/// Returns the name of a node that can reach itself through connections, if any.
fn find_loop(workflow: &Workflow) -> Option<String> {
    let mut finished = HashSet::new();
    workflow
        .nodes
        .iter()
        .find_map(|node| visit(workflow, &node.name, &mut Vec::new(), &mut finished))
}

fn visit<'w>(
    workflow: &'w Workflow,
    node: &'w str,
    path: &mut Vec<&'w str>,
    finished: &mut HashSet<&'w str>,
) -> Option<String> {
    if path.contains(&node) {
        return Some(node.to_string());
    }
    if finished.contains(node) {
        return None;
    }
    path.push(node);
    let found = workflow
        .successors(node)
        .find_map(|next| visit(workflow, &next.node, path, finished));
    path.pop();
    finished.insert(node);
    found
}
