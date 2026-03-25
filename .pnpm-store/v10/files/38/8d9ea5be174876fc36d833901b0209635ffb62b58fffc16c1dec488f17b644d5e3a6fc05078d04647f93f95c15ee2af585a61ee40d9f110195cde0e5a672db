# @redocly/openapi-core

## 1.28.5

## 1.28.4

## 1.28.3

### Patch Changes

- Added support for the `query` HTTP method in Arazzo operation definitions to enhance API interaction capabilities.

## 1.28.2

### Patch Changes

- Added support for Arazzo version 1.0.1 in Spot validation rules.

## 1.28.1

### Patch Changes

- Resolved an issue where overrides for the severity of configurable rules raised warnings when validating the config.

## 1.28.0

### Minor Changes

- Switched to using native `fetch` API instead of `node-fetch` dependency, improving performance and reducing bundle size.

### Patch Changes

- Removed support for `in: body` parameters due to Arazzo specification updates.
- Updated typings for OAS 3.0 and OAS 3.1 Schemas.

## 1.27.2

### Patch Changes

- Updated the `sideNavStyle` configuration schema to include the `path-only` option.
- Updated @redocly/config to v0.20.1.

## 1.27.1

### Patch Changes

- Fixed an issue where running the `preview` command failed because one of its dependencies could not be resolved.
  The issue occurred when Realm was not installed in the `node_modules` of the project.

## 1.27.0

### Minor Changes

- Added the ability to override default problem messages for built-in rules.

### Patch Changes

- Updated Spot validation rules.

## 1.26.1

### Patch Changes

- Removed the `no-actions-type-end` Spot rule.
- Removed unused lodash.isequal dependency.

## 1.26.0

### Minor Changes

- Introduced the `struct` rule and deprecated the `spec` rule.
  Added the `spec` ruleset, which enforces compliance with the specifications.

### Patch Changes

- Updated `sourceDescriptions` to enforce a valid type field, ensuring compliance with the Arazzo specification.

## 1.25.15

### Patch Changes

- Removed the support of the `x-expect` extension for Arazzo.
- Updated @redocly/config to v0.17.0.

## 1.25.14

### Patch Changes

- Resolved an issue where overrides for the severity of configurable rules were ignored.

## 1.25.13

### Patch Changes

- Added the possibility to skip configurable rules using the `--skip-rule` option.

## 1.25.12

### Patch Changes

- Fixed an issue where valid Redocly tokens were not recognized.

## 1.25.11

### Patch Changes

- Fixed an issue with the `remove-x-internal` decorator where bundling API descriptions containing discriminators could fail when using **Node.js** v17 or earlier.
- Fixed API descriptions bundling. Previously, schemas containing nulls in examples were causing failures.

## 1.25.10

### Patch Changes

- Fixed `component-name-unique` problems to include correct location.
- Fixed the `remove-x-internal` decorator, which was not removing the reference in the corresponding discriminator mapping while removing the original `$ref`.
- Updated @redocly/config to v0.16.0.

## 1.25.9

### Patch Changes

- Updated @redocly/config to v0.15.0.

## 1.25.8

### Patch Changes

- Fixed bundling with the `--dereferenced` option. Previously, references to external files were not substituted with references to components, causing them to become invalid.
- Fixed an issue where using `externalValue` as a property name was causing the API description validation process to fail.

## 1.25.7

### Patch Changes

- Removed the support of the `x-inherit` extension for Arazzo description files.

## 1.25.6

### Patch Changes

- Changed the `x-operation` extension in Arazzo, enabling users to make requests with this extension without an API description file.
- Removed support of the `x-assert` extension for Arazzo.
- Removed the support of the `x-parameters` extension for Arazzo description files.

## 1.25.5

### Patch Changes

- Fixed an issue where the bundle command did not resolve links in `externalValue`.
- Fixed an issue where the plugins in external NPM packages could not be resolved if the CLI package was installed globally.

## 1.25.4

### Patch Changes

