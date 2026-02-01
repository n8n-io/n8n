# Integration Tests

Integration tests for AI workflow builder chains that use real LLM instances and make actual API calls.

## Overview

These tests are different from unit tests in that they:

- Use real LLM instances (not mocks)
- Make actual API calls to external services
- Verify end-to-end behavior of chains
- Cost money to run (API usage fees)
- Are slower than unit tests

## Running Integration Tests

Integration tests are **skipped by default** to avoid flaky tests as part of the unit tests.

### Prerequisites

1. Set up your Anthropic API key:

```bash
export N8N_AI_ANTHROPIC_KEY=your-api-key-here
```

2. Enable integration tests:

```bash
export ENABLE_INTEGRATION_TESTS=true
```

### Running Tests

**Run all integration tests:**

```bash
ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test integration
```

**Run a specific integration test file:**

```bash
ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test prompt-categorization.integration
```

## Test Helpers

### `setupIntegrationLLM()`

Sets up a real LLM instance for testing. Only requires the API key, no node loading.

```typescript
const llm = await setupIntegrationLLM();
```

### Tests are being skipped

Make sure both environment variables are set:

```bash
export ENABLE_INTEGRATION_TESTS=true
export N8N_AI_ANTHROPIC_KEY=your-key
```
