//! Runs a workflow with all five nodes over real HTTP on localhost.
//!
//! An upstream server stands in for an external API. The workflow calls it
//! with the HTTP Request node, branches on the answer, and responds.

mod common;

use std::collections::HashMap;

use axum::extract::Query;
use axum::routing::get;
use axum::{Json, Router};
use n8n_mini::reporter::ExecutionStatus;
use n8n_mini::workflow::Workflow;
use serde_json::{Value, json};

use common::{ChannelReporter, serve, start_runner};

/// Answers `GET /weather?city=...` with a fixed temperature per city.
fn weather_api() -> Router {
    Router::new().route(
        "/weather",
        get(|Query(query): Query<HashMap<String, String>>| async move {
            let city = query.get("city").cloned().unwrap_or_default();
            let temperature = if city == "Rome" { 24 } else { 8 };
            Json(json!({ "city": city, "temperature": temperature }))
        }),
    )
}

fn workflow(api: &str) -> Workflow {
    serde_json::from_value(json!({
        "name": "Weather",
        "nodes": [
            {
                "id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                "position": [0, 0], "webhookId": "w1",
                "parameters": { "httpMethod": "POST", "path": "weather", "responseMode": "responseNode", "options": {} }
            },
            {
                "id": "2", "name": "Get weather", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
                "position": [200, 0],
                "parameters": {
                    "url": format!("{api}/weather"),
                    "sendQuery": true,
                    "queryParameters": { "parameters": [{ "name": "city", "value": "={{ $json.body.city }}" }] },
                    "options": {}
                }
            },
            {
                "id": "3", "name": "Is warm", "type": "n8n-nodes-base.if", "typeVersion": 2.2,
                "position": [400, 0],
                "parameters": {
                    "conditions": {
                        "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict", "version": 2 },
                        "conditions": [{
                            "id": "c1", "leftValue": "={{ $json.temperature }}", "rightValue": 20,
                            "operator": { "type": "number", "operation": "gt" }
                        }],
                        "combinator": "and"
                    },
                    "options": {}
                }
            },
            {
                "id": "4", "name": "Warm", "type": "n8n-nodes-base.set", "typeVersion": 3.4,
                "position": [600, -100],
                "parameters": { "assignments": { "assignments": [
                    { "id": "a1", "name": "message", "type": "string", "value": "=It is warm in {{ $json.city }}" }
                ] }, "options": {} }
            },
            {
                "id": "5", "name": "Cold", "type": "n8n-nodes-base.set", "typeVersion": 3.4,
                "position": [600, 100],
                "parameters": { "assignments": { "assignments": [
                    { "id": "a2", "name": "message", "type": "string", "value": "=It is cold in {{ $json.city }}" }
                ] }, "options": {} }
            },
            {
                "id": "6", "name": "Respond", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.5,
                "position": [800, 0],
                "parameters": { "respondWith": "firstIncomingItem", "options": {} }
            }
        ],
        "connections": {
            "Webhook": { "main": [[{ "node": "Get weather", "type": "main", "index": 0 }]] },
            "Get weather": { "main": [[{ "node": "Is warm", "type": "main", "index": 0 }]] },
            "Is warm": { "main": [
                [{ "node": "Warm", "type": "main", "index": 0 }],
                [{ "node": "Cold", "type": "main", "index": 0 }]
            ] },
            "Warm": { "main": [[{ "node": "Respond", "type": "main", "index": 0 }]] },
            "Cold": { "main": [[{ "node": "Respond", "type": "main", "index": 0 }]] }
        }
    }))
    .unwrap()
}

#[tokio::test]
async fn answers_webhook_calls_through_all_nodes() {
    let api = serve(weather_api()).await;
    let (reporter, mut finished) = ChannelReporter::new();
    let runner = start_runner(workflow(&api), reporter).await;
    let client = reqwest::Client::new();

    let calls = ["Rome", "Oslo"].map(|city| {
        client
            .post(format!("{runner}/webhook/weather"))
            .json(&json!({ "city": city }))
            .send()
    });
    let [rome, oslo] = calls;
    let (rome, oslo) = tokio::join!(rome, oslo);

    let rome: Value = rome.unwrap().json().await.unwrap();
    let oslo: Value = oslo.unwrap().json().await.unwrap();
    assert_eq!(rome, json!({ "message": "It is warm in Rome" }));
    assert_eq!(oslo, json!({ "message": "It is cold in Oslo" }));
    for _ in 0..2 {
        assert_eq!(finished.next().await.status, ExecutionStatus::Success);
    }
}