- Updated @redocly/config to v0.12.1.

## 1.25.3

### Patch Changes

- Updated @redocly/config to v0.11.0.

## 1.25.2

### Patch Changes

- Fixed `camelCase` assertion for single-letter values.

## 1.25.1

### Patch Changes

- Added additional checks to `criteria-unique` Arazzo rule.

## 1.25.0

### Minor Changes

- Added a mechanism that resolves plugin properties specific to the Reunite-hosted product family.
- Added a cache for resolved plugins to ensure that plugins are only instantiated once during a single execution.

## 1.24.0

### Minor Changes

- Added Spot and Arazzo rules: `no-criteria-xpath`, `no-actions-type-end`, `criteria-unique`.

### Patch Changes

- Updated @redocly/ajv to v8.11.2.
- Fixed an issue where custom rules were not applied to Arazzo descriptions.

## 1.23.1

## 1.23.0

## 1.22.1

### Patch Changes

- Fixed an issue where resolving config in the browser always threw an error.

## 1.22.0

### Minor Changes

- Updated the Arazzo validation types for workflows input, parameter objects, and criteria to match the specification.
- Added Arazzo rulesets so that users can customize their linting rules for this format.

### Patch Changes

- Updated @redocly/config to v0.10.1.

## 1.21.1

### Patch Changes

- Updated @redocly/config to v0.10.0.

## 1.21.0

## 1.20.1

## 1.20.0

### Minor Changes

- Added support for ESM plugins and importing of plugins directly from npm package: `@vendor/package/plugin.js` instead of `./node_modules/@vendor/package/plugin.js`.
- Added `info-license-strict` rule as a replacement of the `info-license-url` to support the OpenAPI 3.1 changes to allow identifier or URL license details.
- Changed plugins format to export a function instead of an object for compatibility with other Redocly products. The backwards compatibility with an old format of plugins is maintained.

### Patch Changes

- Updated @redocly/config to v0.9.0.

## 1.19.0

### Minor Changes

- Added support for AsyncAPI 3.0 description linting.

### Patch Changes

- Fixed an issue where `patternProperties` incorrectly caused linting errors due to a missing `PatternProperties` node.

## 1.18.1

### Patch Changes

- Allowed the `theme.openapi` configuration option to accept settings specific to Redoc 2.x and earlier.
- Fixed an issue in the OpenAPI `spec` rule where `dependentSchemas` was parsed as an array.
  It is now correctly parsed as a map.
- Fixed bundling of `$refs` inside `patternProperties`.
- Updated AsyncAPI v2 typings to abide by JSON Schema draft-07 specification.

## 1.18.0

### Minor Changes

- Added support for Arazzo description linting.

### Patch Changes

- Removed `additionalItems` from OAS 3.0.x typings. This keyword is not supported by the specification.

## 1.17.1

### Patch Changes

- Added JSON Schema draft 2019-09+ validation keyword - `dependentRequired`.
- Updated @redocly/config to v0.6.2.

## 1.17.0

### Minor Changes

- Changed resolution process to include extendedTypes and plugins before linting.

### Patch Changes

- Added support for the `contentSchema` keyword to parse as a schema instance.

## 1.16.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.15.0

### Minor Changes

- Made `redocly.yaml` validation consistent with the general Redocly config.

### Patch Changes

