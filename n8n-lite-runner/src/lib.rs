//! A minimal runner for n8n workflows.
//!
//! The crate reads a workflow in the n8n JSON format and runs it with node
//! implementations that are compiled into the binary.

pub mod client;
pub mod config;
pub mod context;
pub mod convert;
pub mod engine;
pub mod expression;
pub mod http;
pub mod item;
pub mod n8n_report;
pub mod node;
pub mod nodes;
pub mod registry;
pub mod reporter;
pub mod server;
pub mod webhook;
pub mod wire;
pub mod workflow;

#[cfg(test)]
mod testing;
