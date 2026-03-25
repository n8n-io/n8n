# @redocly/cli

## 1.28.5

### Patch Changes

- Fixed an issue where the `build-docs` command produced incorrect output.
- Updated @redocly/openapi-core to v1.28.5.

## 1.28.4

### Patch Changes

- Fixed an issue where the `build-docs` command failed when React 19 was installed in the project folder.
- Updated @redocly/openapi-core to v1.28.4.

## 1.28.3

### Patch Changes

- Updated @redocly/openapi-core to v1.28.3.

## 1.28.2

### Patch Changes

- Updated @redocly/openapi-core to v1.28.2.

## 1.28.1

### Patch Changes

- Updated @redocly/openapi-core to v1.28.1.

## 1.28.0

### Minor Changes

- Switched to using native `fetch` API instead of `node-fetch` dependency, improving performance and reducing bundle size.

### Patch Changes

- Updated @redocly/openapi-core to v1.28.0.

## 1.27.2

### Patch Changes

- Updated the `sideNavStyle` configuration schema to include the `path-only` option.
- Updated @redocly/openapi-core to v1.27.2.

## 1.27.1

### Patch Changes

- Fixed an issue where running the `preview` command failed because one of its dependencies could not be resolved.
  The issue occurred when Realm was not installed in the `node_modules` of the project.
- Updated @redocly/openapi-core to v1.27.1.

## 1.27.0

### Minor Changes

- Added the ability to override default problem messages for built-in rules.

### Patch Changes

- Fixed an issue where `apis`' root in `redocly.yaml` was not resolved properly when the value of `root` was a URL.
- Updated the Redocly CLI command `redocly build-docs` to use `stdout` instead of `stderr` for simple logs.
- Updated @redocly/openapi-core to v1.27.0.

## 1.26.1

### Patch Changes

- Fixed an issue where an API alias's root path might be resolved incorrectly for configuration files located outside the root folder.
- Updated @redocly/openapi-core to v1.26.1.

## 1.26.0

### Minor Changes

- Introduced the `struct` rule and deprecated the `spec` rule.
  Added the `spec` ruleset, which enforces compliance with the specifications.

### Patch Changes

- Fixed an issue where the CLI would fail to run on Windows due to a breaking change in the Node.js API.
- Fixed an issue where `join` would throw an error when a glob pattern was provided.
- Updated `sourceDescriptions` to enforce a valid type field, ensuring compliance with the Arazzo specification.
- Updated @redocly/openapi-core to v1.26.0.

## 1.25.15

### Patch Changes

- Clarified usage of the `--output` option in the `bundle` command.
- Updated @redocly/openapi-core to v1.25.15.

## 1.25.14

### Patch Changes

- Resolved an issue where overrides for the severity of configurable rules were ignored.
- Updated @redocly/openapi-core to v1.25.14.

## 1.25.13

### Patch Changes

- Added the possibility to skip configurable rules using the `--skip-rule` option.
- Updated @redocly/openapi-core to v1.25.13.

## 1.25.12

### Patch Changes

- Fixed an issue where valid Redocly tokens were not recognized.
- Updated @redocly/openapi-core to v1.25.12.

## 1.25.11

### Patch Changes

- Fixed an issue with the `remove-x-internal` decorator where bundling API descriptions containing discriminators could fail when using **Node.js** v17 or earlier.
- Fixed API descriptions bundling. Previously, schemas containing nulls in examples were causing failures.
- Updated @redocly/openapi-core to v1.25.11.

## 1.25.10

### Patch Changes

- Fixed `component-name-unique` problems to include correct location.
- Fixed the `remove-x-internal` decorator, which was not removing the reference in the corresponding discriminator mapping while removing the original `$ref`.
- Updated @redocly/openapi-core to v1.25.10.

## 1.25.9

### Patch Changes

- Updated @redocly/openapi-core to v1.25.9.

## 1.25.8

### Patch Changes

- Added the `REDOCLY_SUPPRESS_UPDATE_NOTICE` environment variable so that users can skip version updates.
- Fixed bundling with the `--dereferenced` option. Previously, references to external files were not substituted with references to components, causing them to become invalid.
- Fixed an issue where using `externalValue` as a property name was causing the API description validation process to fail.
- Updated @redocly/openapi-core to v1.25.8.

## 1.25.7

### Patch Changes

- Updated redoc to v2.2.0.
- Removed the support of the `x-inherit` extension for Arazzo description files.
- Updated @redocly/openapi-core to v1.25.7.

