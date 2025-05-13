# Testing Guidelines for n8n

This document provides an overview of the testing strategy and best practices for the n8n project to ensure code quality and reliability.

## Types of Tests

- **Unit Tests**: Test individual functions and modules in isolation.
- **Integration Tests**: Test interactions between multiple components.
- **End-to-End (E2E) Tests**: Simulate real user scenarios to verify the entire system.

## Running Tests

Use the following command to run all tests:

```bash
pnpm run test
```

This will execute unit and integration tests.

For E2E tests, refer to the `cypress` directory and use:

```bash
pnpm run test:e2e
```

## Writing Tests

- Follow existing test patterns in the `packages/workflow/test` directory.
- Use `vitest` for unit and integration tests.
- Use `cypress` for E2E tests.
- Write tests for new features and bug fixes.
- Cover edge cases and error scenarios.

## Test Coverage

- Aim for high coverage, especially for critical modules.
- Use coverage reports to identify untested code.

## Continuous Integration

- Tests are run automatically on pull requests.
- Ensure all tests pass before merging.

## Debugging Tests

- Use verbose mode for detailed output.
- Use IDE debugging tools for step-through debugging.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://www.cypress.io/)

---

This document helps contributors maintain high-quality code through effective testing practices.
