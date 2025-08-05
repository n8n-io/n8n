# makefile-integration

This fixture demonstrates integration between Tiltfile and a Makefile containing a `test-tilt` target.

## Contents
- `Tiltfile`: Uses local_resource to call make tasks
- `Makefile`: Contains `test-tilt` target that runs pytest
- `Tiltfile_test.py`: Basic test file

## Expected Behavior
The test-tilt hook should detect the Makefile with `test-tilt` target and execute it using `make test-tilt`.