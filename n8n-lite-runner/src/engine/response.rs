//! The single HTTP answer that each webhook execution sends.

use std::sync::Mutex;

use serde_json::{Value, json};
use tokio::sync::oneshot;

use crate::context::RespondError;
use crate::http::{Body, Headers, HttpResponse};
use crate::item::Item;

/// Accepts the first response for an execution and refuses every later one.
///
/// A slot that holds answers keeps the first response until `release`, instead
/// of sending it at once.
pub(super) struct ResponseSlot {
    state: Mutex<SlotState>,
    hold: bool,
}

enum SlotState {
    Open(oneshot::Sender<HttpResponse>),
    Held(oneshot::Sender<HttpResponse>, HttpResponse),
    Answered,
}

impl ResponseSlot {
    pub(super) fn new(sender: oneshot::Sender<HttpResponse>, hold: bool) -> Self {
        Self {
            state: Mutex::new(SlotState::Open(sender)),
            hold,
        }
    }

    pub(super) fn send(&self, response: HttpResponse) -> Result<(), RespondError> {
        let mut state = self.state.lock().expect("response lock poisoned");
        match std::mem::replace(&mut *state, SlotState::Answered) {
            SlotState::Open(sender) if self.hold => {
                *state = SlotState::Held(sender, response);
                Ok(())
            }
            SlotState::Open(sender) => {
                deliver(sender, response);
                Ok(())
            }
            held @ SlotState::Held(..) => {
                *state = held;
                Err(RespondError::AlreadySent)
            }
            SlotState::Answered => Err(RespondError::AlreadySent),
        }
    }

    /// Sends `response` unless another response was sent or held already.
    pub(super) fn send_default(&self, response: HttpResponse) {
        let _ = self.send(response);
    }

    /// Sends the held response. Does nothing when no response is held.
    pub(super) fn release(&self) {
        let mut state = self.state.lock().expect("response lock poisoned");
        match std::mem::replace(&mut *state, SlotState::Answered) {
            SlotState::Held(sender, response) => deliver(sender, response),
            other => *state = other,
        }
    }
}

fn deliver(sender: oneshot::Sender<HttpResponse>, response: HttpResponse) {
    // The caller may have disconnected. The execution continues regardless.
    let _ = sender.send(response);
}

pub(super) fn workflow_started() -> HttpResponse {
    json_response(200, json!({ "message": "Workflow was started" }))
}

pub(super) fn workflow_failed() -> HttpResponse {
    json_response(500, json!({ "message": "Error in workflow" }))
}

/// The answer in `lastNode` mode: the JSON of the first item, or an empty body.
pub(super) fn first_item(item: Option<Item>) -> HttpResponse {
    match item {
        Some(item) => json_response(200, Value::Object(item.json)),
        None => empty(),
    }
}

pub(super) fn empty() -> HttpResponse {
    HttpResponse {
        status: 200,
        headers: Headers::new(),
        body: Body::Empty,
    }
}

fn json_response(status: u16, body: Value) -> HttpResponse {
    HttpResponse {
        status,
        headers: Headers::new(),
        body: Body::Json(body),
    }
}
