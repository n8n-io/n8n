# Benchmark

To run all benchmark suites locally in sqlite:

```sh
pnpm benchmark
```

## Creating a benchmark suite

To create a benchmark suite:

- Add a file to `./suites` following the pattern: `{id}-{description}`
- Add workflows to `./suites/workflows`. These will all be loaded to the temp DB during setup. If a workflow is triggered by webhook, set the filename as its path for clarity.
- Use `suite()` for the scenario to benchmark and `task()` for operations in that scenario. Ensure `task()` contains only the specific operation whose execution time will be measured. Move any setup and teardown to `beforeEachTask()` and `afterEachTask()` in the suite.
- Run `build:benchmark` to add it to the list below.

## Benchmark suites list

> **Note**: All workflows with default settings unless otherwise specified.

<!-- BENCHMARK_SUITES_LIST -->

### 001 - Production workflow with authless webhook node

- [using "Respond immediately" mode](./suites/workflows/001-1.json)
- [using "When last node finishes" mode](./suites/workflows/001-2.json)
- [using "Respond to Webhook node" mode](./suites/workflows/001-3.json)

<!-- /BENCHMARK_SUITES_LIST -->
