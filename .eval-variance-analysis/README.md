# MCP eval variance analysis (working data)

Session working data for the MCP workflow eval variance investigation
(test-evals-mcp.yml). Not intended to be merged — this branch carries
analysis state between sessions.

- `parsed.json` — per-run parsed CI job-log data for 17 runs of
  "Test: MCP Workflow Evals" (runs #18–#52): builds, per-scenario verdicts,
  exec/verify durations, summaries, cost/turn metadata.
- `report_data.json` — per-case/per-unit stability dataset derived from the
  7 identical master runs (#18,19,21,22,24,25,26; iterations=1) plus the
  5-iteration runs (#27,#28): pass patterns, always_pass/flaky/always_fail
  classification, failure categories, verifier diagnoses, truncated
  expectation texts.
- `mcp-eval-stability-report.html` — the published stability report
  (Artifact: https://claude.ai/code/artifact/7a12b503-2e00-4e56-b340-de42744ce9b2).
  To update it from another session, republish this file passing that URL.
- `parse_logs.py`, `analyze.py` — scripts that produced the above from raw
  CI job logs.

Open TODO: fill per-case prompts + success criteria into the report from the
LangSmith dataset `mcp-workflow-evals` (or LangTracer suite `baseline`,
tier `mcp`) — not available from the cloud session.
