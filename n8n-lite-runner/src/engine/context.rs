//! The engine side of `ExecutionContext`: the state of one running execution.

use std::sync::{Arc, Mutex, MutexGuard};

use serde_json::Value;

use super::response::ResponseSlot;
use crate::context::{ExecutionContext, ExpressionError, RespondError};
use crate::expression::{self, RunData, Scope};
use crate::http::{HttpClient, HttpResponse};
use crate::item::Item;
use crate::node::NodeOutput;
use crate::webhook::ResponseMode;

pub(super) struct EngineContext {
    execution_id: String,
    http: Arc<dyn HttpClient>,
    response_mode: ResponseMode,
    response: ResponseSlot,
    run_data: Mutex<RunData>,
}

impl EngineContext {
    pub(super) fn new(
        execution_id: String,
        http: Arc<dyn HttpClient>,
        response_mode: ResponseMode,
        response: ResponseSlot,
    ) -> Self {
        Self {
            execution_id,
            http,
            response_mode,
            response,
            run_data: Mutex::new(RunData::new()),
        }
    }

    pub(super) fn response(&self) -> &ResponseSlot {
        &self.response
    }

    /// Stores the items that `node` emitted, on all outputs, for later expressions.
    pub(super) fn record(&self, node: &str, output: &NodeOutput) {
        let items = output.iter().flatten().cloned().collect();
        self.run_data().insert(node.to_string(), items);
    }

    pub(super) fn first_item_of(&self, node: &str) -> Option<Item> {
        self.run_data()
            .get(node)
            .and_then(|items| items.first().cloned())
    }

    fn run_data(&self) -> MutexGuard<'_, RunData> {
        self.run_data.lock().expect("run data lock poisoned")
    }
}

impl ExecutionContext for EngineContext {
    fn execution_id(&self) -> &str {
        &self.execution_id
    }

    fn evaluate(
        &self,
        value: &Value,
        item: &Item,
        item_index: usize,
    ) -> Result<Value, ExpressionError> {
        let run_data = self.run_data();
        let scope = Scope {
            item,
            item_index,
            run_data: &run_data,
        };
        expression::evaluate(value, &scope)
    }

    fn http_client(&self) -> &dyn HttpClient {
        self.http.as_ref()
    }

    fn respond(&self, response: HttpResponse) -> Result<(), RespondError> {
        match self.response_mode {
            ResponseMode::ResponseNode => self.response.send(response),
            _ => Err(RespondError::NotExpected),
        }
    }
}
