# openapi-core

See https://github.com/Redocly/redocly-cli

> [!IMPORTANT]
> The `openapi-core package` is designed for our internal use; the interfaces that are considered safe to use are documented below.
> Some of the function arguments are not documented below because they are not intended for public use.
> Avoid using any functions or features that are not documented below.
> If your use case is not documented below, please open an issue.

## Basic usage

### Lint from file system

[Lint](https://redocly.com/docs/cli/commands/lint/) a file, optionally with a [config file](https://redocly.com/docs/cli/configuration/).

```js
import { lint, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = await loadConfig({ configPath: 'optional/path/to/redocly.yaml' });
const lintResults = await lint({ ref: pathToApi, config });
```

The content of `lintResults` describes any errors or warnings found during linting; an empty array means no problems were found.
For each problem, the rule, severity, feedback message and a location object are provided.
To learn more, [check the `lint` function section](#lint).

### Bundle from file system

[Bundle](https://redocly.com/docs/cli/commands/bundle/) an API description into a single structure, optionally with a [config file](https://redocly.com/docs/cli/configuration/).

```js
import { bundle, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = await loadConfig({ configPath: 'optional/path/to/redocly.yaml' });
const bundleResults = await bundle({ ref: pathToApi, config });
```

In `bundleResults`, the `bundle.parsed` field has the bundled API description.
For more information, [check the `bundle` function section](#bundle).

### Lint from memory with config

[Lint](https://redocly.com/docs/cli/commands/lint/) an API description, with configuration defined. This is useful if the API description you're working with isn't a file on disk.

```js
import { lintFromString, createConfig, stringifyYaml } from '@redocly/openapi-core';

const config = await createConfig(
  {
    extends: ['minimal'],
    rules: {
      'operation-description': 'error',
    },
  },
  {
    // optionally provide config path for resolving $refs and proper error locations
    configPath: 'optional/path/to/redocly.yaml',
  }
);
const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const lintResults = await lintFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

### Lint from memory with a custom plugin

[Lint](https://redocly.com/docs/cli/commands/lint/) an API description, with configuration including a [custom plugin](https://redocly.com/docs/cli/custom-plugins/) to define a rule.

```js
import { lintFromString, createConfig, stringifyYaml } from '@redocly/openapi-core';

const CustomRule = (ruleOptions) => {
  return {
    Operation() {
      // some rule logic
    },
  };
};

const config = await createConfig({
  extends: ['recommended'],
  plugins: [
    {
      id: 'pluginId',
      rules: {
        oas3: {
          customRule1: CustomRule,
        },
        oas2: {
          customRule1: CustomRule, // if the same rule can handle both oas3 and oas2
        },
      },
      decorators: {
        // ...
      },
    },
  ],
  // enable rule
  rules: {
    'pluginId/customRule1': 'error',
  },
  decorators: {
    // ...
  },
});

const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const lintResults = await lintFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

### Bundle from memory

[Bundle](https://redocly.com/docs/cli/commands/bundle/) an API description into a single structure, using default configuration.

```js
import { bundleFromString, createConfig } from '@redocly/openapi-core';

const config = await createConfig({}); // create empty config
const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const bundleResults = await bundleFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

## API

### `createConfig`

Creates a config object from a JSON or YAML string or JS object.
Resolves remote config from `extends` (if there are URLs or local fs paths).

```ts
async function createConfig(
  // JSON or YAML string or object with Redocly config
  config: string | RawUniversalConfig,
  options?: {
    // optional path to the config file for resolving $refs and proper error locations
    configPath?: string;
  }
): Promise<Config>;
```

### `loadConfig`

Loads a config object from a file system. If `configPath` is not provided,
it tries to find `redocly.yaml` in the current working directory.

```ts
async function loadConfig(options?: {
  // optional path to the config file for resolving $refs and proper error locations
  configPath?: string;
  // allows to add custom `extends` additionally to one from the config file
  customExtends?: string[];
}): Promise<Config>;
```

### `lint`

Lint an OpenAPI document from the file system.

```ts
async function lint(options: {
  // path to the OpenAPI document root
  ref: string;
  // config object
  config: Config;
}): Promise<NormalizedProblem[]>;
```

### `lintFromString`

Lint an OpenAPI document from a string.

```ts
async function lintFromString(options: {
  // OpenAPI document string
  source: string;
  // optional path to the OpenAPI document for resolving $refs and proper error locations
  absoluteRef?: string;
  // config object
  config: Config;
}): Promise<NormalizedProblem[]>;
```

### `bundle`

Bundle an OpenAPI document from the file system.

```ts
async function bundle(options: {
  // path to the OpenAPI document root
  ref: string;
  // config object
  config: Config;
  // whether to fully dereference $refs, resulting document won't have any $ref
  // warning: this can produce circular objects
  dereference?: boolean;
  // whether to remove unused components (schemas, parameters, responses, etc)
  removeUnusedComponents?: boolean;
  // whether to keep $ref pointers to the http URLs and resolve only local fs $refs
  keepUrlRefs?: boolean;
}): Promise<{
    bundle: {
      parsed: object; // OpenAPI document object as js object
    };
    problems: NormalizedProblem[]
    fileDependencies
    rootType
    refTypes
    visitorsData

  }>;
```

### `bundleFromString`

Bundle an OpenAPI document from a string.

```ts
async function bundleFromString(options: {
  // OpenAPI document string
  source: string;
  // optional path to the OpenAPI document for resolving $refs and proper error locations
  absoluteRef?: string;
  // config object
  config: Config;
  // whether to fully dereference $refs, resulting document won't have any $ref
  // warning: this can produce circular objects
  dereference?: boolean;
  // whether to remove unused components (schemas, parameters, responses, etc)
  removeUnusedComponents?: boolean;
  // whether to keep $ref pointers to the http URLs and resolve only local fs $refs
  keepUrlRefs?: boolean;
}): Promise<{
    bundle: {
      parsed: object; // OpenAPI document object as js object
    };
    problems: NormalizedProblem[]
    fileDependencies
    rootType
    refTypes
    visitorsData

  }>;
```

### `stringifyYaml`

Helper function to stringify a javascript object to YAML.

```ts
function stringifyYaml(obj: object): string;
```