## 1.25.6

### Patch Changes

- Changed the `x-operation` extension in Arazzo, enabling users to make requests with this extension without an API description file.
- Removed the support of the `x-parameters` extension for Arazzo description files.
- Updated @redocly/openapi-core to v1.25.6.

## 1.25.5

### Patch Changes

- Fixed an issue where the bundle command did not resolve links in `externalValue`.
- Fixed an issue where the plugins in external NPM packages could not be resolved if the CLI package was installed globally.
- Updated @redocly/openapi-core to v1.25.5.

## 1.25.4

### Patch Changes

- Added a warning message to the `push` and `push-status` commands to notify users about upcoming or ongoing resource deprecation.
- Updated @redocly/openapi-core to v1.25.4.

## 1.25.3

### Patch Changes

- Updated @redocly/openapi-core to v1.25.3.

## 1.25.2

### Patch Changes

- Fixed `camelCase` assertion for single-letter values.
- Updated @redocly/openapi-core to v1.25.2.

## 1.25.1

### Patch Changes

- Added additional checks to `criteria-unique` Arazzo rule.
- Updated @redocly/openapi-core to v1.25.1.

## 1.25.0

### Minor Changes

- Added a cache for resolved plugins to ensure that plugins are only instantiated once during a single execution.

### Patch Changes

- Updated @redocly/openapi-core to v1.25.0.

## 1.24.0

### Minor Changes

- Added Spot and Arazzo rules: `no-criteria-xpath`, `no-actions-type-end`, `criteria-unique`.

### Patch Changes

- Fixed an issue where custom rules were not applied to Arazzo descriptions.
- Updated @redocly/openapi-core to v1.24.0.

## 1.23.1

### Patch Changes

- Fixed a bug where bundling multiple API description files specified as CLI arguments, along with the `--output` option, stored the result in a single file instead of a folder.
- Updated @redocly/openapi-core to v1.23.1.

## 1.23.0

### Minor Changes

- Added support for the `output` option in the per-API configuration so that the destination file can be specified in configuration.

### Patch Changes

- Fixed the absolute path for importing plugins in Windows.
- Added the ability to run the `eject` command without specifying components, which displays a selectable list of all available components.
- Updated @redocly/openapi-core to v1.23.0.

## 1.22.1

### Patch Changes

- Updated @redocly/openapi-core to v1.22.1.

## 1.22.0

### Minor Changes

- Updated the Arazzo validation types for workflows input, parameter objects, and criteria to match the specification.
- Added Arazzo rulesets so that users can customize their linting rules for this format.

### Patch Changes

- Updated @redocly/openapi-core to v1.22.0.

## 1.21.1

### Patch Changes

- Updated @redocly/openapi-core to v1.21.1.

## 1.21.0

### Minor Changes

- Added the `eject` and `translate` commands for use with the new Reunite-hosted product family.

### Patch Changes

- Updated @redocly/openapi-core to v1.21.0.

## 1.20.1

### Patch Changes

- Get more helpful error messages when there's a problem importing a plugin.
- Updated @redocly/openapi-core to v1.20.1.

## 1.20.0

### Minor Changes

- Added support for ESM plugins and importing of plugins directly from npm package: `@vendor/package/plugin.js` instead of `./node_modules/@vendor/package/plugin.js`.
- Added `info-license-strict` rule as a replacement of the `info-license-url` to support the OpenAPI 3.1 changes to allow identifier or URL license details.
- Changed plugins format to export a function instead of an object for compatibility with other Redocly products. The backwards compatibility with an old format of plugins is maintained.

### Patch Changes

- Added support for webhooks in stats and fixed a crash that occurred when tags were not included in webhooks.
- Updated @redocly/openapi-core to v1.20.0.

## 1.19.0

### Minor Changes

- Added support for AsyncAPI 3.0 description linting.

### Patch Changes

- Fixed an issue where `patternProperties` incorrectly caused linting errors due to a missing `PatternProperties` node.
- Updated @redocly/openapi-core to v1.19.0.

## 1.18.1

### Patch Changes

- Allowed the `theme.openapi` configuration option to accept settings specific to Redoc 2.x and earlier.
- Fixed an issue in the OpenAPI `spec` rule where `dependentSchemas` was parsed as an array.
  It is now correctly parsed as a map.
- Fixed bundling of `$refs` inside `patternProperties`.
- Updated AsyncAPI v2 typings to abide by JSON Schema draft-07 specification.
- Updated @redocly/openapi-core to v1.18.1.

## 1.18.0

