# @vitest/browser-playwright

[![NPM version](https://img.shields.io/npm/v/@vitest/browser-playwright?color=a1b858&label=)](https://www.npmjs.com/package/@vitest/browser-playwright)

Run your Vitest [browser tests](https://vitest.dev/guide/browser/) using [playwright](https://playwright.dev/docs/api/class-playwright) API. Note that Vitest does not use playwright as a test runner, but only as a browser provider.

We recommend using this package if you are already using playwright in your project or if you do not have any E2E tests yet.

## Installation

Install the package with your favorite package manager:

```sh
npm install -D @vitest/browser-playwright
# or
yarn add -D @vitest/browser-playwright
# or
pnpm add -D @vitest/browser-playwright
```

Then specify it in the `browser.provider` field of your Vitest configuration:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      provider: playwright({
        // ...custom playwright options
      }),
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
```

Then run Vitest in the browser mode:

```sh
npx vitest --browser
```

[GitHub](https://github.com/vitest-dev/vitest/tree/main/packages/browser-playwright) | [Documentation](https://vitest.dev/config/browser/playwright)
