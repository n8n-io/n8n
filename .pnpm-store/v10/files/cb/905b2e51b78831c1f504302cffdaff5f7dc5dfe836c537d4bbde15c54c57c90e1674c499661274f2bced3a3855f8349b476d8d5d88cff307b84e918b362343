## Next

- **[Breaking change]** Replace `OutModules` enum by custom compiler option `mjsModule`.
- **[Breaking change]** Drop support for Pug, Sass, Angular & Webpack.
- **[Feature]** Expose custom registries for each target.
- **[Feature]** Add `dist.tscOptions` for `lib` target to override options for
  distribution builds.
- **[Feature]** Native ESM tests with mocha.
- **[Fix]** Disable deprecated TsLint rules from the default config
- **[Fix]** Remove use of experimental `fs/promises` module.
- **[Internal]** Fix continuous deployment script (stop confusing PRs to master
  with push to master)
- **[Internal]** Update dependencies
- **[Internal]** Fix deprecated Mocha types.

## 0.17.1 (2017-05-03)

- **[Fix]** Update dependencies, remove `std/esm` warning.

## 0.17.0 (2017-04-22)

- **[Breaking change]** Update dependencies. Use `esm` instead of `@std/esm`, update Typescript to `2.8.3`.
- **[Fix]** Fix Node processes spawn on Windows (Mocha, Nyc)

## 0.16.2 (2017-02-07)

