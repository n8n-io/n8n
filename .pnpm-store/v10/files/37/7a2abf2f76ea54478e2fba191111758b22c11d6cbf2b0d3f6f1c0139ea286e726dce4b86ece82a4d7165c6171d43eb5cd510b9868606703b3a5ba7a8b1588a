# ts-command-line

This library helps you create professional command-line tools using TypeScript.  By "professional", we mean:

- **no gotchas for users**:  Seems obvious, but try typing "`npm install --save-dex`" instead of "`npm install --save-dev`" sometime.  The command seems to execute successfully, but it doesn't save anything! The misspelled flag was silently ignored. This lack of rigor plagues many familiar Node.js tools and can be confusing and frustrating. For a great user experience, a command line tool should always be strict about its syntax.

- **no gotchas for developers**:  Many command-line libraries store their parsed data in a simple JavaScript object. This is convenient for small projects. But suppose a large project has many different source files that define and read parameters. If you try to read `data['output-dir']` when it wasn't defined, or if you misspell the key name, your tool will silently behave as if the parameter was omitted. And is `data['max-count']` a string or a number? Hard to tell! We solve this by modeling each parameter kind as a real TypeScript class.

- **simple by design**:  Making a CLI is similar to making a graphical UI -- some people have a knack for clean and intuitive designs, but your average developer... needs some help.  :-)  Keeping things simple is the best help.  **ts-command-line** intentionally provides a minimalist set of CLI building blocks that encourage simple designs.  If your app has lots of knobs and switches, we recommend NOT to design a complex CLI with hundreds of parameters.  Move those options into a commented config file with a published JSON schema.

- **automatic documentation**: Some command-line libraries treat the `--help` docs as someone else's job.  **ts-command-line** requires each every parameter to follow a standardized naming pattern and have a documentation string.  It will automatically generate the `--help` docs for you.  If you like to write long paragraphs, no problem -- they will be word-wrapped correctly. *[golf clap]*

- **structure and extensibility**: Instead of a simple function chain, **ts-command-line** provides a "scaffold" pattern that makes it easy to find and understand the command-line implementation for any tool project.  The scaffold model is generally recommended, but there's also a "dynamic" model if you need it.  See below for examples.

- **environment variable mappings**: Any CLI parameter can be associated with an environment variable.  If the parameter is not explicitly provided, the value from the environment will be used.  The associated environment variables are automatically documented in the `--help`.

