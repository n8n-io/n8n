# Changelog

## [Test B1 Eval Harness] - 2025-06-11

### Added
- New workflow `test-B1.json` for processing bookkeeping entries from CSV
- Test case `B1/test_case_001.json` to validate missing description handling
- Eval runner script to execute and validate test cases
- Automated feedback loop for agent performance monitoring

### Technical Details
- Workflow implements CSV parsing and validation
- Test harness validates proper handling of missing fields
- Results logged to `.github/eval_logs/results.json`