- **[Fix]** Fix Typedoc generation: use `tsconfig.json` generated for the lib.
- **[Fix]** Write source map for `.mjs` files
- **[Fix]** Copy sources to `_src` when publishing a lib (#87).
- **[Internal]** Restore continuous deployment of documentation.

## 0.16.1 (2017-01-20)

- **[Feature]** Support `mocha` tests on `.mjs` files (using `@std/esm`). Enabled by default
  if `outModules` is configured to emit `.mjs`. **You currently need to add
  `"@std/esm": {"esm": "cjs"}` to your `package.json`.**

## 0.16.0 (2017-01-09)

- **[Breaking change]** Enable `allowSyntheticDefaultImports` and `esModuleInterop` by default
- **[Fix]** Allow deep module imports in default Tslint rules
- **[Fix]** Drop dependency on deprecated `gulp-util`
- **[Internal]** Replace most custom typings by types from `@types`

## 0.15.8 (2017-12-05)

- **[Fix]** Exit with non-zero code if command tested with coverage fails
- **[Fix]** Solve duplicated error message when using the `run` mocha task.
- **[Fix]** Exit with non-zero code when building scripts fails.

## 0.15.7 (2017-11-29)

- **[Feature]** Add `coverage` task to `mocha` target, use it for the default task

## 0.15.6 (2017-11-29)

- **[Fix]** Fix path to source in source maps.
- **[Fix]** Disable `number-literal-format` in default Tslint rules. It enforced uppercase for hex.
- **[Internal]** Enable integration with Greenkeeper.
- **[Internal]** Enable integration with Codecov
- **[Internal]** Enable code coverage

## 0.15.5 (2017-11-10)

- **[Feature]** Enable the following TsLint rules: `no-duplicate-switch-case`, `no-implicit-dependencies`,
  `no-return-await`
- **[Internal]** Update self-dependency `0.15.4`, this restores the README on _npm_
- **[Internal]** Add homepage and author fields to package.json

## 0.15.4 (2017-11-10)

- **[Fix]** Add support for custom additional copy for distribution builds. [#49](https://github.com/demurgos/turbo-gulp/issues/49)
- **[Internal]** Update self-dependency to `turbo-gulp`
- **[Internal]** Add link to license in `README.md`

## 0.15.3 (2017-11-09)

**Rename to `turbo-gulp`**. This package was previously named `demurgos-web-build-tools`.
This version is fully compatible: you can just change the name of your dependency.

## 0.15.2 (2017-11-09)

**The package is prepared to be renamed `turbo-gulp`.**
This is the last version released as `demurgos-web-build-tools`.

- **[Feature]** Add support for watch mode for library targets.
- **[Fix]** Disable experimental support for `*.mjs` by default.
- **[Fix]** Do not emit duplicate TS errors

## 0.15.1 (2017-10-19)

- **[Feature]** Add experimental support for `*.mjs` files
- **[Fix]** Fix support of releases from Continuous Deployment using Travis.

## 0.15.0 (2017-10-18)

- **[Fix]** Add error handling for git deployment.
- **[Internal]** Enable continuous deployment of the `master` branch.

## 0.15.0-beta.11 (2017-08-29)

- **[Feature]** Add `LibTarget.dist.copySrc` option to disable copy of source files to the dist directory.
  This allows to prevent issues with missing custom typings.
- **[Fix]** Mark `deploy` property of `LibTarget.typedoc` as optional.
- **[Internal]** Update self-dependency to `v0.15.0-beta.10`.

## 0.15.0-beta.10 (2017-08-28)

- **[Breaking]** Update Tslint rules to use `tslint@5.7.0`.
- **[Fix]** Set `allowJs` to false in default TSC options.
- **[Fix]** Do not pipe output of git commands to stdout.
- **[Internal]** Update self-dependency to `v0.15.0-beta.9`.

## 0.15.0-beta.9 (2017-08-28)

- **[Breaking]** Drop old-style `test` target.
- **[Breaking]** Drop old-style `node` target.
- **[Feature]** Add `mocha` target to run tests in `spec.ts` files.
- **[Feature]** Add `node` target to build and run top-level Node applications.
- **[Feature]** Provide `generateNodeTasks`, `generateLibTasks` and `generateMochaTasks` functions.
  They create the tasks but do not register them. 
- **[Fix]** Run `clean` before `dist`, if defined.
- **[Fix]** Run `dist` before `publish`.

## 0.15.0-beta.8 (2017-08-26)

- **[Fix]** Remove auth token and registry options for `<lib>:dist:publish`. It is better served
  by configuring the environment appropriately.

## 0.15.0-beta.7 (2017-08-26)

- **[Feature]** Add `clean` task to `lib` targets.
- **[Fix]** Ensure that `gitHead` is defined when publishing a package to npm.

## 0.15.0-beta.6 (2017-08-22)

- **[Feature]** Add support for Typedoc deployment to a remote git branch (such as `gh-pages`)
- **[Feature]** Add support for `copy` tasks in new library target.
- **[Fix]** Resolve absolute paths when compiling scripts with custom typings.

## 0.15.0-beta.5 (2017-08-14)

- **[Fix]** Fix package entry for the main module.

## 0.15.0-beta.4 (2017-08-14)

- **[Breaking]** Drop ES5 build exposed to browsers with the `browser` field in `package.json`.
- **[Feature]** Introduce first new-style target (`LibTarget`). it supports typedoc generation, dev builds and
  simple distribution.

## 0.15.0-beta.3 (2017-08-11)

- **[Breaking]** Update default lib target to use target-specific `srcDir`.
- **[Feature]** Allow to complete `srcDir` in target.
- **[Feature]** Add experimental library distribution supporting deep requires.

## 0.15.0-beta.2 (2017-08-10)

- **[Fix]** Default to CommonJS for project tsconfig.json
- **[Fix]** Add Typescript configuration for default project.
- **[Internal]** Update self-dependency to `0.15.0-beta.1`.

## 0.15.0-beta.1 (2017-08-09)

- **[Feature]** Support typed TSLint rules.
- **[Internal]** Update gulpfile.ts to use build tools `0.15.0-beta.0`.
- **[Fix]** Fix regressions caused by `0.15.0-beta.0` (missing type definition).

## 0.15.0-beta.0 (2017-08-09)

- **[Breaking]** Expose option interfaces directly in the main module instead of the `config` namespace.
- **[Breaking]** Rename `DEFAULT_PROJECT_OPTIONS` to `DEFAULT_PROJECT`.
- **[Feature]** Emit project-wide `tsconfig.json`.
- **[Internal]** Convert gulpfile to Typescript, use `ts-node` to run it.
- **[Internal]** Update dependencies

## 0.14.3 (2017-07-16)

- **[Feature]** Add `:lint:fix` project task to fix some lint errors.

## 0.14.2 (2017-07-10)

- **[Internal]** Update dependencies: add `package-lock.json` and update `tslint`.

## 0.14.1 (2017-06-17)

- **[Internal]** Update dependencies.
- **[Internal]** Drop dependency on _Bluebird_.
- **[Internal]** Drop dependency on _typings_.

## 0.14.0 (2017-05-10)

- **[Breaking]** Enforce trailing commas by default for multiline objects
- **[Feature]** Allow bump from either `master` or a branch with the same name as the tag (exampel: `v1.2.3`)
- **[Feature]** Support TSLint 8, allow to extend the default rules
- **[Patch]** Allow mergeable namespaces

# 0.13.1

- **[Patch]** Allow namespaces in the default TS-Lint config

# 0.13.0

- **[Breaking]** Major overhaul of the angular target. The server build no longer depends on the client.
- **[Breaking]** Update to `gulp@4` (from `gulp@3`)
- **[Breaking]** Update to `tslint@7` (from `tslint@6`), add stricter default rules
- **[Breaking]** Update signature of targetGenerators and project tasks: it only uses
  `ProjectOptions` and `Target` now, the additional options are embedded in those two objects.
- **[Breaking]** Remove `:install`, `:instal:npm` and `:install:typings`. Use the `prepare` script in
  your `package.json` file instead.
- Add `:tslint.json` project task to generate configuration for `tslint`
- Add first class support for processing of `pug` and `sass` files, similar to `copy`
- Implement end-to-end tests
- Enable `emitDecoratorMetadata` in default typescript options.
- Allow configuration of `:lint` with the `tslintOptions` property of the project configuration.
- Add `<target>:watch` tasks for incremental builds.

# 0.12.3

- Support `templateUrl` and `styleUrls` in angular modules.

# 0.12.2

- Add `<target>:build:copy` task. It copies user-defined files.

# 0.12.1

- Fix `<target>:watch` task.

# 0.12.0

- **[Breaking]**: Change naming convention for tasks. The names primary part is
  the target, then the action (`lib:build` instead of `build:lib`) to group
  the tasks per target.
- **[Breaking]**: Use `typeRoots` instead of `definitions` in configuration to
  specify Typescript definition files.
- Generate `tsconfig.json` file (mainly for editors)
- Implement the `test` target to run unit-tests with `mocha`.

# 0.11.2

- Target `angular`: Add `build:<target>:assets:sass` for `.scss` files (Sassy CSS)

# 0.11.1

- Rename project to `web-build-tools` (`demurgos-web-build-tools` on _npm_)
- Target `angular`: Add `build:<target>:assets`, `build:<target>:pug` and `build:<target>:static`.
- Update `gulp-typescript`: solve error message during compilation
- Targets `node` and `angular`: `build:<target>:scripts` now include in-lined source maps
- Target `node`: `watch:<target>` to support incremental builds
