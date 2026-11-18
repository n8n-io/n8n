//! Engine tests with mock nodes. Each mock reads its settings from the node parameters.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use async_trait::async_trait;
use serde_json::{Map, Value, json};
use tokio::sync::oneshot::error::TryRecvError;
use tokio::sync::{Barrier, Notify, Semaphore};

use super::*;
use crate::context::{ExecutionContext, RespondError};
use crate::http::{Body, Headers, HttpMethod};
use crate::node::NodeType;
use crate::reporter::ReportError;
use crate::testing::{MockReporter, NoHttp, item};
use crate::webhook::WebhookSpec;
use crate::workflow::NodeDefinition;

// Mock node types

type Build = Box<dyn Fn(&NodeDefinition) -> NodeInstance + Send + Sync>;

struct MockType {
    name: &'static str,
    build: Build,
}

impl NodeType for MockType {
    fn name(&self) -> &'static str {
        self.name
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        Ok((self.build)(definition))
    }
}

fn mock_type(
    name: &'static str,
    build: impl Fn(&NodeDefinition) -> NodeInstance + Send + Sync + 'static,
) -> Box<dyn NodeType> {
    Box::new(MockType {
        name,
        build: Box::new(build),
    })
}

fn action(node: impl ActionNode + 'static) -> NodeInstance {
    NodeInstance::Action(Box::new(node))
}

fn parameter(definition: &NodeDefinition, name: &str) -> Value {
    definition.parameters.get(name).cloned().unwrap_or_default()
}

/// Emits one item `{ "body": <request body> }`.
struct Trigger(WebhookSpec);

impl TriggerNode for Trigger {
    fn webhook(&self) -> &WebhookSpec {
        &self.0
    }

    fn emit(&self, request: &WebhookRequest) -> Vec<Item> {
        vec![item(json!({ "body": request.body }))]
    }
}

/// Sets the `field` parameter of every item to the evaluated `value` parameter.
struct SetField {
    field: String,
    value: Value,
}

#[async_trait]
impl ActionNode for SetField {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let output = input
            .into_iter()
            .enumerate()
            .map(|(index, mut item)| {
                let value = context.evaluate(&self.value, &item, index)?;
                item.json.insert(self.field.clone(), value);
                Ok(item)
            })
            .collect::<Result<_, NodeError>>()?;
        Ok(vec![output])
    }
}

/// Sends items whose evaluated `condition` is `true` to output 0, the rest to output 1.
struct Route {
    condition: Value,
}

#[async_trait]
impl ActionNode for Route {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let decisions = input
            .iter()
            .enumerate()
            .map(|(index, item)| context.evaluate(&self.condition, item, index))
            .collect::<Result<Vec<_>, _>>()?;
        let (matched, other): (Vec<_>, Vec<_>) = input
            .into_iter()
            .zip(decisions)
            .partition(|(_, decision)| *decision == Value::Bool(true));
        let items = |pairs: Vec<(Item, Value)>| pairs.into_iter().map(|(item, _)| item).collect();
        Ok(vec![items(matched), items(other)])
    }
}

/// Answers the webhook call with the JSON of the first item.
struct Respond;

#[async_trait]
impl ActionNode for Respond {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let first = input.first().cloned().unwrap_or_default();
        context.respond(HttpResponse {
            status: 200,
            headers: Headers::new(),
            body: Body::Json(Value::Object(first.json)),
        })?;
        Ok(vec![input])
    }
}

struct Fail;

#[async_trait]
impl ActionNode for Fail {
    async fn execute(
        &self,
        _: &dyn ExecutionContext,
        _: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        Err(NodeError::Failed("boom".into()))
    }
}

/// Appends its node name to a shared log, then passes the items through.
struct Mark {
    name: String,
    log: Arc<Mutex<Vec<String>>>,
}

#[async_trait]
impl ActionNode for Mark {
    async fn execute(
        &self,
        _: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        self.log.lock().unwrap().push(self.name.clone());
        Ok(vec![input])
    }
}

/// Waits until a fixed number of executions reach this node at the same time.
struct Wait(Arc<Barrier>);

#[async_trait]
impl ActionNode for Wait {
    async fn execute(
        &self,
        _: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        self.0.wait().await;
        Ok(vec![input])
    }
}

