# Flake8 Issues Fixture

This fixture contains a syntactically valid Tiltfile with various flake8 style violations:
- F401: Unused imports
- E501: Line too long
- E302: Missing blank lines
- E225: Missing whitespace around operators
- E201/E202: Extra whitespace
- W391: Blank line at end of file

Should pass starlark syntax check but fail flake8.