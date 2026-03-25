# @currents/playwright

Playwright integration and reporter for [Currents](https://currents.dev/playwright) - a cloud dashboard for debugging, troubleshooting and analysing parallel CI tests supporting Cypress and Playwright.

<p align="center">
  <img width="830" src="https://static.currents.dev/currents-playwright-banner-gh.png" />
</p>

[![npm version](https://img.shields.io/npm/v/@currents/playwright.svg)](https://www.npmjs.com/package/@currents/playwright)
[![npm dm](https://img.shields.io/npm/dm/@currents/playwright.svg)](https://www.npmjs.com/package/@currents/playwright)
[![npm dt](https://img.shields.io/npm/dt/@currents/playwright.svg)](https://www.npmjs.com/package/@currents/playwright)

<p align="center">
<a href="https://docs.currents.dev">Documentation</a> | <a href="https://currents.dev?utm_source=currents-playwright-readme">Currents</a>

</p>

- Saves [traces, videos, screenshots and console output to a cloud](https://currents.dev/playwright#debug-failures-smash-flaky-tests)
- Fetches [git information and associated with CI builds](https://currents.dev/playwright#collecting-and-reviewing-playwright-executions)
- Integrates with your workflow - [Slack, GitHub or GitLabPR comments and status checks](https://currents.dev/playwright#integrations)
- Flakiness, failure rate, duration and much more [reports](https://currents.dev/playwright#analytics-to-drive-your-testing-strategy)
- Powerful [history and trends browser](https://currents.dev/playwright#tests-executions-history) on test or spec level
- Common errors tracker
- [Monitoring test health with automated reporting](https://currents.dev/playwright#monitoring-test-suite-performance)
- Up to 40% faster CI Playwright tests with [Orchestration for Playwright](https://currents.dev/posts/playwright-reporter-1.0.0#orchestration-for-playwright) - better than native Playwright sharding
- [Streaming Playwright test progress](https://currents.dev/posts/playwright-reporter-1.0.0#step-level-reporting) to cloud dashboard for each individual step for crash-resilient reporting
- REST API and HTTP Webhooks

---

## Requirements

- NodeJS 14.0.0+
- Playwright 1.22.2+

## Install

```sh
npm install @currents/playwright
```

## Enable traces, screenshots and videos

```js
use: {
  // ...
  trace: "on",
  video: "on",
  screenshot: "on",
}
```

## Usage

Choose the preferred launch method:

- executing a `pwc` CLI command - it runs playwright with a predefined configuration
- add `@currents/playwright` reporter to Playwright configuration file

### `pwc` CLI

We need to pass three parameters to run `pwc`:

- our [record key](https://docs.currents.dev/guides/record-key)
- the project ID, which is created when you create a project in the Current dashboard
- the [CI build ID](https://docs.currents.dev/guides/ci-build-id)

The command passes down all the other CLI flags to the Playwright test runner as-is. We can pass these as command line arguments, as environment variables, or a mixture of both.

```sh
pwc --project-id PROJECT_ID --key RECORD_KEY --ci-build-id hello-currents --tag tagA,tagB
```

### `@currents/playwright` reporter

Alternatively, you can manually add the reporter to playwright configuration and keep using `playwright test` CLI command.

```ts
import type { PlaywrightTestConfig } from "@playwright/test";
import { currentsReporter } from "@currents/playwright";

const currentsConfig = {
  ciBuildId: process.env.CURRENTS_CI_BUILD_ID,
  recordKey: process.env.CURRENTS_RECORD_KEY,
  projectId: process.env.CURRENTS_PROJECT_ID,
  tag: ["runTagA", "runTagB"],
};

const config: PlaywrightTestConfig = {
  reporter: [currentsReporter(currentsConfig)],
};

export default config;
```

You can also provide configuration by setting environment variables before running `playwright` command

```sh
CURRENTS_RECORD_KEY=RECORD_KEY CURRENTS_PROJECT_ID=PROJECT_ID CURRENTS_CI_BUILD_ID=hello-currents CURRENTS_TAG=tagA,tagB npx playwright test
```

## Examples

Run all tests in the current directory:

`pwc --key <record-key> --project-id <id> --ci-build-id <build-id>`

Run only tests filtered by the tag "@smoke":

`pwc --key <record-key> --project-id <id> --ci-build-id <build-id> --grep smoke`

Run playwright tests and add tags "tagA", "tagB" to the recorded run:

`pwc --key <record-key> --project-id <id> --ci-build-id <build-id> --tag tagA --tag tagB`

Provide playwright arguments and flags:

`pwc --key <record-key> --project-id <id> --ci-build-id <build-id> -- --workers 2 --timeout 10000 --shard 1/2`

## CI Integrations

Check out the example repositories that showcase running Playwright tests on popular CI providers and recording the results to Currents:

- [Playwright - GitHub Actions](../ci-setup/github-actions/playwright-github-actions.md)
- [Playwright - GitLab CI](../ci-setup/gitlab/playwright-gitlab-ci-cd.md)
- [Playwright - Jenkins](../ci-setup/jenkins/jenkins-playwright.md)
- [Playwright - CircleCI](../ci-setup/circleci/playwright-circleci.md)
- [Playwright - AWS Code Build](../ci-setup/aws-code-build/playwright-aws-code-build.md)
- [Playwright - Azure DevOps](../ci-setup/azure-devops/playwright-azure-devops.md)

Explore how to speed up CI Playwright runs by running enabling [pw-parallelization](../guides/pw-parallelization/).

## Documentation

Explore our comprehensive guides and documentation:

- [Playwright Parallelization - Sharding and Orchestration](https://docs.currents.dev/guides/pw-parallelization)
- [Your First Playwright Run](https://docs.currents.dev/getting-started/you-first-playwright-run)
- [Playwright Tags](https://docs.currents.dev/guides/playwright-tags)
- [Playwright Component Testing](https://docs.currents.dev/integration-with-playwright/playwright-component-testing)
- [Playwright Test Status](https://docs.currents.dev/tests/test-status)
