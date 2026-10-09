//! Write an n8n action in Rust. The action is a WASM component of the `action-bundle` world of
//! the Node Contract (`../spec/wit`), so the `wasm` runtime runs it as it runs a JS bundle.
//!
//! An action crate implements `Guest` of `bindings::exports::n8n::node_contract::action` and calls
//! `export_action!`. `describe()` gives the contract document of the manifest format. Pack reads
//! it from the component, so the manifest comes from the component.

pub mod bindings {
    wit_bindgen::generate!({
        path: "../spec/wit",
        world: "action-bundle",
        pub_export_macro: true,
        export_macro_name: "export_action",
        default_bindings_module: "n8n_node_sdk::bindings",
    });
}

pub use bindings::export_action;
use bindings::exports::n8n::node_contract::action::{
    GuestChunkRun, GuestJoinRun, GuestRun, ItemOutcome, RoutedJoinOutput,
};
pub use bindings::n8n::node_contract::errors::RunError;
pub use bindings::n8n::node_contract::types::Json;
use serde::{de::DeserializeOwned, Serialize};

/// A run error with a message and no failed response.
pub fn run_error(message: impl std::fmt::Display) -> RunError {
    RunError {
        message: message.to_string(),
        response: None,
    }
}

/// The value of a JSON text from the host, e.g. the run input.
pub fn from_json<T: DeserializeOwned>(json: &str) -> Result<T, RunError> {
    serde_json::from_str(json).map_err(|e| run_error(format!("The host gave other JSON: {e}")))
}

/// The JSON text of a value for the host, e.g. an output item.
pub fn to_json(value: &impl Serialize) -> Result<Json, RunError> {
    serde_json::to_string(value).map_err(run_error)
}

/// A resource of the action interface that the action does not use. Its `next` gives an error.
/// A constructor cannot give an error, so the error comes at the first `next`.
pub struct Unsupported;

const UNSUPPORTED: &str = "This action runs only in item-run";

impl GuestRun for Unsupported {
    fn new(_input: Json) -> Self {
        Self
    }
    fn next(&self) -> Result<Option<Json>, RunError> {
        Err(run_error(UNSUPPORTED))
    }
}

impl GuestJoinRun for Unsupported {
    fn new(_input: Json, _inputs: Vec<Vec<Json>>) -> Self {
        Self
    }
    fn next(&self) -> Result<Option<RoutedJoinOutput>, RunError> {
        Err(run_error(UNSUPPORTED))
    }
}

impl GuestChunkRun for Unsupported {
    fn new(_inputs: Vec<Json>, _items: Vec<Json>, _continue_on_fail: bool) -> Self {
        Self
    }
    fn next(&self) -> Result<Option<ItemOutcome>, RunError> {
        Err(run_error(UNSUPPORTED))
    }
}
