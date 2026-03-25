# Visual Tests Addon for Storybook

Run visual tests on your stories and compare changes with the latest baselines to catch UI regressions early in development. Supports multiple viewports, themes, and browsers.

## Prerequisites

- Chromatic [account configured](https://www.chromatic.com/docs/setup#sign-up) with access to a project
- Storybook 7.6 or later

## Getting Started

Run the following command to install the addon and automatically configure it for your project via Storybook's CLI:

```shell
npx storybook add @chromatic-com/storybook
```

Start Storybook and navigate to the Visual Tests panel to run your first visual test with Chromatic!

## Configuration

By default, the addon offers zero-config support to run visual tests with Storybook and Chromatic. However, if you need, you can customize it by providing a few options. See the [Chromatic documentation](https://www.chromatic.com/docs/visual-tests-addon/) for more information on configuring and using it with your Storybook.

## Getting Help

If you have any questions or need help with the addon, please get in touch with the Chromatic team. [Sign in](https://www.chromatic.com/start) to your Chromatic account and click the chat icon in the bottom right corner of the screen to start a conversation with us.

## Contributing

We welcome contributions! If you're a maintainer, refer to the following [instructions](./Development.md) to set up your development environment with Chromatic.

### Updating the GraphQL schema

The addon uses the Chromatic public GraphQL API. We rely on its schema to generate type definitions. The schema needs to be manually updated whenever it changes.
To update, take https://github.com/chromaui/chromatic/blob/main/lib/schema/public-schema.graphql and save it under `src/gql/public-schema.graphql`.

## Troubleshooting

### Running Storybook with the addon enabled throws an error

When installed, running Storybook may lead to the following error:

```shell
const stringWidth = require('string-width');

Error [ERR_REQUIRE_ESM]: require() of ES Module /my-project/node_modules/string-width/index.js is not supported.
```

This is a [known issue](https://github.com/storybookjs/storybook/issues/22431#issuecomment-1630086092) when using an older version of the Yarn package manager (e.g., version 1.x). To solve this issue, you can [upgrade](https://yarnpkg.com/migration/guide) to the latest stable version. However, if you cannot upgrade, adjust your `package.json` file and provide a resolution field to enable the Yarn package manager to install the correct dependencies. In doing so, you may be required to delete your `node_modules` directory and `yarn.lock` file before installing the dependencies again.

```json
 "resolutions": {
    "jackspeak": "2.1.1"
  }
```

Alternatively, you could use a different package manager ([npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/installation)).

## Version compatibility

| Addon Version | Storybook Version |
| ------------- | ----------------- |
| `^4.0.0`      | `^9.0.0`          |
| `^3.0.0`      | `^8.2.0`          |
| `^2.0.2`      | `8.0.0` - `8.1.x` |

### License

[MIT](https://github.com/storybookjs/addon-coverage/blob/main/LICENSE)
