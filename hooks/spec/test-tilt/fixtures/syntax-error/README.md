# syntax-error

This fixture contains a Tiltfile with multiple Python syntax errors to test error handling.

## Contents
- `Tiltfile`: Contains multiple syntax errors:
  - Missing closing parenthesis
  - Invalid indentation
  - Undefined variables
  - Missing colons in dictionary
  - Invalid function call syntax
- `Tiltfile_test.py`: Valid test file (to ensure tests exist)

## Expected Behavior
The test-tilt hook should fail when running `tilt alpha tiltfile-result` due to syntax errors in the Tiltfile. The hook should report these errors and exit with a non-zero status.