//! Reads the config that n8n appends to a runner binary.
//!
//! n8n's `n8n-lite.service.ts` builds a runner file with this layout:
//! the runner executable, then the config JSON, then the JSON length as a
//! little-endian `u64`, then the 8 bytes `N8NLITE1`.

use std::io::{self, Read, Seek, SeekFrom};

use serde::Deserialize;

use crate::n8n_report::ReportTarget;
use crate::workflow::Workflow;

pub const MAGIC: &[u8; 8] = b"N8NLITE1";
const SUPPORTED_VERSION: u32 = 1;
/// The length field and the magic bytes.
const TRAILER_LENGTH: u64 = 16;

#[derive(Debug, Deserialize)]
pub struct RunnerConfig {
    pub version: u32,
    pub workflow: Workflow,
    pub report: ReportTarget,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("cannot read the embedded config: {0}")]
    Io(#[from] io::Error),
    #[error("the embedded config claims {0} bytes, more than the file holds")]
    Length(u64),
    #[error("the embedded config is not valid: {0}")]
    Json(#[from] serde_json::Error),
    #[error(
        "the embedded config has version {0}, this runner supports version {SUPPORTED_VERSION}"
    )]
    Version(u32),
}

/// Returns the config at the end of `file`, or `None` when the file has no trailer.
pub fn read_embedded(mut file: impl Read + Seek) -> Result<Option<RunnerConfig>, ConfigError> {
    let size = file.seek(SeekFrom::End(0))?;
    if size < TRAILER_LENGTH {
        return Ok(None);
    }
    let mut length = [0u8; 8];
    let mut magic = [0u8; 8];
    file.seek(SeekFrom::Start(size - TRAILER_LENGTH))?;
    file.read_exact(&mut length)?;
    file.read_exact(&mut magic)?;
    if &magic != MAGIC {
        return Ok(None);
    }

    let length = u64::from_le_bytes(length);
    let start = (size - TRAILER_LENGTH)
        .checked_sub(length)
        .ok_or(ConfigError::Length(length))?;
    let mut json = Vec::new();
    file.seek(SeekFrom::Start(start))?;
    file.take(length).read_to_end(&mut json)?;

    let config: RunnerConfig = serde_json::from_slice(&json)?;
    match config.version {
        SUPPORTED_VERSION => Ok(Some(config)),
        other => Err(ConfigError::Version(other)),
    }
}

/// Returns the bytes that n8n appends to a runner: the config JSON and the trailer.
pub fn trailer_for(config_json: &[u8]) -> Vec<u8> {
    let length = (config_json.len() as u64).to_le_bytes();
    [config_json, &length, MAGIC].concat()
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use serde_json::json;

    use super::*;

    fn config(version: u32) -> Vec<u8> {
        serde_json::to_vec(&json!({
            "version": version,
            "workflow": {
                "id": "wf1",
                "name": "Lead router",
                "nodes": [{
                    "id": "1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                    "position": [0, 0], "parameters": { "path": "leads" }
                }],
                "connections": {}
            },
            "report": { "url": "https://n8n.test/rest/n8n-lite/runs", "token": "secret" }
        }))
        .unwrap()
    }

    fn runner_with(appended: &[u8]) -> Cursor<Vec<u8>> {
        Cursor::new([b"\x7fELF runner bytes".as_slice(), appended].concat())
    }

    #[test]
    fn reads_the_config_that_n8n_appends() {
        let file = runner_with(&trailer_for(&config(1)));

        let config = read_embedded(file).unwrap().unwrap();

        assert_eq!(config.workflow.id.as_deref(), Some("wf1"));
        assert_eq!(config.workflow.nodes[0].name, "Webhook");
        assert_eq!(config.report.url, "https://n8n.test/rest/n8n-lite/runs");
        assert_eq!(config.report.token, "secret");
    }

    #[test]
    fn returns_none_without_a_trailer() {
        assert!(read_embedded(runner_with(b"")).unwrap().is_none());
        assert!(
            read_embedded(Cursor::new(b"short".to_vec()))
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn rejects_invalid_trailers() {
        let too_long = [b"{}".as_slice(), &u64::MAX.to_le_bytes(), MAGIC].concat();
        let not_json = trailer_for(b"not json");
        let version_2 = trailer_for(&config(2));

        for appended in [too_long, not_json, version_2] {
            assert!(read_embedded(runner_with(&appended)).is_err());
        }
    }
}