Internally, the implementation is based on [argparse](https://www.npmjs.com/package/argparse) and the Python approach to command-lines.

Compared to other libraries, **ts-command-line** doesn't provide zillions of custom syntaxes and bells and whistles.  Instead it aims to be a simple, consistent, and professional solution for your command-line tool.  Give it a try!

### Some Terminology

Suppose that we want to parse a command-line like this:

```
widget --verbose push --force --max-count 123
```

In this example, we can identify the following components:

- The **tool name** in this example is `widget`.  This is the name of your Node.js bin script.
- The **parameters** are  `--verbose`, `--force`, and `--max-count`.
- The value "123" is the **argument** for the `--max-count` integer parameter.  (Flags don't have arguments, because their value is determined by whether the flag was provided or not.)
- Similar to Git's command-line, the `push` token is called an **action**.  It acts as sub-command with its own unique set of parameters.
- The `--verbose` flag is a **global parameter** because it precedes the action name.  It affects all actions.
- The `--force` flag is an **action parameter** because it comes after the action name.  It only applies to that action.


### Parameter Kinds

Several different kinds of parameters are supported:

| Parameter Kind | Example | Data Type | Description |
| --- | --- | --- | --- |
| flag | `--verbose` | `boolean` | Value is `true` if the flag was specified on the command line, `false` otherwise. |
| integer | `--max-retry 3` | `int` | The argument is an integer number |
| string | `--title "Hello, world"` | `string` | The argument is a text string. |
| choice | `--color red` | `string` | The argument must be a string from a list of allowed choices (similar to an enum). |
| string list | `-o file1.txt -o file2.txt` | `string[]` | The argument is a text string. The parameter can be specified multiple times to build a list. |

Other parameter kinds could be implemented if requested.  That said, keeping your CLI grammar simple and systematic makes it easier for users to learn.


## Scaffold Model

If your tool uses the scaffold model, you will create subclasses of two abstract base classes:  `CommandLineParser` for the overall command-line, and `CommandLineAction` for each action.

Continuing our example from above, suppose we want to start with a couple simple flags like this:

```
widget --verbose push --force
```

We could define our subclass for the "`push`" action like this:

```typescript
export class PushAction extends CommandLineAction {
  private _force: CommandLineFlagParameter;
  private _protocol: CommandLineChoiceParameter;

  public constructor() {
    super({
      actionName: 'push',
      summary: 'Pushes a widget to the service',
      documentation: 'Here we provide a longer description of how our action works.'
    });

    this._force = this.defineFlagParameter({
      parameterLongName: '--force',
      parameterShortName: '-f',
      description: 'Push and overwrite any existing state'
    });

    this._protocol = this.defineChoiceParameter({
      parameterLongName: '--protocol',
      description: 'Specify the protocol to use',
      alternatives: ['ftp', 'webdav', 'scp'],
      environmentVariable: 'WIDGET_PROTOCOL',
      defaultValue: 'scp'
    });
  }

  protected async onExecute(): Promise<void> { // abstract
    await BusinessLogic.doTheWork(this._force.value, this._protocol.value || "(none)");
  }
}
```

Then we might define the parser subclass like this:

```typescript
export class WidgetCommandLine extends CommandLineParser {
  private _verbose: CommandLineFlagParameter;

  public constructor() {
    super({
      toolFilename: 'widget',
      toolDescription: 'The "widget" tool is a code sample for using the @rushstack/ts-command-line library.'
    });

    this.addAction(new PushAction());

    this._verbose = this.defineFlagParameter({
      parameterLongName: '--verbose',
      parameterShortName: '-v',
      description: 'Show extra logging detail'
    });
  }

  protected async onExecute(): Promise<void> { // override
    BusinessLogic.configureLogger(this._verbose.value);
    await super.onExecute();
  }
}
```

To invoke the parser, the application entry point will do something like this:

```typescript
const commandLine: WidgetCommandLine = new WidgetCommandLine();
commandLine.executeAsync();
```

When we run `widget --verbose push --force`, the `PushAction.onExecute()` method will get invoked and then your business logic takes over.

---

**For a more complete example, take a look at the [ts-command-line-test](https://github.com/microsoft/rushstack/tree/main/build-tests/ts-command-line-test) sample project.**

---

#### Testing out the docs

If you invoke the tool as "`widget --help`", the docs are automatically generated:

```
usage: widget [-h] [-v] <command> ...

The "widget" tool is a code sample for using the @rushstack/ts-command-line
library.

Positional arguments:
  <command>
    push         Pushes a widget to the service

Optional arguments:
  -h, --help     Show this help message and exit.
  -v, --verbose  Show extra logging detail

For detailed help about a specific command, use: widget <command> -h
```

For help about the `push` action, the user can type "`widget push --help`", which shows this output:

```
usage: widget push [-h] [-f] [--protocol {ftp,webdav,scp}]

Here we provide a longer description of how our action works.

Optional arguments:
  -h, --help            Show this help message and exit.
  -f, --force           Push and overwrite any existing state
  --protocol {ftp,webdav,scp}
                        Specify the protocol to use. This parameter may
                        alternatively specified via the WIDGET_PROTOCOL
                        environment variable. The default value is "scp".
```

## Dynamic Model

The action subclasses provide a simple, recognizable pattern that you can use across all your tooling projects. It's the generally recommended approach. However, there are some cases where we need to break out of the scaffold.  For example:

- Actions or parameters may be discovered at runtime, e.g. from a config file
- The actions and their implementations may sometimes have very different structures

In this case, you can use the `DynamicCommandLineAction` and `DynamicCommandLineParser`  classes which are not abstract (and not intended to be subclassed).  Here's our above example rewritten for this model:

```typescript
// Define the parser
const commandLineParser: DynamicCommandLineParser = new DynamicCommandLineParser({
  toolFilename: 'widget',
  toolDescription: 'The "widget" tool is a code sample for using the @rushstack/ts-command-line library.'
});

commandLineParser.defineFlagParameter({
  parameterLongName: '--verbose',
  parameterShortName: '-v',
  description: 'Show extra logging detail'
});

// Define the action
const action: DynamicCommandLineAction = new DynamicCommandLineAction({
  actionName: 'push',
  summary: 'Pushes a widget to the service',
  documentation: 'Here we provide a longer description of how our action works.'
});

commandLineParser.addAction(action);

action.defineFlagParameter({
  parameterLongName: '--force',
  parameterShortName: '-f',
  description: 'Push and overwrite any existing state'
});

action.defineChoiceParameter({
  parameterLongName: '--protocol',
  description: 'Specify the protocol to use',
  alternatives: ['ftp', 'webdav', 'scp'],
  environmentVariable: 'WIDGET_PROTOCOL',
  defaultValue: 'scp'
});

// Parse the command line
commandLineParser.executeAsync().then(() => {
  console.log('The action is: ' + commandLineParser.selectedAction!.actionName);
  console.log('The force flag is: ' + action.getFlagParameter('--force').value);
});
```

You can also mix the two models.  For example, we could augment the `WidgetCommandLine` from the original model by adding `DynamicAction` objects to it.


## Links

- [CHANGELOG.md](
  https://github.com/microsoft/rushstack/blob/main/libraries/ts-command-line/CHANGELOG.md) - Find
  out what's new in the latest version
- [API Reference](https://api.rushstack.io/pages/ts-command-line/)

Here are some real world GitHub projects that illustrate different use cases for **ts-command-line**:

- [@microsoft/rush](https://www.npmjs.com/package/@microsoft/rush)
- [@microsoft/api-extractor](https://www.npmjs.com/package/@microsoft/api-extractor)
- [@microsoft/api-documenter](https://www.npmjs.com/package/@microsoft/api-documenter)

`@rushstack/ts-command-line` is part of the [Rush Stack](https://rushstack.io/) family of projects.
