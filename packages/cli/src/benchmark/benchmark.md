# Benchmark

This package contains benchmarks to measure the execution time of n8n backend operations in sqlite and Postgres.

Benchmarks are organized into **suites** for the scenario to benchmark, **tasks** for operations in that scenario, and **hooks** for setup and teardown, implemented on top of [`tinybench`](https://github.com/tinylibs/tinybench). Execution in CI is delegated to [Codspeed](https://codspeed.io/) to keep measurements consistent and to monitor improvements and regressions.

## Running benchmarks

To run benchmarks:

```sh
pnpm build:benchmark
pnpm benchmark:sqlite # or
pnpm benchmark:postgres
```

Locally, the benchmarking run can be configured via [environment variables](https://docs.n8n.io/hosting/configuration/environment-variables/benchmarking). In CI, the configuration is set by Codspeed.

## Creating benchmarks

To create benchmarks:

1. Create a file at `suites/**/{suiteId}-{suiteTitle}.ts`.
2. Include a `suite()` call for the scenario to benchmark.
3. Inside the suite, include one or more `task()` calls for operations in that scenario. `task()` must contain only the specific operation whose execution time to measure. Move any per-task setup and teardown to `beforeEachTask()` and `afterEachTask()` in the suite.
4. Include workflows at `suites/workflows/{suiteId}-{ordinalNumber}`. During setup, workflows at this dir are saved in the temp DB and activated in memory.
5. Run `pnpm build:benchmark` to add the suite and its tasks to the index below.

## Index of benchmarking suites

> **Note**: All workflows with default settings unless otherwise specified, e.g. `EXECUTIONS_MODE` is `regular` unless `queue` is specified.

<!-- BENCHMARK_SUITES_LIST -->

### 001 - Production workflow with authless webhook node

- [using "Respond immediately" mode](./suites/workflows/001-1.json)
- [using "When last node finishes" mode](./suites/workflows/001-2.json)
- [using "Respond to Webhook node" mode](./suites/workflows/001-3.json)

<!-- /BENCHMARK_SUITES_LIST -->

## Reading benchmarks

In a benchmarking run, a task is repeatedly executed for a duration and for a number of iterations - the run will continue until the number of iterations is reached, even if this exceeds the duration.

```
BENCHMARK suites/001-production-webhook-with-authless-webhook-node.suite.ts [sqlite]

  • using "Respond immediately" mode
    · Ran 27 iterations in 509.992 ms at a rate of 52.941 op/s
    · p75 20.251 ms ··· p99 64.570 ms ··· p999 64.570 ms
    · min 8.363 ms ···· max 64.570 ms ··· mean 18.888 ms
    · MoE ±4.1% ··· std err 02.037 ms ··· std dev 10.586 ms
```

`p{n}` is the percentile, i.e. the percentage of data points in a distribution that are less than or equal to a value. For example, `p75` being 20.251 ms means that 75% of the 27 iterations for the task `using "Respond immediately" mode` took 20.251 ms or less. `p75` is the execution time that the majority of users experience, `p99` captures worst-case scenarios for all but 1% of users, and `p999` includes performance at extreme cases for the slowest 0.1% of users.

`min` is the shortest execution time recorded across all iterations of the task, `max` is the longest, and `mean` is the average.

`MoE` (margin of error) reflects how much the sample mean is expected to differ from the true population mean. For example, a margin of error of ±4.1% in the task `using "Respond immediately" mode` suggests that, if the benchmarking run were repeated multiple times, the sample mean would fall within 4.1% of the true population mean in 95% of those runs, assuming a standard confidence level. This range indicates the variability we might see due to the randomness of selecting a sample.

`std err` (standard error) reflects how closely a sample mean is expected to approximate the true population mean. A smaller standard error indicates that the sample mean is likely to be a more accurate estimate of the population mean because the variation among sample means is less. For example, in the task `using "Respond immediately" mode`, the standard error is 2.037 ms, which suggests that the sample mean is expected to differ from the true population mean by 2.037 ms on average.

`std dev` (standard deviation) is the amount of dispersion across samples. When low, it indicates that the samples tend to be close to the mean; when high, it indicates that the samples are spread out over a wider range. For example, in the task `using "Respond immediately" mode`, the standard deviation is 10.586 ms, which suggests that the execution times varied significantly across iterations.
