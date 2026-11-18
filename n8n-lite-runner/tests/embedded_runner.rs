//! Builds a runner the way n8n's `n8n-lite.service.ts` does, and runs it as a process.
//!
//! The test appends a config to a copy of the compiled binary, starts the copy
//! without arguments, calls its webhook, and checks the report that n8n receives.

mod common;

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use n8n_mini::config::trailer_for;
use serde_json::{Value, json};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

use common::{
    REPORT_PATH, REPORT_TOKEN, assert_matches_report_schema, n8n_stub, next_report, serve,
};

/// The config that n8n appends: the workflow with default parameters filled in, and the report target.
fn config(report_url: &str) -> Value {
    json!({
        "version": 1,
        "workflow": {
            "id": "wf-embedded",
            "name": "Greeter",
            "nodes": [
                {
                    "id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                    "position": [0, 0], "webhookId": "w1",
                    "parameters": {
                        "multipleMethods": false, "httpMethod": "POST", "path": "greet",
                        "authentication": "none", "responseMode": "responseNode", "options": {}
                    }
                },
                {
                    "id": "2", "name": "Greet", "type": "n8n-nodes-base.set", "typeVersion": 3.4,
                    "position": [200, 0],
                    "parameters": {
                        "mode": "manual", "duplicateItem": false, "includeOtherFields": false,
                        "options": {},
                        "assignments": { "assignments": [
                            { "id": "a", "name": "greeting", "type": "string", "value": "=Hello {{ $json.body.name }}" }
                        ] }
                    }
                },
                {
                    "id": "3", "name": "Respond", "type": "n8n-nodes-base.respondToWebhook",
                    "typeVersion": 1.5, "position": [400, 0],
                    "parameters": { "enableResponseOutput": false, "respondWith": "firstIncomingItem", "options": {} }
                }
            ],
            "connections": {
                "Webhook": { "main": [[{ "node": "Greet", "type": "main", "index": 0 }]] },
                "Greet": { "main": [[{ "node": "Respond", "type": "main", "index": 0 }]] }
            }
        },
        "report": { "url": report_url, "token": REPORT_TOKEN }
    })
}

/// Writes the compiled binary followed by the config trailer, and makes the file executable.
fn build_runner(directory: &Path, config: &Value) -> PathBuf {
    let path = directory.join("n8n-lite-runner");
    let mut bytes = std::fs::read(env!("CARGO_BIN_EXE_n8n-mini")).unwrap();
    bytes.extend(trailer_for(&serde_json::to_vec(config).unwrap()));
    std::fs::write(&path, bytes).unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
    path
}

/// The variables that the runner reads. The tests clear them, so the developer's shell cannot change a result.
const RUNNER_VARIABLES: [&str; 4] = [
    "LITE_PORT",
    "LITE_REPORT_BEFORE_RESPONSE",
    "LITE_REPORT_URL",
    "LITE_REPORT_TOKEN",
];

fn runner_command(runner: &Path) -> Command {
    let mut command = Command::new(runner);
    for variable in RUNNER_VARIABLES {
        command.env_remove(variable);
    }
    command
}

/// Returns a port that was free a moment ago.
fn free_port() -> u16 {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.local_addr().unwrap().port()
}

/// Starts the runner and returns its webhook URL from the first line it prints.
async fn start(mut command: Command) -> (Child, String) {
    let mut child = command
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .unwrap();
    let stderr = child.stderr.take().unwrap();
    let mut lines = BufReader::new(stderr).lines();
    let first = tokio::time::timeout(Duration::from_secs(10), lines.next_line())
        .await
        .expect("the runner printed nothing within ten seconds")
        .unwrap()
        .expect("the runner exited before it printed its address");
    // For example: "listening for POST http://127.0.0.1:50123/webhook/greet".
    let url = first
        .split_whitespace()
        .last()
        .filter(|word| word.starts_with("http://"))
        .unwrap_or_else(|| panic!("unexpected first line: {first}"))
        .to_string();
    // Keep reading, so the runner can write its log, and show the log when a test fails.
    tokio::spawn(async move {
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("runner: {line}");
        }
    });
    (child, url)
}

#[tokio::test]
async fn runs_the_embedded_workflow_and_reports_to_n8n() {
    let (n8n, mut reports) = n8n_stub();
    let n8n = serve(n8n).await;
    let directory = tempfile::tempdir().unwrap();
    let runner = build_runner(directory.path(), &config(&format!("{n8n}{REPORT_PATH}")));

    let mut command = runner_command(&runner);
    command.args(["--listen", "127.0.0.1:0"]);
    let (mut child, webhook) = start(command).await;
    let answer: Value = reqwest::Client::new()
        .post(&webhook)
        .json(&json!({ "name": "Ada" }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let report = next_report(&mut reports).await;
    child.kill().await.unwrap();

    assert_eq!(answer, json!({ "greeting": "Hello Ada" }));
    assert_matches_report_schema(&report.body);
    assert_eq!(report.body["workflowId"], "wf-embedded");
    assert_eq!(report.body["status"], "success");
    assert_eq!(report.body["lastNodeExecuted"], "Respond");
}

#[tokio::test]
async fn answers_after_the_report_on_lite_port() {
    let (n8n, mut reports) = n8n_stub();
    let n8n = serve(n8n).await;
    let directory = tempfile::tempdir().unwrap();
    let runner = build_runner(directory.path(), &config(&format!("{n8n}{REPORT_PATH}")));
    let port = free_port();

    let mut command = runner_command(&runner);
    command
        .env("LITE_PORT", port.to_string())
        .env("LITE_REPORT_BEFORE_RESPONSE", "1");
    let (mut child, webhook) = start(command).await;
    let answer: Value = reqwest::Client::new()
        .post(format!("http://127.0.0.1:{port}/webhook/greet"))
        .json(&json!({ "name": "Ada" }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    // The stub stores a report before it replies to the runner, and the runner
    // answers only after that reply. So the report is already here.
    let report = reports.try_recv();
    child.kill().await.unwrap();

    assert_eq!(webhook, format!("http://0.0.0.0:{port}/webhook/greet"));
    assert_eq!(answer, json!({ "greeting": "Hello Ada" }));
    let report = report.expect("the report arrived before the answer");
    assert_eq!(report.body["status"], "success");
}

#[tokio::test]
async fn refuses_to_start_without_a_workflow() {
    // The plain binary has no trailer and gets no `--workflow`.
    let output = runner_command(Path::new(env!("CARGO_BIN_EXE_n8n-mini")))
        .output()
        .await
        .unwrap();

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("no workflow"), "{stderr}");
}