- Fixed `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules which allowed falsy example values to pass for any schema.

## 1.14.0

### Minor Changes

- Added the ability to exclude some operations or entire paths from the `security-defined` rule.

## 1.13.0

### Minor Changes

- Added support for the linting command to output markdown format.

## 1.12.2

### Patch Changes

- Improved the experience when the config file doesn't exist or isn't found.

## 1.12.1

### Patch Changes

- Improved loading of configuration files in environments different from Node.js.

## 1.12.0

### Patch Changes

- Improved caching for external configuration resources.

## 1.11.0

### Minor Changes

- Added support for a `github-actions` output format for the `lint` command to annotate reported problems on files when used in a GitHub Actions workflow.

### Patch Changes

- Fixed [`no-invalid-media-type-examples`](https://redocly.com/docs/cli/rules/no-invalid-media-type-examples/) rule `externalValue` example validation.
- Process remove-unused-components rule transitively; components are now removed if they were previously referenced by a removed component.

## 1.10.6

### Patch Changes

- Added a type tree for the `metadata-schema` rule.

## 1.10.5

### Patch Changes

- Updated license text for date and organization naming accuracy.

## 1.10.4

### Patch Changes

- Added a platform check so `@redocly/openapi-core` can support running inside a worker.
- Allowed additional properties in `theme.openapi` config schema to enable libraries that use `@redocly/openapi-core` for configuration linting to extend this part of the schema.

## 1.10.3

### Patch Changes

- Reverted "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.

## 1.10.2

### Patch Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.10.1

### Patch Changes

- fix: Revert "Users can run the CLI tool behind a proxy by using HTTP_PROXY or HTTPS_PROXY environment variables to configure the proxy settings" temporary.

## 1.10.0

### Minor Changes

- Users can run the CLI tool behind a proxy by using `HTTP_PROXY` or `HTTPS_PROXY` environment variables to configure the proxy settings.

## 1.9.1

### Patch Changes

- Fixed a bug with resolving $refs to file names that contain the hash symbol.

## 1.9.0

### Minor Changes

- Added new `no-required-schema-properties-undefined` rule to check if each required schema property is defined.

### Patch Changes

- Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.

## 1.8.2

## 1.8.1

## 1.8.0

## 1.7.0

### Patch Changes

- Fix schema type of AsyncAPI operation tags
- Fixed a problem where the linter incorrectly returned an error for valid examples that contain references.

## 1.6.0

### Minor Changes

- Added the ability to use `$ref` in the Redocly config file. This ability allows users to split up big config files and maintain their constituent parts independently.

## 1.5.0

### Minor Changes

- Added new rule `array-parameter-serialization` to require that serialization parameters `style` and `explode` are present on array parameters.

## 1.4.1

### Patch Changes

- OpenAPI 3.1.x defaults to JSON Schema draft 2020-12 and the value of property names defined in `properties` was updated since OpenAPI 3.0.x and JSON Schema draft-04.

  In the new JSON Schema specification, each property value within a `properties` schema accepts a `boolean` or `object` schema.

  https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.2.1

- Fixed incorrect browser detection by removing check for 'self' as Bun also exposes it by default.

## 1.4.0

### Minor Changes

- Added `recommended-strict` ruleset which uses the same rules as `recommended` but with the severity level set to `error` for all rules.

## 1.3.0

### Minor Changes

- Added the possibility to configure the linting severity level of the configuration file for all CLI commands.
  Redocly CLI will exit with an error if there are any issues with the configuration file, and the severity is set to `error`.

## 1.2.1

### Patch Changes

- Fixed an issue with nested refs in the `join` command.
- Fixed pattern for no-server-example.com rule to improve detection accuracy.
- Changed the report location for `pattern` and `notPattern` assertions to be more precise.
- Updated `unevaluatedItems` type definition to resolve either boolean or object schema per JSON Schema 2019-09 specification.
- Enhanced public API by small typescript typing fix and exporting new function `bundleFromString`.

## 1.2.0

### Minor Changes

- Added support for linting AsyncAPI v2 files, so that a wider range of API descriptions can use the Redocly linting workflow.

### Patch Changes

- Renamed API definition to API description for consistency.

## 1.1.0

### Minor Changes

- Added `ignoreCase` option for `tags-alphabetical` rule.

### Patch Changes

- Fixed an issue where the `--remove-unused-components` option removed used components that were referenced as child objects.
- Updated Redocly config validation.
- Fixed the location pointer when reporting on the `no-path-trailing-slash` rule.

## 1.0.2

## 1.0.1

### Patch Changes

- Fixed empty custom rules having severity in default rulesets.
