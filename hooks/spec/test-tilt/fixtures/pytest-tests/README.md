# pytest-tests

This fixture demonstrates pytest-specific testing patterns and configurations for Tiltfiles.

## Contents
- `Tiltfile`: Complex Tiltfile with various features
- `test_tiltfile.py`: Comprehensive pytest test suite
- `conftest.py`: Pytest configuration with fixtures
- `pytest.ini`: Pytest settings and markers

## Pytest Features Demonstrated
1. **Fixtures**: Mock objects, environment setup
2. **Parametrized tests**: Testing multiple scenarios
3. **Markers**: skip, integration, slow
4. **Test classes**: Grouping related tests
5. **Conftest**: Shared test configuration
6. **Coverage**: Configured in pytest.ini

## Expected Behavior
The test-tilt hook should:
1. Detect pytest test files
2. Run tests using pytest if available
3. Respect pytest.ini configuration
4. Use fixtures from conftest.py
5. Handle pytest-specific features like markers and parametrization