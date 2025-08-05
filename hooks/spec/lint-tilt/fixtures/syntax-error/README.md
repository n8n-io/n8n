# Syntax Error Fixture

This fixture contains a Tiltfile with multiple syntax errors:
- Missing closing parenthesis in docker_build call
- Incomplete function definition
- Invalid syntax that should fail parsing

Expected to fail starlark syntax check and Python parsing.