# n8n benchmarking tool

Tool for executing benchmarks against an n8n instance.

## Requirements

- [k6](https://grafana.com/docs/k6/latest/)
- Node.js v20 or higher

## Running locally

```sh
pnpm build

# Run tests against http://localhost:5678 with specified email and password
N8N_USER_EMAIL=user@n8n.io N8N_USER_PASSWORD=password ./bin/n8n-benchmark run

# If you installed k6 using brew, you might have to specify it explicitly
K6_PATH=/opt/homebrew/bin/k6 N8N_USER_EMAIL=user@n8n.io N8N_USER_PASSWORD=password ./bin/n8n-benchmark run
```

## Configuration

The configuration options the cli accepts can be seen from [config.ts](./src/config/config.ts)

## Docker build

Because k6 doesn't have an arm64 build available for linux, we need to build against amd64

```sh
# In the repository root
docker build --platform linux/amd64 -f packages/benchmark/Dockerfile -t n8n-benchmark:latest .
```

## Test scenarios

A test scenario defines a single performance test. It consists of:

- Manifest file which describes and configures the scenario
- Any test data that is imported before the scenario is ran
- A [`k6`](https://grafana.com/docs/k6/latest/using-k6/http-requests/) test script, which receives `API_BASE_URL` environment variable in runtime.

Available test scenarios are located in [`./testScenarios`](./testScenarios/).