fn base_types() -> Vec<Box<dyn NodeType>> {
    vec![
        mock_type("test.trigger", |definition| {
            NodeInstance::Trigger(Box::new(Trigger(WebhookSpec {
                method: HttpMethod::Post,
                path: "test".into(),
                response_mode: serde_json::from_value(parameter(definition, "responseMode"))
                    .unwrap(),
            })))
        }),
        mock_type("test.set", |definition| {
            action(SetField {
                field: parameter(definition, "field").as_str().unwrap().to_string(),
                value: parameter(definition, "value"),
            })
        }),
        mock_type("test.route", |definition| {
            action(Route {
                condition: parameter(definition, "condition"),
            })
        }),
        mock_type("test.respond", |_| action(Respond)),
        mock_type("test.fail", |_| action(Fail)),
    ]
}

// Workflow and execution helpers

/// Builds a workflow from `(name, type, parameters)` nodes and `(from, output, to)` links.
fn workflow(nodes: &[(&str, &str, Value)], links: &[(&str, usize, &str)]) -> Workflow {
    let nodes: Vec<Value> = nodes
        .iter()
        .enumerate()
        .map(|(id, (name, node_type, parameters))| {
            json!({ "id": id.to_string(), "name": name, "type": node_type,
                    "typeVersion": 1, "position": [0, 0], "parameters": parameters })
        })
        .collect();
    let mut connections = Map::new();
    for (from, output, to) in links {
        let entry = connections
            .entry(from.to_string())
            .or_insert_with(|| json!({ "main": [] }));
        let main = entry["main"].as_array_mut().unwrap();
        main.resize(main.len().max(output + 1), Value::Null);
        if main[*output].is_null() {
            main[*output] = json!([]);
        }
        let target = json!({ "node": to, "type": "main", "index": 0 });
        main[*output].as_array_mut().unwrap().push(target);
    }
    let workflow =
        json!({ "id": "wf", "name": "test", "nodes": nodes, "connections": connections });
    serde_json::from_value(workflow).unwrap()
}

fn trigger(mode: &str) -> (&'static str, &'static str, Value) {
    ("Trigger", "test.trigger", json!({ "responseMode": mode }))
}

struct Harness {
    engine: Arc<Engine>,
    reporter: Arc<MockReporter>,
}

fn load(workflow: Workflow, extra_types: Vec<Box<dyn NodeType>>) -> Result<Harness, LoadError> {
    let registry = NodeRegistry::new(base_types().into_iter().chain(extra_types).collect());
    let reporter = Arc::new(MockReporter::default());
    let engine = Engine::load(workflow, &registry, Arc::new(NoHttp), reporter.clone())?;
    Ok(Harness {
        engine: Arc::new(engine),
        reporter,
    })
}

fn harness(workflow: Workflow) -> Harness {
    load(workflow, Vec::new()).unwrap()
}

fn request(body: Value) -> WebhookRequest {
    WebhookRequest {
        method: HttpMethod::Post,
        path: "test".into(),
        headers: Headers::new(),
        params: Default::default(),
        query: Default::default(),
        body,
    }
}

impl Harness {
    async fn call(&self, body: Value) -> (HttpResponse, ExecutionSummary) {
        let (sender, receiver) = oneshot::channel();
        let summary = self.engine.execute(request(body), sender).await;
        (receiver.await.unwrap(), summary)
    }
}

fn json_body(response: &HttpResponse) -> &Value {
    match &response.body {
        Body::Json(value) => value,
        other => panic!("expected a JSON body, got {other:?}"),
    }
}

// Loading

#[test]
fn rejects_invalid_workflows() {
    let cases = [
        (
            workflow(&[("A", "test.respond", json!({}))], &[]),
            "no enabled trigger",
        ),
        (
            workflow(
                &[
                    trigger("lastNode"),
                    (
                        "Other",
                        "test.trigger",
                        json!({ "responseMode": "lastNode" }),
                    ),
                ],
                &[],
            ),
            "more than one trigger",
        ),
        (
            workflow(
                &[
                    trigger("lastNode"),
                    ("A", "test.respond", json!({})),
                    ("B", "test.respond", json!({})),
                ],
                &[("Trigger", 0, "A"), ("A", 0, "B"), ("B", 0, "A")],
            ),
            "loop through node",
        ),
        (
            workflow(&[trigger("lastNode")], &[("Trigger", 0, "Ghost")]),
            "unknown node `Ghost`",
        ),
        (
            workflow(
                &[
                    trigger("lastNode"),
                    ("M", "n8n-nodes-base.merge", json!({})),
                ],
                &[],
            ),
            "unsupported type `n8n-nodes-base.merge`",
        ),
    ];
    for (workflow, expected) in cases {
        let error = load(workflow, Vec::new()).err().unwrap().to_string();
        assert!(
            error.contains(expected),
            "`{error}` does not contain `{expected}`"
        );
    }
}

