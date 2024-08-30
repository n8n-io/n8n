# n8n benchmarking tool

Tool for executing benchmarks against an n8n instance. The tool consists of these components:

## Directory structure

```text
packages/@n8n/benchmark
├── scenarios        Benchmark scenarios
├── src              Source code for the n8n-benchmark cli
├── Dockerfile       Dockerfile for the n8n-benchmark cli
├── scripts          Orchestration scripts
```

## Running the entire benchmark suite

The benchmark suite consists of [benchmark scenarios](#benchmark-scenarios) and different [n8n setups](#n8n-setups).

### locally

```sh
pnpm benchmark-locally
```

### In the cloud

```sh
pnpm benchmark-in-cloud
```

## Running the `n8n-benchmark` cli

The `n8n-benchmark` cli is a node.js program that runs one or more scenarios against a single n8n instance.

### Locally with Docker

Build the Docker image:

```sh
# Must be run in the repository root
# k6 doesn't have an arm64 build available for linux, we need to build against amd64
docker build --platform linux/amd64 -t n8n-benchmark -f packages/@n8n/benchmark/Dockerfile .
```

Run the image

```sh
docker run \
  -e N8N_USER_EMAIL=user@n8n.io \
  -e N8N_USER_PASSWORD=password \
  # For macos, n8n running outside docker
  -e N8N_BASE_URL=http://host.docker.internal:5678 \
  n8n-benchmark
```

### Locally without Docker

Requirements:

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Node.js v20 or higher

```sh
pnpm build

# Run tests against http://localhost:5678 with specified email and password
N8N_USER_EMAIL=user@n8n.io N8N_USER_PASSWORD=password ./bin/n8n-benchmark run
```

## Benchmark scenarios

A benchmark scenario defines one or multiple steps to execute and measure. It consists of:

- Manifest file which describes and configures the scenario
- Any test data that is imported before the scenario is run
- A [`k6`](https://grafana.com/docs/k6/latest/using-k6/http-requests/) script which executes the steps and receives `API_BASE_URL` environment variable in runtime.

Available scenarios are located in [`./scenarios`](./scenarios/).

## n8n setups

A n8n setup defines a single n8n runtime configuration using Docker compose. Different n8n setups are located in [`./scripts/n8nSetups`](./scripts/n8nSetups).