### Minor Changes

- Added support for Arazzo description linting.

### Patch Changes

- Removed `additionalItems` from OAS 3.0.x typings. This keyword is not supported by the specification.
- Updated @redocly/openapi-core to v1.18.0.

## 1.17.1

### Patch Changes

- Added JSON Schema draft 2019-09+ validation keyword - `dependentRequired`.
- Updated @redocly/openapi-core to v1.17.1.

## 1.17.0

### Minor Changes

- Changed resolution process to include extendedTypes and plugins before linting.

### Patch Changes

- Added support for the `contentSchema` keyword to parse as a schema instance.
- Replace path items emoji with 🔀 so the width is consistent.
- Updated @redocly/openapi-core to v1.17.0.

## 1.16.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

### Patch Changes

- Updated @redocly/openapi-core to v1.16.0.

## 1.15.0

### Minor Changes

- Made `redocly.yaml` validation consistent with the general Redocly config.

### Patch Changes

- Updated Redoc to v2.1.5.
- Fixed `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules which allowed falsy example values to pass for any schema.
- Updated @redocly/openapi-core to v1.15.0.

## 1.14.0

### Minor Changes

- Added the ability to exclude some operations or entire paths from the `security-defined` rule.

### Patch Changes

- Improved error messages.
- Updated @redocly/openapi-core to v1.14.0.

## 1.13.0

### Minor Changes

- Added support for the linting command to output markdown format.

### Patch Changes

- Updated @redocly/openapi-core to v1.13.0.

## 1.12.2

### Patch Changes

- Updated @redocly/openapi-core to v1.12.2.

## 1.12.1

### Patch Changes

- Updated @redocly/openapi-core to v1.12.1.

## 1.12.0

### Minor Changes

- Added return values for the `push` and `push-status` commands.

### Patch Changes

- Fixed handling of wildcards on Windows ([#1521](https://github.com/Redocly/redocly-cli/issues/1521)).
- Updated @redocly/openapi-core to v1.12.0.

## 1.11.0

### Minor Changes

- Removed additional operations from the `join` command; use `lint` and/or `bundle` for operations such as `lint` and `decorate`.
- Removed lint support from the bundle command to support a wider range of use cases. Users should update to [run lint and bundle separately](https://redocly.com/docs/cli/guides/lint-and-bundle/).
- Added support for a `github-actions` output format for the `lint` command to annotate reported problems on files when used in a GitHub Actions workflow.

### Patch Changes

- Fixed [`no-invalid-media-type-examples`](https://redocly.com/docs/cli/rules/no-invalid-media-type-examples/) rule `externalValue` example validation.
- Updated @redocly/openapi-core to v1.11.0.

## 1.10.6

### Patch Changes

- Added `check-config` command to validate a Redocly configuration file.
- Updated @redocly/openapi-core to v1.10.6.

## 1.10.5

### Patch Changes

- Updated license text for date and organization naming accuracy.
- Updated @redocly/openapi-core to v1.10.5.

## 1.10.4

### Patch Changes

- Fixed a problem with the `preview` command crashing on Windows by adding operating system detection for the correct `npx` executable to use.
- Updated @redocly/openapi-core to v1.10.4.

## 1.10.3

### Patch Changes

- Reverted "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.
- Updated @redocly/openapi-core to v1.10.3.

## 1.10.2

### Patch Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.
- Updated @redocly/openapi-core to v1.10.2.

## 1.10.1

### Patch Changes

- Updated @redocly/openapi-core to v1.10.1.

## 1.10.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

### Patch Changes

- Added inflection to the `join` command so that `--prefix-components-with-info-prop` replaces spaces with underscores to create less confusing $refs.
- Updated @redocly/openapi-core to v1.10.0.

## 1.9.1

### Patch Changes

- Adds support for using logical AND for the security schema so that the `join` command generates the correct schema.
- Fixed a bug with resolving $refs to file names that contain the hash symbol.
- Fixed a problem where the `join` command did not process schemas containing `null` values when the `--prefix-components-with-info-prop` option was used.'
- Updated @redocly/openapi-core to v1.9.1.

## 1.9.0

### Minor Changes

- - Removed descriptions adding for x-tagGroups for the `join` command. Descriptions in x-tagGroups are not supported and cause errors on linting.
  - Updated `info.title` to be used as a name in x-tagGroups instead of a file name for the `join` command, so you can now join files with the same names.
- Added new `no-required-schema-properties-undefined` rule to check if each required schema property is defined.

### Patch Changes

- Fixed an issue where using the `--prefix-components-with-info-prop` option with the `join` command caused `$refs` to include duplicated prefixes.
- Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.
- Updated @redocly/openapi-core to v1.9.0.

## 1.8.2

### Patch Changes

- Added markdown format option to stats command for use with GitHub job summaries.
- Fixed an issue with the `push` command, when `destination` option does not work without specifying it in `redocly.yaml`.
- Updated @redocly/openapi-core to v1.8.2.

## 1.8.1

### Patch Changes

- Added git to the docker image, so the push command can use git metadata.
- Updated @redocly/openapi-core to v1.8.1.

## 1.8.0

### Minor Changes

- Added a `push` and `push-status` command for use with future Redocly products.

### Patch Changes

- Updated @redocly/openapi-core to v1.8.0.

## 1.7.0

### Minor Changes

- Added a `preview` command that starts a local preview server for Redocly projects that use products that are currently in a pre-release stage.

### Patch Changes

- Fixed an issue with resolving references after splitting API descriptions written in the json format.
- Added filename extension support for more `x-codeSamples` languages.
- Fixed a problem where the linter incorrectly returned an error for valid examples that contain references.
- Updated @redocly/openapi-core to v1.7.0.

## 1.6.0

### Minor Changes

- Added the ability to use `$ref` in the Redocly config file. This ability allows users to split up big config files and maintain their constituent parts independently.

### Patch Changes

- Deprecated `--lint` option in the `join` command. The options are marked for removal in a future release. Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs.
- Updated @redocly/openapi-core to v1.6.0.

## 1.5.0

### Minor Changes

- Added new rule `array-parameter-serialization` to require that serialization parameters `style` and `explode` are present on array parameters.

### Patch Changes

- Deprecated lint-related options in the `bundle` command. The options are going to be removed in the subsequent releases.
  Use the [lint command](https://redocly.com/docs/cli/commands/lint/) separately to lint your APIs before bundling.
- Updated Redoc to v2.1.3.
- Updated @redocly/openapi-core to v1.5.0.

## 1.4.1

### Patch Changes

- Fixed an issue with resolving the `node-fetch` package by explicitly adding the missing dependency.
- Updated @redocly/openapi-core to v1.4.1.

## 1.4.0

### Minor Changes

- Added `recommended-strict` ruleset which uses the same rules as `recommended` but with the severity level set to `error` for all rules.
- Add JSON output support to the `split` and `join` commands.

### Patch Changes

- The `--host/-h` argument in the `preview-docs` command is now also used by the WebSocket server for hot reloading.
- Updated @redocly/openapi-core to v1.4.0.

## 1.3.0

### Minor Changes

- Added the possibility to configure the linting severity level of the configuration file for all CLI commands.
  Redocly CLI will exit with an error if there are any issues with the configuration file, and the severity is set to `error`.

### Patch Changes

- Updated @redocly/openapi-core to v1.3.0.

## 1.2.1

### Patch Changes

- Fixed an issue with nested refs in the `join` command.
- Fixed pattern for no-server-example.com rule to improve detection accuracy.
- Changed the report location for `pattern` and `notPattern` assertions to be more precise.
- Updated `unevaluatedItems` type definition to resolve either boolean or object schema per JSON Schema 2019-09 specification.
- Updated @redocly/openapi-core to v1.2.1.

## 1.2.0

### Minor Changes

- Added support for linting AsyncAPI v2 files, so that a wider range of API descriptions can use the Redocly linting workflow.

### Patch Changes

- Renamed API definition to API description for consistency.
- Updated @redocly/openapi-core to v1.2.0.

## 1.1.0

### Minor Changes

- Added `ignoreCase` option for `tags-alphabetical` rule.
- Added `join` support for OAS 3.1 definitions.
- Added support for Redoc v2.1.2, and aligned the dependencies for both projects.

### Patch Changes

- Fixed an issue where the `--remove-unused-components` option removed used components that were referenced as child objects.
- Updated Redocly config validation.
- Fixed the location pointer when reporting on the `no-path-trailing-slash` rule.
- Updated minimum required version of Node.js to v14.19.0, NPM to v7.0.0, and removed deprecated packages.
- Updated @redocly/openapi-core to v1.1.0.

## 1.0.2

### Patch Changes

- No code changes.
- Updated @redocly/openapi-core to v1.0.2.

## 1.0.1

### Patch Changes

- Fixed the build-docs command failing when running outside the root folder.
- Updated @redocly/openapi-core to v1.0.1.
