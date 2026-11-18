//! Loads one n8n workflow and serves its webhook until the process receives Ctrl+C.
//!
//! A runner that n8n builds carries its workflow and report settings at the end
//! of the executable, and needs no arguments. `--workflow` runs a workflow file
//! instead, and the report options then configure reporting.

use std::error::Error;
use std::fs::File;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::Arc;

use clap::{ArgAction, Parser};
use n8n_mini::client::ReqwestClient;
use n8n_mini::config::read_embedded;
use n8n_mini::engine::{AnswerTiming, Engine};
use n8n_mini::n8n_report::{N8nReporter, ReportTarget};
use n8n_mini::reporter::{ExecutionReporter, LogReporter, Reporters};
use n8n_mini::workflow::Workflow;
use n8n_mini::{nodes, server};
use tokio::net::TcpListener;

/// Runs an n8n workflow that starts with a Webhook node.
#[derive(Parser)]
#[command(version)]
struct Args {
    /// A workflow JSON file, in the format that n8n exports. It replaces the workflow that n8n embedded.
    #[arg(long, short)]
    workflow: Option<PathBuf>,

    /// The port of the webhook server, on all network interfaces.
    #[arg(long, env = "LITE_PORT")]
    port: Option<u16>,

    /// The full address of the webhook server. Takes precedence over the port.
    /// Without either, the server listens on 127.0.0.1:5678.
    #[arg(long)]
    listen: Option<SocketAddr>,

    /// Send the webhook answer only after the run ends and the report is sent,
    /// for hosts that may stop the process after the answer. The variable
    /// accepts 1, true, yes and on, or 0, false, no, off and an empty value.
    #[arg(
        long,
        env = "LITE_REPORT_BEFORE_RESPONSE",
        action = ArgAction::SetTrue,
        value_parser = parse_switch
    )]
    report_before_response: bool,

    /// The n8n-lite report URL, for a workflow from `--workflow`.
    #[arg(long, env = "LITE_REPORT_URL", requires = "report_token")]
    report_url: Option<String>,

    /// The report token for the workflow. Prefer the environment variable, which stays out of the shell history.
    #[arg(
        long,
        env = "LITE_REPORT_TOKEN",
        hide_env_values = true,
        requires = "report_url"
    )]
    report_token: Option<String>,
}

/// Reads an on or off setting. An empty value is off, so `NAME=` in a deployment file disables the setting.
fn parse_switch(value: &str) -> Result<bool, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "" | "0" | "false" | "no" | "off" => Ok(false),
        other => Err(format!("expected 1 or 0, got `{other}`")),
    }
}

impl Args {
    fn listen_address(&self) -> SocketAddr {
        let on_all_interfaces = |port| SocketAddr::from(([0, 0, 0, 0], port));
        self.listen
            .or(self.port.map(on_all_interfaces))
            .unwrap_or_else(|| SocketAddr::from(([127, 0, 0, 1], 5678)))
    }

    fn answer_timing(&self) -> AnswerTiming {
        match self.report_before_response {
            true => AnswerTiming::AfterReport,
            false => AnswerTiming::Immediate,
        }
    }
}

#[tokio::main]
async fn main() -> ExitCode {
    match run(Args::parse()).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::FAILURE
        }
    }
}

async fn run(args: Args) -> Result<(), Box<dyn Error>> {
    let (workflow, report) = settings(&args)?;
    let engine = Engine::load(
        workflow,
        &nodes::registry(),
        Arc::new(ReqwestClient::default()),
        reporter(report),
    )?
    .with_answer_timing(args.answer_timing());
    let webhook = engine.webhook().clone();

    let listener = TcpListener::bind(args.listen_address()).await?;
    eprintln!(
        "listening for {} http://{}/webhook/{}",
        webhook.method.as_str(),
        listener.local_addr()?,
        webhook.path
    );
    if args.answer_timing() == AnswerTiming::AfterReport {
        eprintln!("answers are sent after each run ends and its report is sent");
    }
    axum::serve(listener, server::router(Arc::new(engine)))
        .with_graceful_shutdown(async {
            // An error here means no signal handler, so the server runs until it is killed.
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}

/// Chooses the workflow and the report target.
///
/// A `--workflow` file reports only to the target in the flags, because the
/// embedded token belongs to the embedded workflow.
fn settings(args: &Args) -> Result<(Workflow, Option<ReportTarget>), Box<dyn Error>> {
    let flags = args
        .report_url
        .clone()
        .zip(args.report_token.clone())
        .map(|(url, token)| ReportTarget { url, token });
    let (workflow, report) = match &args.workflow {
        Some(path) => (load(path)?, flags),
        None => {
            let config = read_embedded(File::open(std::env::current_exe()?)?)?
                .ok_or("no workflow: pass --workflow <file>, or run a runner built by n8n")?;
            (config.workflow, flags.or(Some(config.report)))
        }
    };
    if report.is_some() && workflow.id.as_deref().is_none_or(str::is_empty) {
        return Err("reporting to n8n needs a workflow with an `id` field".into());
    }
    Ok((workflow, report))
}

fn reporter(report: Option<ReportTarget>) -> Arc<dyn ExecutionReporter> {
    let log: Arc<dyn ExecutionReporter> = Arc::new(LogReporter);
    match report {
        Some(target) => Arc::new(Reporters(vec![log, Arc::new(N8nReporter::new(target))])),
        None => log,
    }
}

fn load(path: &Path) -> Result<Workflow, Box<dyn Error>> {
    let text = std::fs::read_to_string(path)
        .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    Workflow::from_json(&text)
        .map_err(|error| format!("cannot parse {}: {error}", path.display()).into())
}

/// clap also reads the `LITE_*` variables here, so these tests expect them to be unset.
#[cfg(test)]
mod tests {
    use super::*;

    fn args(arguments: &[&str]) -> Args {
        Args::try_parse_from([&["n8n-mini"], arguments].concat()).unwrap()
    }

    #[test]
    fn reads_on_and_off_values() {
        for value in ["1", "true", "YES", "on"] {
            assert_eq!(parse_switch(value), Ok(true), "{value}");
        }
        for value in ["", "0", "false", "No", "off"] {
            assert_eq!(parse_switch(value), Ok(false), "{value}");
        }
        assert!(parse_switch("maybe").is_err());
    }

    #[test]
    fn chooses_the_listen_address() {
        assert_eq!(
            args(&[]).listen_address(),
            "127.0.0.1:5678".parse().unwrap()
        );
        assert_eq!(
            args(&["--port", "8080"]).listen_address(),
            "0.0.0.0:8080".parse().unwrap()
        );
        assert_eq!(
            args(&["--port", "8080", "--listen", "127.0.0.1:9000"]).listen_address(),
            "127.0.0.1:9000".parse().unwrap()
        );
    }

    #[test]
    fn chooses_the_answer_timing() {
        assert_eq!(args(&[]).answer_timing(), AnswerTiming::Immediate);
        assert_eq!(
            args(&["--report-before-response"]).answer_timing(),
            AnswerTiming::AfterReport
        );
    }
}
