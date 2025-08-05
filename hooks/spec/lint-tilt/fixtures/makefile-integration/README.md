# Makefile Integration Fixture

This fixture tests integration with Makefile targets:
- `make lint-tilt` - Custom linting logic
- `make fix-tilt` - Custom fixing logic

The linter should detect and use these targets instead of running its own checks.