//! Records the run of every node during one execution.

use std::collections::HashMap;
use std::time::{Instant, SystemTime};

use crate::node::NodeOutput;
use crate::reporter::{NodeRun, RunSource};

/// The moment a node run started, as wall-clock time for reports and as a monotonic clock for its duration.
#[derive(Clone, Copy)]
pub(super) struct Started {
    at: SystemTime,
    clock: Instant,
}

impl Started {
    pub(super) fn now() -> Self {
        Self {
            at: SystemTime::now(),
            clock: Instant::now(),
        }
    }
}

#[derive(Default)]
pub(super) struct RunLog {
    runs: Vec<NodeRun>,
    run_counts: HashMap<String, usize>,
}

impl RunLog {
    /// Stores one finished run and returns its run index for `node`.
    pub(super) fn record(
        &mut self,
        node: &str,
        source: Option<RunSource>,
        started: Started,
        result: Result<&NodeOutput, String>,
    ) -> usize {
        let count = self.run_counts.entry(node.to_string()).or_default();
        let run_index = *count;
        *count += 1;
        self.runs.push(NodeRun {
            node: node.to_string(),
            run_index,
            started_at: started.at,
            duration: started.clock.elapsed(),
            source,
            result: result.cloned(),
        });
        run_index
    }

    pub(super) fn into_runs(self) -> Vec<NodeRun> {
        self.runs
    }
}
