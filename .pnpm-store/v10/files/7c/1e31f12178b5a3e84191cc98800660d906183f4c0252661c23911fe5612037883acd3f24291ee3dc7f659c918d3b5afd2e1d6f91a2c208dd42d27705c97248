# Commander.js

[![Build Status](https://api.travis-ci.org/tj/commander.js.svg?branch=master)](http://travis-ci.org/tj/commander.js)
[![NPM Version](http://img.shields.io/npm/v/commander.svg?style=flat)](https://www.npmjs.org/package/commander)
[![NPM Downloads](https://img.shields.io/npm/dm/commander.svg?style=flat)](https://npmcharts.com/compare/commander?minimal=true)
[![Install Size](https://packagephobia.now.sh/badge?p=commander)](https://packagephobia.now.sh/result?p=commander)

The complete solution for [node.js](http://nodejs.org) command-line interfaces.

Read this in other languages: English | [简体中文](./Readme_zh-CN.md)

- [Commander.js](#commanderjs)
  - [Installation](#installation)
  - [Declaring _program_ variable](#declaring-program-variable)
  - [Options](#options)
    - [Common option types, boolean and value](#common-option-types-boolean-and-value)
    - [Default option value](#default-option-value)
    - [Other option types, negatable boolean and boolean|value](#other-option-types-negatable-boolean-and-booleanvalue)
    - [Custom option processing](#custom-option-processing)
    - [Required option](#required-option)
    - [Variadic option](#variadic-option)
    - [Version option](#version-option)
  - [Commands](#commands)
    - [Specify the argument syntax](#specify-the-argument-syntax)
    - [Action handler (sub)commands](#action-handler-subcommands)
    - [Stand-alone executable (sub)commands](#stand-alone-executable-subcommands)
  - [Automated help](#automated-help)
    - [Custom help](#custom-help)
    - [.usage and .name](#usage-and-name)
    - [.help(cb)](#helpcb)
    - [.outputHelp(cb)](#outputhelpcb)
    - [.helpInformation()](#helpinformation)
    - [.helpOption(flags, description)](#helpoptionflags-description)
    - [.addHelpCommand()](#addhelpcommand)
  - [Custom event listeners](#custom-event-listeners)
  - [Bits and pieces](#bits-and-pieces)
    - [.parse() and .parseAsync()](#parse-and-parseasync)
    - [Avoiding option name clashes](#avoiding-option-name-clashes)
    - [TypeScript](#typescript)
    - [createCommand()](#createcommand)
    - [Import into ECMAScript Module](#import-into-ecmascript-module)
    - [Node options such as `--harmony`](#node-options-such-as---harmony)
    - [Debugging stand-alone executable subcommands](#debugging-stand-alone-executable-subcommands)
    - [Override exit handling](#override-exit-handling)
  - [Examples](#examples)
  - [Support](#support)
    - [Commander for enterprise](#commander-for-enterprise)

For information about terms used in this document see: [terminology](./docs/terminology.md)

## Installation

```bash
npm install commander
```

## Declaring _program_ variable

Commander exports a global object which is convenient for quick programs.
This is used in the examples in this README for brevity.

```js
const { program } = require('commander');
program.version('0.0.1');
```

For larger programs which may use commander in multiple ways, including unit testing, it is better to create a local Command object to use.

```js
const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');
```

## Options

Options are defined with the `.option()` method, also serving as documentation for the options. Each option can have a short flag (single character) and a long name, separated by a comma or space or vertical bar ('|').

The options can be accessed as properties on the Command object. Multi-word options such as "--template-engine" are camel-cased, becoming `program.templateEngine` etc. See also optional new behaviour to [avoid name clashes](#avoiding-option-name-clashes).

Multiple short flags may optionally be combined in a single argument following the dash: boolean flags, followed by a single option taking a value (possibly followed by the value).
For example `-a -b -p 80` may be written as `-ab -p80` or even `-abp80`.

You can use `--` to indicate the end of the options, and any remaining arguments will be used without being interpreted.

Options on the command line are not positional, and can be specified before or after other arguments.

### Common option types, boolean and value

The two most used option types are a boolean option, and an option which takes its value
from the following argument (declared with angle brackets like `--expect <value>`). Both are `undefined` unless specified on command line.  

Example file: [options-common.js](./examples/options-common.js)

```js
program
  .option('-d, --debug', 'output extra debugging')
  .option('-s, --small', 'small pizza size')
  .option('-p, --pizza-type <type>', 'flavour of pizza');

program.parse(process.argv);

if (program.debug) console.log(program.opts());
console.log('pizza details:');
if (program.small) console.log('- small pizza size');
if (program.pizzaType) console.log(`- ${program.pizzaType}`);
```

```bash
$ pizza-options -d
{ debug: true, small: undefined, pizzaType: undefined }
pizza details:
$ pizza-options -p
error: option '-p, --pizza-type <type>' argument missing
$ pizza-options -ds -p vegetarian
{ debug: true, small: true, pizzaType: 'vegetarian' }
pizza details:
- small pizza size
- vegetarian
$ pizza-options --pizza-type=cheese
pizza details:
- cheese
```

`program.parse(arguments)` processes the arguments, leaving any args not consumed by the program options in the `program.args` array.

### Default option value

You can specify a default value for an option which takes a value.

Example file: [options-defaults.js](./examples/options-defaults.js)

```js
program
  .option('-c, --cheese <type>', 'add the specified type of cheese', 'blue');

program.parse(process.argv);

console.log(`cheese: ${program.cheese}`);
```

```bash
$ pizza-options
cheese: blue
$ pizza-options --cheese stilton
cheese: stilton
```

### Other option types, negatable boolean and boolean|value

You can define a boolean option long name with a leading `no-` to set the option value to false when used.
Defined alone this also makes the option true by default.

If you define `--foo` first, adding `--no-foo` does not change the default value from what it would
otherwise be. You can specify a default boolean value for a boolean option and it can be overridden on command line.

Example file: [options-negatable.js](./examples/options-negatable.js)

```js
program
  .option('--no-sauce', 'Remove sauce')
  .option('--cheese <flavour>', 'cheese flavour', 'mozzarella')
  .option('--no-cheese', 'plain with no cheese')
  .parse(process.argv);

const sauceStr = program.sauce ? 'sauce' : 'no sauce';
const cheeseStr = (program.cheese === false) ? 'no cheese' : `${program.cheese} cheese`;
console.log(`You ordered a pizza with ${sauceStr} and ${cheeseStr}`);
```

```bash
$ pizza-options
You ordered a pizza with sauce and mozzarella cheese
$ pizza-options --sauce
error: unknown option '--sauce'
$ pizza-options --cheese=blue
You ordered a pizza with sauce and blue cheese
$ pizza-options --no-sauce --no-cheese
You ordered a pizza with no sauce and no cheese
```

You can specify an option which may be used as a boolean option but may optionally take an option-argument
(declared with square brackets like `--optional [value]`).

Example file: [options-boolean-or-value.js](./examples/options-boolean-or-value.js)

```js
program
  .option('-c, --cheese [type]', 'Add cheese with optional type');

program.parse(process.argv);

if (program.cheese === undefined) console.log('no cheese');
else if (program.cheese === true) console.log('add cheese');
else console.log(`add cheese type ${program.cheese}`);
```

```bash
$ pizza-options
no cheese
$ pizza-options --cheese
add cheese
$ pizza-options --cheese mozzarella
add cheese type mozzarella
```

For information about possible ambiguous cases, see [options taking varying arguments](./docs/options-taking-varying-arguments.md).

### Custom option processing

You may specify a function to do custom processing of option-arguments. The callback function receives two parameters,
the user specified option-argument and the previous value for the option. It returns the new value for the option.

This allows you to coerce the option-argument to the desired type, or accumulate values, or do entirely custom processing.

You can optionally specify the default/starting value for the option after the function parameter.

Example file: [options-custom-processing.js](./examples/options-custom-processing.js)

```js
function myParseInt(value, dummyPrevious) {
  // parseInt takes a string and an optional radix
  return parseInt(value);
}

function increaseVerbosity(dummyValue, previous) {
  return previous + 1;
}

function collect(value, previous) {
  return previous.concat([value]);
}

function commaSeparatedList(value, dummyPrevious) {
  return value.split(',');
}

program
  .option('-f, --float <number>', 'float argument', parseFloat)
  .option('-i, --integer <number>', 'integer argument', myParseInt)
  .option('-v, --verbose', 'verbosity that can be increased', increaseVerbosity, 0)
  .option('-c, --collect <value>', 'repeatable value', collect, [])
  .option('-l, --list <items>', 'comma separated list', commaSeparatedList)
;

program.parse(process.argv);

if (program.float !== undefined) console.log(`float: ${program.float}`);
if (program.integer !== undefined) console.log(`integer: ${program.integer}`);
if (program.verbose > 0) console.log(`verbosity: ${program.verbose}`);
if (program.collect.length > 0) console.log(program.collect);
if (program.list !== undefined) console.log(program.list);
```

```bash
$ custom -f 1e2
float: 100
$ custom --integer 2
integer: 2
$ custom -v -v -v
verbose: 3
$ custom -c a -c b -c c
[ 'a', 'b', 'c' ]
$ custom --list x,y,z
[ 'x', 'y', 'z' ]
```

### Required option

You may specify a required (mandatory) option using `.requiredOption`. The option must have a value after parsing, usually specified on the command line, or perhaps from a default value (say from environment). The method is otherwise the same as `.option` in format, taking flags and description, and optional default value or custom processing.

Example file: [options-required.js](./examples/options-required.js)

```js
program
  .requiredOption('-c, --cheese <type>', 'pizza must have cheese');

program.parse(process.argv);
```

```bash
$ pizza
error: required option '-c, --cheese <type>' not specified
```

### Variadic option

You may make an option variadic by appending `...` to the value placeholder when declaring the option. On the command line you
can then specify multiple option-arguments, and the parsed option value will be an array. The extra arguments
are read until the first argument starting with a dash. The special argument `--` stops option processing entirely. If a value
is specified in the same argument as the option then no further values are read.

Example file: [options-variadic.js](./examples/options-variadic.js)

```js
program
  .option('-n, --number <numbers...>', 'specify numbers')
  .option('-l, --letter [letters...]', 'specify letters');

program.parse();

console.log('Options: ', program.opts());
console.log('Remaining arguments: ', program.args);
```

```bash
$ collect -n 1 2 3 --letter a b c
Options:  { number: [ '1', '2', '3' ], letter: [ 'a', 'b', 'c' ] }
Remaining arguments:  []
$ collect --letter=A -n80 operand
Options:  { number: [ '80' ], letter: [ 'A' ] }
Remaining arguments:  [ 'operand' ]
$ collect --letter -n 1 -n 2 3 -- operand
Options:  { number: [ '1', '2', '3' ], letter: true }
Remaining arguments:  [ 'operand' ]
```

For information about possible ambiguous cases, see [options taking varying arguments](./docs/options-taking-varying-arguments.md).

### Version option

The optional `version` method adds handling for displaying the command version. The default option flags are `-V` and `--version`, and when present the command prints the version number and exits.

```js
program.version('0.0.1');
```

```bash
$ ./examples/pizza -V
0.0.1
```

You may change the flags and description by passing additional parameters to the `version` method, using
the same syntax for flags as the `option` method.

```js
program.version('0.0.1', '-v, --vers', 'output the current version');
```

## Commands

You can specify (sub)commands using `.command()` or `.addCommand()`. There are two ways these can be implemented: using an action handler attached to the command, or as a stand-alone executable file (described in more detail later). The subcommands may be nested ([example](./examples/nestedCommands.js)).

In the first parameter to `.command()` you specify the command name and any command-arguments. The arguments may be `<required>` or `[optional]`, and the last argument may also be `variadic...`.

You can use `.addCommand()` to add an already configured subcommand to the program.

For example:

```js
// Command implemented using action handler (description is supplied separately to `.command`)
// Returns new command for configuring.
program
  .command('clone <source> [destination]')
  .description('clone a repository into a newly created directory')
  .action((source, destination) => {
    console.log('clone command called');
  });

// Command implemented using stand-alone executable file (description is second parameter to `.command`)
// Returns `this` for adding more commands.
program
  .command('start <service>', 'start named service')
  .command('stop [service]', 'stop named service, or all if no name supplied');

// Command prepared separately.
// Returns `this` for adding more commands.
program
  .addCommand(build.makeBuildCommand());
```

Configuration options can be passed with the call to `.command()` and `.addCommand()`. Specifying `hidden: true` will 
remove the command from the generated help output. Specifying `isDefault: true` will run the subcommand if no other
subcommand is specified ([example](./examples/defaultCommand.js)).

### Specify the argument syntax

You use `.arguments` to specify the expected command-arguments for the top-level command, and for subcommands they are usually
included in the `.command` call. Angled brackets (e.g. `<required>`) indicate required command-arguments.
Square brackets (e.g. `[optional]`) indicate optional command-arguments.
You can optionally describe the arguments in the help by supplying a hash as second parameter to `.description()`.

Example file: [env](./examples/env)

```js
program
  .version('0.1.0')
  .arguments('<cmd> [env]')
  .description('test command', {
    cmd: 'command to run',
    env: 'environment to run test in'
  })
  .action(function (cmd, env) {
    console.log('command:', cmd);
    console.log('environment:', env || 'no environment given');
  });

program.parse(process.argv);
```

 The last argument of a command can be variadic, and only the last argument.  To make an argument variadic you
 append `...` to the argument name. For example:

```js
const { program } = require('commander');

program
  .version('0.1.0')
  .command('rmdir <dir> [otherDirs...]')
  .action(function (dir, otherDirs) {
    console.log('rmdir %s', dir);
    if (otherDirs) {
      otherDirs.forEach(function (oDir) {
        console.log('rmdir %s', oDir);
      });
    }
  });

program.parse(process.argv);
```

The variadic argument is passed to the action handler as an array.

### Action handler (sub)commands

You can add options to a command that uses an action handler.
The action handler gets passed a parameter for each argument you declared, and one additional argument which is the
command object itself. This command argument has the values for the command-specific options added as properties.

```js
const { program } = require('commander');

program
  .command('rm <dir>')
  .option('-r, --recursive', 'Remove recursively')
  .action(function (dir, cmdObj) {
    console.log('remove ' + dir + (cmdObj.recursive ? ' recursively' : ''))
  })

program.parse(process.argv)
```

You may supply an `async` action handler, in which case you call `.parseAsync` rather than `.parse`.

```js
async function run() { /* code goes here */ }

async function main() {
  program
    .command('run')
    .action(run);
  await program.parseAsync(process.argv);
}
```

A command's options on the command line are validated when the command is used. Any unknown options will be reported as an error.

### Stand-alone executable (sub)commands

When `.command()` is invoked with a description argument, this tells Commander that you're going to use stand-alone executables for subcommands.
Commander will search the executables in the directory of the entry script (like `./examples/pm`) with the name `program-subcommand`, like `pm-install`, `pm-search`.
You can specify a custom name with the `executableFile` configuration option.

You handle the options for an executable (sub)command in the executable, and don't declare them at the top-level.

Example file: [pm](./examples/pm)

```js
program
  .version('0.1.0')
  .command('install [name]', 'install one or more packages')
  .command('search [query]', 'search with optional query')
  .command('update', 'update installed packages', { executableFile: 'myUpdateSubCommand' })
  .command('list', 'list packages installed', { isDefault: true });

program.parse(process.argv);
```

If the program is designed to be installed globally, make sure the executables have proper modes, like `755`.

## Automated help

The help information is auto-generated based on the information commander already knows about your program. The default
help option is `-h,--help`.

Example file: [pizza](./examples/pizza)

```bash
$ node ./examples/pizza --help
Usage: pizza [options]

An application for pizzas ordering

Options:
  -V, --version        output the version number
  -p, --peppers        Add peppers
  -c, --cheese <type>  Add the specified type of cheese (default: "marble")
  -C, --no-cheese      You do not want any cheese
  -h, --help           display help for command
```

A `help` command is added by default if your command has subcommands. It can be used alone, or with a subcommand name to show
further help for the subcommand. These are effectively the same if the `shell` program has implicit help:

```bash
shell help
shell --help

shell help spawn
shell spawn --help
```

### Custom help

You can display extra information by listening for "--help".

Example file: [custom-help](./examples/custom-help)

```js
program
  .option('-f, --foo', 'enable some foo');

// must be before .parse()
program.on('--help', () => {
  console.log('');
  console.log('Example call:');
  console.log('  $ custom-help --help');
});
```

Yields the following help output:

```Text
Usage: custom-help [options]

Options:
  -f, --foo   enable some foo
  -h, --help  display help for command

Example call:
  $ custom-help --help
```

### .usage and .name

These allow you to customise the usage description in the first line of the help. The name is otherwise
deduced from the (full) program arguments. Given:

```js
program
  .name("my-command")
  .usage("[global options] command")
```

The help will start with:

```Text
Usage: my-command [global options] command
```

### .help(cb)

Output help information and exit immediately. Optional callback cb allows post-processing of help text before it is displayed.

### .outputHelp(cb)

Output help information without exiting.
Optional callback cb allows post-processing of help text before it is displayed.

### .helpInformation()

Get the command help information as a string for processing or displaying yourself. (The text does not include the custom help
from `--help` listeners.)

### .helpOption(flags, description)

Override the default help flags and description. Pass false to disable the built-in help option.

```js
program
  .helpOption('-e, --HELP', 'read more information');
```

### .addHelpCommand()

You can explicitly turn on or off the implicit help command with `.addHelpCommand()` and `.addHelpCommand(false)`.

You can both turn on and customise the help command by supplying the name and description:

```js
program.addHelpCommand('assist [command]', 'show assistance');
```

## Custom event listeners

You can execute custom actions by listening to command and option events.

```js
program.on('option:verbose', function () {
  process.env.VERBOSE = this.verbose;
});

program.on('command:*', function (operands) {
  console.error(`error: unknown command '${operands[0]}'`);
  const availableCommands = program.commands.map(cmd => cmd.name());
  mySuggestBestMatch(operands[0], availableCommands);
  process.exitCode = 1;
});
```

## Bits and pieces

### .parse() and .parseAsync()

The first argument to `.parse` is the array of strings to parse. You may omit the parameter to implicitly use `process.argv`.

If the arguments follow different conventions than node you can pass a `from` option in the second parameter:

- 'node': default, `argv[0]` is the application and `argv[1]` is the script being run, with user parameters after that
- 'electron': `argv[1]` varies depending on whether the electron application is packaged
- 'user': all of the arguments from the user

For example:

```js
program.parse(process.argv); // Explicit, node conventions
program.parse(); // Implicit, and auto-detect electron
program.parse(['-f', 'filename'], { from: 'user' });
```

### Avoiding option name clashes

The original and default behaviour is that the option values are stored
as properties on the program, and the action handler is passed a
command object with the options values stored as properties.
This is very convenient to code, but the downside is possible clashes with
existing properties of Command.

There are two new routines to change the behaviour, and the default behaviour may change in the future:

- `storeOptionsAsProperties`: whether to store option values as properties on command object, or store separately (specify false) and access using `.opts()`
- `passCommandToAction`: whether to pass command to action handler,
or just the options (specify false)

Example file: [storeOptionsAsProperties-action.js](./examples/storeOptionsAsProperties-action.js)

```js
program
  .storeOptionsAsProperties(false)
  .passCommandToAction(false);

program
  .name('my-program-name')
  .option('-n,--name <name>');

program
  .command('show')
  .option('-a,--action <action>')
  .action((options) => {
    console.log(options.action);
  });

program.parse(process.argv);

const programOptions = program.opts();
console.log(programOptions.name);
```

### TypeScript

The Commander package includes its TypeScript Definition file.

If you use `ts-node` and  stand-alone executable subcommands written as `.ts` files, you need to call your program through node to get the subcommands called correctly. e.g.

```bash
node -r ts-node/register pm.ts
```

### createCommand()

This factory function creates a new command. It is exported and may be used instead of using `new`, like:

```js
const { createCommand } = require('commander');
const program = createCommand();
```

`createCommand` is also a method of the Command object, and creates a new command rather than a subcommand. This gets used internally
when creating subcommands using `.command()`, and you may override it to
customise the new subcommand (examples using [subclass](./examples/custom-command-class.js) and [function](./examples/custom-command-function.js)).

### Import into ECMAScript Module

Commander is currently a CommonJS package, and the default export can be imported into an ES Module:

```js
// index.mjs
import commander from 'commander';
const program = commander.program;
const newCommand = new commander.Command();
```

### Node options such as `--harmony`

You can enable `--harmony` option in two ways:

- Use `#! /usr/bin/env node --harmony` in the subcommands scripts. (Note Windows does not support this pattern.)
- Use the `--harmony` option when call the command, like `node --harmony examples/pm publish`. The `--harmony` option will be preserved when spawning subcommand process.

### Debugging stand-alone executable subcommands

An executable subcommand is launched as a separate child process.

If you are using the node inspector for [debugging](https://nodejs.org/en/docs/guides/debugging-getting-started/) executable subcommands using `node --inspect` et al,
the inspector port is incremented by 1 for the spawned subcommand.

If you are using VSCode to debug executable subcommands you need to set the `"autoAttachChildProcesses": true` flag in your launch.json configuration.

### Override exit handling

By default Commander calls `process.exit` when it detects errors, or after displaying the help or version. You can override
this behaviour and optionally supply a callback. The default override throws a `CommanderError`.

The override callback is passed a `CommanderError` with properties `exitCode` number, `code` string, and `message`. The default override behaviour is to throw the error, except for async handling of executable subcommand completion which carries on. The normal display of error messages or version or help
is not affected by the override which is called after the display.

```js
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err) {
  // custom processing...
}
```

## Examples

Example file: [deploy](./examples/deploy)

```js
const { program } = require('commander');

program
  .version('0.1.0')
  .option('-C, --chdir <path>', 'change the working directory')
  .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
  .option('-T, --no-tests', 'ignore test hook');

program
  .command('setup [env]')
  .description('run setup commands for all envs')
  .option("-s, --setup_mode [mode]", "Which setup mode to use")
  .action(function(env, options){
    const mode = options.setup_mode || "normal";
    env = env || 'all';
    console.log('setup for %s env(s) with %s mode', env, mode);
  });

program
  .command('exec <cmd>')
  .alias('ex')
  .description('execute the given remote cmd')
  .option("-e, --exec_mode <mode>", "Which exec mode to use")
  .action(function(cmd, options){
    console.log('exec "%s" using %s mode', cmd, options.exec_mode);
  }).on('--help', function() {
    console.log('');
    console.log('Examples:');
    console.log('');
    console.log('  $ deploy exec sequential');
    console.log('  $ deploy exec async');
  });

program.parse(process.argv);
```

More Demos can be found in the [examples](https://github.com/tj/commander.js/tree/master/examples) directory.

## Support

The current version of Commander is fully supported on Long Term Support versions of Node, and is likely to work with Node 6 but not tested.
(For versions of Node below Node 6, use Commander 3.x or 2.x.)

The main forum for free and community support is the project [Issues](https://github.com/tj/commander.js/issues) on GitHub.

### Commander for enterprise

Available as part of the Tidelift Subscription

The maintainers of Commander and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-commander?utm_source=npm-commander&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)
