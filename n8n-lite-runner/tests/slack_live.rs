//! Posts a real message to Slack through a webhook workflow.
//!
//! The test is ignored by default because it needs a Slack app and network access. Run it with:
//!
//! ```sh
//! SLACK_TEST_TOKEN=xoxb-... SLACK_TEST_CHANNEL=C0123456789 cargo test --test slack_live -- --ignored
//! ```
//!
//! The bot needs the `chat:write` scope and must be a member of the channel.

mod common;

use std::time::{SystemTime, UNIX_EPOCH};

use n8n_mini::nodes::Credentials;
use n8n_mini::reporter::ExecutionStatus;
use n8n_mini::workflow::Workflow;
use serde_json::{Value, json};

use common::{ChannelReporter, start_runner_with};

fn required(variable: &str) -> String {
    std::env::var(variable).unwrap_or_else(|_| panic!("set {variable} to run this test"))
}

/// Webhook, then Slack "Send a message" to a channel by ID, then Respond to Webhook.
fn workflow(channel: &str) -> Workflow {
    serde_json::from_value(json!({
        "id": "wf-slack",
        "name": "Slack notifier",
        "nodes": [
            {
                "id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                "position": [0, 0],
                "parameters": { "httpMethod": "POST", "path": "slack", "responseMode": "responseNode", "options": {} }
            },
            {
                "id": "2", "name": "Send message", "type": "n8n-nodes-base.slack", "typeVersion": 2.3,
                "position": [200, 0],
                "credentials": { "slackApi": { "id": "c1", "name": "Slack account" } },
                "parameters": {
                    "select": "channel",
                    "channelId": { "__rl": true, "value": channel, "mode": "id" },
                    "text": "={{ $json.body.text }}",
                    "otherOptions": {}
                }
            },
            {
                "id": "3", "name": "Respond", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.5,
                "position": [400, 0], "parameters": { "options": {} }
            }
        ],
        "connections": {
            "Webhook": { "main": [[{ "node": "Send message", "type": "main", "index": 0 }]] },
            "Send message": { "main": [[{ "node": "Respond", "type": "main", "index": 0 }]] }
        }
    }))
    .unwrap()
}

#[tokio::test]
#[ignore = "posts to a real Slack workspace; needs SLACK_TEST_TOKEN and SLACK_TEST_CHANNEL"]
async fn posts_a_message_to_slack() {
    let token = required("SLACK_TEST_TOKEN");
    let channel = required("SLACK_TEST_CHANNEL");
    let (reporter, mut finished) = ChannelReporter::new();
    let credentials = Credentials {
        slack_token: Some(token),
    };
    let runner = start_runner_with(workflow(&channel), reporter, &credentials).await;
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let text = format!("n8n-lite runner test message, sent at Unix time {seconds}");

    let answer: Value = reqwest::Client::new()
        .post(format!("{runner}/webhook/slack"))
        .json(&json!({ "text": text }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let summary = finished.next().await;

    assert_eq!(
        summary.status,
        ExecutionStatus::Success,
        "{:?}",
        summary.error
    );
    assert_eq!(answer["ok"], true, "{answer}");
    assert_eq!(answer["channel"], channel.as_str());
    assert_eq!(answer["message"]["text"], text.as_str());
    assert!(answer["message_timestamp"].is_string(), "{answer}");
}
