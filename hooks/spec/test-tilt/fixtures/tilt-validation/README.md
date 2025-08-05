# tilt-validation

This fixture tests the `tilt alpha tiltfile-result` validation command with various valid and invalid configurations.

## Contents
- `Tiltfile`: Contains both valid and intentionally invalid configurations
- `test_tilt_validation.py`: Tests for validation behavior

## Validation Test Cases in Tiltfile

### Valid Configurations
- `valid-app`: Properly configured resource
- `complex-app`: Complex but valid Docker build

### Invalid Configurations (Intentional)
1. **Missing Docker context**: `./docker/does-not-exist`
2. **Missing YAML file**: `k8s/missing-file.yaml`
3. **Circular dependencies**: service-a ← → service-b
4. **Invalid port format**: `'not-a-port'`
5. **Duplicate resource names**: Two resources named `duplicate-name`
6. **Failing local resource**: Command that always exits with 1

## Expected Behavior
The test-tilt hook should:
1. Run `tilt alpha tiltfile-result` for validation
2. Detect and report all validation errors
3. Continue to find other issues even after encountering errors
4. Provide clear error messages for each issue
5. Still run tests even if validation has warnings/errors (but may fail the hook)

## Validation Output
The `tilt alpha tiltfile-result` command should produce output indicating:
- Syntax errors
- Missing files
- Invalid configurations
- Circular dependencies
- Resource conflicts