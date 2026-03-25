# extra-typings for commander

[![NPM Version](http://img.shields.io/npm/v/@commander-js/extra-typings.svg?style=flat)](https://www.npmjs.org/package/@commander-js/extra-typings)
[![NPM Downloads](https://img.shields.io/npm/dm/@commander-js/extra-typings.svg?style=flat)](https://npmcharts.com/compare/@commander-js/extra-typings?minimal=true)

This package offers TypeScript typings for `commander` which infer strong types for:

- all the parameters of the action handler, including the options
- options returned by `.opts()`

The runtime is supplied by commander. This package is all about the typings.

Usage

- install `@commander-js/extra-typings` using your preferred package manager
- install `commander`, if not already installed (peer dependency)
- in code import from `@commander-js/extra-typings` instead of `commander`

The installed version of this package should match the major and minor version numbers of the installed commander package, but the patch version number is independent (following pattern used by [Definitely Typed](https://github.com/DefinitelyTyped/DefinitelyTyped#how-do-definitely-typed-package-versions-relate-to-versions-of-the-corresponding-library)).

Credit: this builds on work by @PaperStrike in <https://github.com/tj/commander.js/pull/1758>

## Limitations

- the generics lead to some noisy types visible in editor and errors
- some minor code changes required for subclasses of `Command`, `Argument`, or `Option` (see [subclass.test-d.ts](./tests/subclass.test-d.ts))
  - chaining methods which do type inference return base class rather than `this`
  - subclass of `Command` returns base class not subclass from `.command(name)`
  - type parameter needed for class declaration of subclass of `Option` and `Argument`

## Usage tips

The types are built up as the options and arguments are defined. The usage pattern for action handlers is easy. Just chain the action handler after the options and arguments.

```typescript
import { program } from '@commander-js/extra-typings';

program.command('print')
  .argument('<file>')
  .option('--double-sided')
  .action((targetFile, options) => {
    // command-arguments and options are fully typed
  });
```

For working with a single command without an action handler, the configuration need to be done at the same time as the variable is declared.

```typescript
import { Command } from '@commander-js/extra-typings';

// broken pattern
const program = new Command(); // program type does not include options or arguments
program.option('-d, --debug'); // adding option does not change type of program
const options = program.opts(); // dumb type
```

```typescript
import { Command } from '@commander-js/extra-typings';

// working pattern
const program = new Command()
  .option('-d, --debug'); // program type includes chained options and arguments
const options = program.opts(); // smart type
```

Use a "const assertion" on the choices to narrow the option type from `string`:

```typescript
const program = new Command()
  .addOption(new Option('--drink-size <size>').choices(['small', 'medium', 'large'] as const))
  .parse();
const drinkSize = program.opts().drinkSize; // "small" | "medium" | "large" | undefined
```