// Executions

#[tokio::test]
async fn responds_with_the_output_of_the_last_node() {
    let harness = harness(workflow(
        &[
            trigger("lastNode"),
            (
                "Greet",
                "test.set",
                json!({ "field": "greeting", "value": "=Hello {{ $json.body.name }}" }),
            ),
        ],
        &[("Trigger", 0, "Greet")],
    ));

    let (response, summary) = harness.call(json!({ "name": "Ada" })).await;

    assert_eq!(response.status, 200);
    assert_eq!(
        json_body(&response),
        &json!({ "body": { "name": "Ada" }, "greeting": "Hello Ada" })
    );
    assert_eq!(summary.status, ExecutionStatus::Success);
    assert_eq!(summary.workflow_id.as_deref(), Some("wf"));
    assert_eq!(harness.reporter.summaries.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn runs_only_the_branch_that_receives_items() {
    let harness = harness(workflow(
        &[
            trigger("responseNode"),
            (
                "Is admin",
                "test.route",
                json!({ "condition": "={{ $json.body.admin }}" }),
            ),
            (
                "Yes",
                "test.set",
                json!({ "field": "branch", "value": "yes" }),
            ),
            (
                "No",
                "test.set",
                json!({ "field": "branch", "value": "no" }),
            ),
            ("Respond yes", "test.respond", json!({})),
            ("Respond no", "test.respond", json!({})),
        ],
        &[
            ("Trigger", 0, "Is admin"),
            ("Is admin", 0, "Yes"),
            ("Is admin", 1, "No"),
            ("Yes", 0, "Respond yes"),
            ("No", 0, "Respond no"),
        ],
    ));

    let (admin, summary) = harness.call(json!({ "admin": true })).await;
    let (guest, _) = harness.call(json!({ "admin": false })).await;

    // A second respond in the same execution would fail it, so success shows one branch ran.
    assert_eq!(summary.status, ExecutionStatus::Success);
    assert_eq!(json_body(&admin)["branch"], "yes");
    assert_eq!(json_body(&guest)["branch"], "no");
}

#[tokio::test]
async fn resolves_references_to_earlier_nodes() {
    let harness = harness(workflow(
        &[
            trigger("lastNode"),
            (
                "Replace",
                "test.set",
                json!({ "field": "body", "value": "replaced" }),
            ),
            (
                "Restore",
                "test.set",
                json!({ "field": "original", "value": "={{ $('Trigger').item.json.body.name }}" }),
            ),
        ],
        &[("Trigger", 0, "Replace"), ("Replace", 0, "Restore")],
    ));

    let (response, _) = harness.call(json!({ "name": "Ada" })).await;

    assert_eq!(
        json_body(&response),
        &json!({ "body": "replaced", "original": "Ada" })
    );
}

#[tokio::test]
async fn records_every_node_run_with_its_source() {
    let harness = harness(workflow(
        &[
            trigger("lastNode"),
            (
                "Is admin",
                "test.route",
                json!({ "condition": "={{ $json.body.admin }}" }),
            ),
            (
                "No",
                "test.set",
                json!({ "field": "branch", "value": "no" }),
            ),
            ("Fail", "test.fail", json!({})),
        ],
        &[
            ("Trigger", 0, "Is admin"),
            ("Is admin", 1, "No"),
            ("No", 0, "Fail"),
        ],
    ));

    let (_, summary) = harness.call(json!({ "admin": false })).await;

    let runs: Vec<_> = summary
        .runs
        .iter()
        .map(|run| {
            let source = run
                .source
                .as_ref()
                .map(|s| (s.node.as_str(), s.output, s.run_index));
            (run.node.as_str(), run.run_index, source)
        })
        .collect();
    assert_eq!(
        runs,
        [
            ("Trigger", 0, None),
            ("Is admin", 0, Some(("Trigger", 0, 0))),
            ("No", 0, Some(("Is admin", 1, 0))),
            ("Fail", 0, Some(("No", 0, 0))),
        ]
    );
    let trigger_item = item(json!({ "body": { "admin": false } }));
    assert_eq!(summary.runs[0].result, Ok(vec![vec![trigger_item.clone()]]));
    assert_eq!(summary.runs[1].result, Ok(vec![vec![], vec![trigger_item]]));
    assert_eq!(summary.runs[3].result, Err("boom".to_string()));
}

#[tokio::test]
async fn runs_branches_depth_first() {
    let log = Arc::new(Mutex::new(Vec::new()));
    let mark_log = Arc::clone(&log);
    let mark = mock_type("test.mark", move |definition| {
        action(Mark {
            name: definition.name.clone(),
            log: Arc::clone(&mark_log),
        })
    });
    let nodes = [
        trigger("lastNode"),
        ("A", "test.mark", json!({})),
        ("B", "test.mark", json!({})),
        ("C", "test.mark", json!({})),
        ("D", "test.mark", json!({})),
    ];
    let links = [
        ("Trigger", 0, "A"),
        ("A", 0, "B"),
        ("A", 0, "C"),
        ("B", 0, "D"),
    ];
    let harness = load(workflow(&nodes, &links), vec![mark]).unwrap();

    harness.call(json!({})).await;

    assert_eq!(*log.lock().unwrap(), ["A", "B", "D", "C"]);
}

#[tokio::test]
async fn passes_items_through_disabled_nodes() {
    let mut workflow = workflow(
        &[
            trigger("lastNode"),
            ("Disabled", "unsupported.type", json!({})),
            (
                "Set",
                "test.set",
                json!({ "field": "after", "value": true }),
            ),
        ],
        &[("Trigger", 0, "Disabled"), ("Disabled", 0, "Set")],
    );
    workflow.nodes[1].disabled = true;
    let harness = harness(workflow);

    let (response, _) = harness.call(json!(1)).await;

    assert_eq!(json_body(&response), &json!({ "body": 1, "after": true }));
}

#[tokio::test]
async fn answers_immediately_in_on_received_mode() {
    let harness = harness(workflow(
        &[trigger("onReceived"), ("Fail", "test.fail", json!({}))],
        &[("Trigger", 0, "Fail")],
    ));

    let (response, summary) = harness.call(json!({})).await;

    assert_eq!(response.status, 200);
    assert_eq!(
        json_body(&response),
        &json!({ "message": "Workflow was started" })
    );
    assert_eq!(summary.status, ExecutionStatus::Error);
}

#[tokio::test]
async fn reports_a_failed_execution() {
    let harness = harness(workflow(
        &[trigger("lastNode"), ("Fail", "test.fail", json!({}))],
        &[("Trigger", 0, "Fail")],
    ));

    let (response, summary) = harness.call(json!({})).await;

    assert_eq!(response.status, 500);
    assert_eq!(summary.status, ExecutionStatus::Error);
    assert_eq!(summary.error.as_deref(), Some("node `Fail` failed: boom"));
    assert_eq!(harness.reporter.summaries.lock().unwrap()[0], summary);
}

#[tokio::test]
async fn refuses_a_response_node_in_last_node_mode() {
    let harness = harness(workflow(
        &[trigger("lastNode"), ("Respond", "test.respond", json!({}))],
        &[("Trigger", 0, "Respond")],
    ));

    let (response, summary) = harness.call(json!({})).await;

    assert_eq!(response.status, 500);
    let expected = format!("node `Respond` failed: {}", RespondError::NotExpected);
    assert_eq!(summary.error, Some(expected));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn runs_executions_concurrently() {
    const EXECUTIONS: usize = 5;
    let barrier = Arc::new(Barrier::new(EXECUTIONS));
    let wait = mock_type("test.wait", move |_| action(Wait(Arc::clone(&barrier))));
    let nodes = [
        trigger("responseNode"),
        ("Wait", "test.wait", json!({})),
        ("Respond", "test.respond", json!({})),
    ];
    let links = [("Trigger", 0, "Wait"), ("Wait", 0, "Respond")];
    let harness = load(workflow(&nodes, &links), vec![wait]).unwrap();

    // Every execution blocks in `Wait` until all of them reach it, so a serial
    // engine would never finish.
    let receivers: Vec<_> = (0..EXECUTIONS)
        .map(|n| harness.engine.spawn(request(json!({ "n": n }))))
        .collect();
    for (n, receiver) in receivers.into_iter().enumerate() {
        let response = tokio::time::timeout(Duration::from_secs(5), receiver)
            .await
            .expect("executions did not run concurrently")
            .unwrap();
        assert_eq!(json_body(&response), &json!({ "body": { "n": n } }));
    }
}

// Answer timing

/// Signals when a report starts, then blocks until the test opens the gate.
struct GateReporter {
    started: Notify,
    gate: Semaphore,
    summaries: Mutex<Vec<ExecutionSummary>>,
}

impl GateReporter {
    /// Starts with a closed gate: `add_permits(1)` lets one report return.
    fn closed() -> Self {
        Self {
            started: Notify::new(),
            gate: Semaphore::new(0),
            summaries: Mutex::new(Vec::new()),
        }
    }
}

#[async_trait]
impl ExecutionReporter for GateReporter {
    async fn report(&self, summary: ExecutionSummary) -> Result<(), ReportError> {
        self.summaries.lock().unwrap().push(summary);
        self.started.notify_one();
        let _ = self.gate.acquire().await.unwrap();
        Ok(())
    }
}

/// Starts one call and waits until the engine is inside `report`.
async fn call_until_report(
    workflow: Workflow,
    timing: AnswerTiming,
) -> (oneshot::Receiver<HttpResponse>, Arc<GateReporter>) {
    let reporter = Arc::new(GateReporter::closed());
    let registry = NodeRegistry::new(base_types());
    let engine = Engine::load(workflow, &registry, Arc::new(NoHttp), reporter.clone())
        .unwrap()
        .with_answer_timing(timing);
    let receiver = Arc::new(engine).spawn(request(json!({ "name": "Ada" })));
    reporter.started.notified().await;
    (receiver, reporter)
}

/// Respond to Webhook runs first, and a node after it changes the item.
fn respond_then_set() -> Workflow {
    workflow(
        &[
            trigger("responseNode"),
            ("Respond", "test.respond", json!({})),
            (
                "After",
                "test.set",
                json!({ "field": "after", "value": true }),
            ),
        ],
        &[("Trigger", 0, "Respond"), ("Respond", 0, "After")],
    )
}

#[tokio::test]
async fn answers_before_the_report_by_default() {
    let (mut receiver, reporter) =
        call_until_report(respond_then_set(), AnswerTiming::Immediate).await;

    let response = receiver
        .try_recv()
        .expect("the answer was sent before the report");

    assert_eq!(json_body(&response), &json!({ "body": { "name": "Ada" } }));
    reporter.gate.add_permits(1);
}

#[tokio::test]
async fn holds_the_answer_until_the_run_ends_and_the_report_returns() {
    let (mut receiver, reporter) =
        call_until_report(respond_then_set(), AnswerTiming::AfterReport).await;

    assert_eq!(receiver.try_recv().unwrap_err(), TryRecvError::Empty);
    let summary = reporter.summaries.lock().unwrap()[0].clone();
    assert_eq!(
        summary.runs.last().unwrap().node,
        "After",
        "the run ended before the report"
    );

    reporter.gate.add_permits(1);
    let response = receiver.await.unwrap();
    assert_eq!(json_body(&response), &json!({ "body": { "name": "Ada" } }));
}

#[tokio::test]
async fn holds_every_response_mode_until_the_report_returns() {
    for mode in ["onReceived", "lastNode"] {
        let workflow = workflow(
            &[
                trigger(mode),
                ("Set", "test.set", json!({ "field": "x", "value": 1 })),
            ],
            &[("Trigger", 0, "Set")],
        );
        let (mut receiver, reporter) = call_until_report(workflow, AnswerTiming::AfterReport).await;

        assert_eq!(
            receiver.try_recv().unwrap_err(),
            TryRecvError::Empty,
            "{mode}"
        );
        reporter.gate.add_permits(1);
        assert_eq!(receiver.await.unwrap().status, 200, "{mode}");
    }
}
