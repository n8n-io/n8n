# @oclif/test

test helpers for oclif CLIs

[![Version](https://img.shields.io/npm/v/@oclif/test.svg)](https://npmjs.org/package/@oclif/test)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/test.svg)](https://npmjs.org/package/@oclif/test)
[![License](https://img.shields.io/npm/l/@oclif/test.svg)](https://github.com/oclif/test/blob/main/package.json)

## Migration

See the [V4 Migration Guide](./MIGRATION.md) if you are migrating from v3 or older.

## Usage

`@oclif/test` provides a handful of utilities that make it easy to test your [oclif](https://oclif.io) CLI.

> [!NOTE]
> In order for these utilities to capture all output to the terminal, you must disable any console output interception/suppression features in your test framework.
>
> - For Jest users, enable [the `verbose` flag](https://jestjs.io/docs/configuration#verbose-boolean) in your Jest config.
> - For Vitest users, enable [the `disableConsoleIntercept` flag](https://vitest.dev/guide/cli.html#disableconsoleintercept) in your Vitest config.

### `captureOutput`

`captureOutput` allows you to get the stdout, stderr, return value, and error of the callback you provide it. This makes it possible to assert that certain strings were printed to stdout and stderr or that the callback failed with the expected error or succeeded with the expected result.

**Options**

- `print` - Print everything that goes to stdout and stderr.
- `stripAnsi` - Strip ansi codes from everything that goes to stdout and stderr. Defaults to true.
- `testNodeEnv` - Sets the `NODE_ENV` value when capturing output. Defaults to `'test'`.

See the [tests](./test/capture-output.test.ts) for example usage.

### `runCommand`

`runCommand` allows you to get the stdout, stderr, return value, and error of a command in your CLI.

See the [tests](./test/run-command.test.ts) for example usage.

### `runHook`

`runHook` allows you to get the stdout, stderr, return value, and error of a hook in your CLI.

See the [tests](./test/run-hook.test.ts) for example usage.
