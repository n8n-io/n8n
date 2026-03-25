<div align="center">
<h1><code>@codspeed/vitest-plugin</code></h1>

[Vitest](https://vitest.dev) plugin for [CodSpeed](https://codspeed.io)

[![CI](https://github.com/CodSpeedHQ/codspeed-node/actions/workflows/ci.yml/badge.svg)](https://github.com/CodSpeedHQ/codspeed-node/actions/workflows/ci.yml)
[![npm (scoped)](https://img.shields.io/npm/v/@codspeed/tinybench-plugin)](https://www.npmjs.com/package/@codspeed/tinybench-plugin)
[![Discord](https://img.shields.io/badge/chat%20on-discord-7289da.svg)](https://discord.com/invite/MxpaCfKSqF)
[![CodSpeed Badge](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://codspeed.io/CodSpeedHQ/codspeed-node)

</div>

## Documentation

Check out the [documentation](https://docs.codspeed.io/benchmarks/nodejs/vitest) for complete integration instructions.

## Installation

First, install the plugin [`@codspeed/vitest-plugin`](https://www.npmjs.com/package/@codspeed/vitest-plugin) and `vitest` (if not already installed):

> [!NOTE]
> The CodSpeed plugin is only compatible with
> [vitest@1.2.2](https://www.npmjs.com/package/vitest/v/1.2.2)
> and above.

```sh
npm install --save-dev @codspeed/vitest-plugin vitest
```

or with `yarn`:

```sh
yarn add --dev @codspeed/vitest-plugin vitest
```

or with `pnpm`:

```sh
pnpm add --save-dev @codspeed/vitest-plugin vitest
```

## Usage

Let's create a fibonacci function and benchmark it with `vitest.bench`:

```ts title="benches/fibo.bench.ts"
import { describe, bench } from "vitest";

function fibonacci(n: number): number {
  if (n < 2) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

describe("fibonacci", () => {
  bench("fibonacci10", () => {
    fibonacci(10);
  });

  bench("fibonacci15", () => {
    fibonacci(15);
  });
});
```

Create or update your `vitest.config.ts` file to use the CodSpeed runner:

```ts title="vitest.config.ts"
import { defineConfig } from "vitest/config";
import codspeedPlugin from "@codspeed/vitest-plugin";

export default defineConfig({
  plugins: [codspeedPlugin()],
  // ...
});
```

Finally, run your benchmarks (here with `pnpm`):

```bash
$ pnpm vitest bench --run
[CodSpeed] bench detected but no instrumentation found, falling back to default vitest runner

... Regular `vitest bench` output
```

And... Congrats 🎉, CodSpeed is installed in your benchmarking suite! Locally, CodSpeed will fallback to vitest since the instrumentation is only available in the CI environment for now.

You can now [run those benchmarks in your CI](https://docs.codspeed.io/benchmarks/nodejs/vitest#running-the-benchmarks-in-your-ci) to continuously get consistent performance measurements.
