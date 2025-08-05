# test-tilt Fixtures

This directory contains test fixtures for the test-tilt hook specification tests. Each subdirectory represents a different testing scenario.

## Fixture Overview

### 1. `valid-tiltfile-with-tests/`
Basic fixture with a valid Tiltfile and associated test file. Used as a baseline for successful test execution.

### 2. `tiltfile-without-tests/`
Contains a valid Tiltfile but no test files. Tests the hook's behavior when no tests are present.

### 3. `makefile-integration/`
Demonstrates integration with a Makefile containing a `test-tilt` target. Tests the hook's ability to delegate to make.

### 4. `syntax-error/`
Contains a Tiltfile with intentional Python syntax errors. Tests error handling and reporting.

### 5. `multiple-test-patterns/`
Shows all supported test file patterns: `Tiltfile_test.py`, `test_tiltfile.py`, and `tests/test_tiltfile.py`.

### 6. `nested-tiltfiles/`
Complex project structure with multiple Tiltfiles in subdirectories. Tests recursive Tiltfile discovery and testing.

### 7. `ignore-patterns/`
Tests `.claude-hooks-ignore` functionality for excluding files and directories from testing.

### 8. `pytest-tests/`
Demonstrates pytest-specific features including fixtures, parametrization, and pytest.ini configuration.

### 9. `unittest-tests/`
Shows unittest framework patterns with test classes, setUp/tearDown, and test suites.

### 10. `tilt-validation/`
Tests `tilt alpha tiltfile-result` validation with intentional errors to verify error detection and reporting.

### 11. `edge-cases/`
Comprehensive edge case testing including Unicode, spaces in paths, special characters, and other challenging scenarios.

## Running Tests

Each fixture is designed to be used by the test-tilt hook tests in `spec/test-tilt_spec.sh`. The fixtures provide various scenarios to ensure the hook handles all cases correctly.

## Adding New Fixtures

When adding a new fixture:
1. Create a new directory with a descriptive name
2. Add appropriate Tiltfile and test files
3. Include a README.md explaining the fixture's purpose
4. Update this main README.md
5. Add corresponding tests in `spec/test-tilt_spec.sh`