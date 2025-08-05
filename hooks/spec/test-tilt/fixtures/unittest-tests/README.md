# unittest-tests

This fixture demonstrates unittest framework testing patterns for Tiltfiles.

## Contents
- `Tiltfile`: Go application Tiltfile with Kustomize
- `Tiltfile_test.py`: Comprehensive unittest test suite

## Unittest Features Demonstrated
1. **Test Classes**: Multiple TestCase classes for organization
2. **setUp/tearDown**: Test fixture management
3. **Class Methods**: setUpClass for shared setup
4. **Mocking**: Using unittest.mock for isolation
5. **Test Suites**: Aggregating tests with suite()
6. **Assertions**: Various unittest assertion methods

## Test Structure
- `TestTiltfileConfiguration`: Tests configuration values
- `TestTiltfileExtensions`: Tests extension loading
- `TestTiltfileValidation`: Tests Tiltfile validity

## Expected Behavior
The test-tilt hook should:
1. Detect unittest-style test files (*_test.py)
2. Run tests using `python -m unittest`
3. Support test discovery
4. Handle test suites and test runners
5. Report results in unittest format