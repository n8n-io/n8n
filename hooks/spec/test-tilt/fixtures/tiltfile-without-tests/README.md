# tiltfile-without-tests

This fixture contains a valid Tiltfile but no test files. Used to test the hook's behavior when no tests are present.

## Contents
- `Tiltfile`: A valid Tiltfile with basic Docker and Kubernetes configuration
- No test files (no `*_test.py`, `test_*.py`, or `tests/` directory)

## Expected Behavior
The test-tilt hook should detect that there are no test files and exit with code 0.