# multiple-test-patterns

This fixture demonstrates multiple test file naming patterns that the hook should recognize.

## Contents
- `Tiltfile`: Configuration with local resources for different test patterns
- `Tiltfile_test.py`: Test file using `*_test.py` pattern (unittest style)
- `test_tiltfile.py`: Test file using `test_*.py` pattern (pytest style)
- `tests/test_tiltfile.py`: Test file in `tests/` directory
- `tests/__init__.py`: Makes tests directory a Python package

## Test Patterns
1. `Tiltfile_test.py` - Suffix pattern
2. `test_tiltfile.py` - Prefix pattern
3. `tests/test_*.py` - Tests directory pattern

## Expected Behavior
The test-tilt hook should find and run all three test file patterns. The hook should recognize all standard Python test naming conventions.