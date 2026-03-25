<img src="https://user-images.githubusercontent.com/449385/38243295-e0a47d58-372e-11e8-9bc0-8c02a6f4d2ac.png" width="260" height="73">

# oclif: Node.JS Open CLI Framework

[![Version](https://img.shields.io/npm/v/@oclif/core.svg)](https://npmjs.org/package/@oclif/core)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/core.svg)](https://npmjs.org/package/@oclif/core)
[![License](https://img.shields.io/npm/l/@oclif/core.svg)](https://github.com/oclif/core/blob/main/LICENSE)

# 🗒 Description

This is a framework for building CLIs in Node.js. This framework was built out of the [Salesforce CLI](https://github.com/salesforcecli/cli) but generalized to build any custom CLI. It's designed both for single-file CLIs with a few flag options (like `cat` or `ls`), or for very complex CLIs that have subcommands (like `git` or `heroku`).

[See the docs for more information](http://oclif.io/docs/introduction).

# 🚀 Getting Started Tutorial

The [Getting Started tutorial](http://oclif.io/docs/introduction) is a step-by-step guide to introduce you to oclif. If you have not developed anything in a command line before, this tutorial is a great place to get started.

# ✨ Features

- **Flag/Argument parsing** - No CLI framework would be complete without a flag parser. We've built a custom one from years of experimentation that we feel consistently handles user input flexible enough for the user to be able to use the CLI in ways they expect, but without compromising strictness guarantees to the developer.
- **Super Speed** - The overhead for running an oclif CLI command is almost nothing. [It requires very few dependencies](https://www.npmjs.com/package/@oclif/core?activeTab=dependencies) (only 28 dependencies in a minimal setup—including all transitive dependencies). Also, only the command to be executed will be required with node. So large CLIs with many commands will load equally as fast as a small one with a single command.
- **CLI Generator** - Run a single command to scaffold out a fully functional CLI and get started quickly. See [Getting Started Tutorial](<[#-usage](https://oclif.io/docs/introduction.html)>).
- **Testing Helpers** - We've put a lot of work into making commands easier to test and mock out stdout/stderr. The generator will automatically create [scaffolded tests](https://github.com/oclif/hello-world/blob/main/test/commands/hello.test.ts).
- **Auto-documentation** - By default you can pass `--help` to the CLI to get help such as flag options and argument information. This information is also automatically placed in the README whenever the npm package of the CLI is published. See the [hello-world CLI example](https://github.com/oclif/hello-world)
- **Plugins** - Using [plugins](https://oclif.io/docs/plugins), users of the CLI can extend it with new functionality, a CLI can be split into modular components, and functionality can be shared amongst multiple CLIs. See [Building your own plugin](https://oclif.io/docs/plugins#building-your-own-plugin).
- **Hooks** - Use lifecycle hooks to run functionality any time a CLI starts, or on custom triggers. Use this whenever custom functionality needs to be shared between various components of the CLI.
- **TypeScript** - Everything in the core of oclif is written in TypeScript and the generator will build fully configured TypeScript CLIs. If you use plugins support, the CLI will automatically use `ts-node` to run the plugins enabling you to use TypeScript with minimal-to-no boilerplate needed for any oclif CLI.
- **Auto-updating Installers** - oclif can package your CLI into [different installers](https://oclif.io/docs/releasing) that will not require the user to already have node installed on the machine. These can be made auto-updatable by using [plugin-update](https://github.com/oclif/plugin-update).
- **Everything is Customizable** - Pretty much anything can be swapped out and replaced inside oclif if needed—including the arg/flag parser.
- **Autocomplete** - Automatically include autocomplete for your CLI. This includes not only command names and flag names, but flag values as well. For example, it's possible to configure the Heroku CLI to have completions for Heroku app names:

```
$ heroku info --app=<tab><tab> # will complete with all the Heroku apps a user has in their account
```

# 📌 Requirements

Currently, Node 18+ is supported. We support the [LTS versions](https://nodejs.org/en/about/releases) of Node. You can add the [node](https://www.npmjs.com/package/node) package to your CLI to ensure users are running a specific version of Node.

# 📌 Migrating

See the [v3 migration guide](./guides/V3_MIGRATION.md) for an overview of breaking changes that occurred between v2 and v3.

See the [v2 migration guide](./guides/V2_MIGRATION.md) for an overview of breaking changes that occurred between v1 and v2.

Migrating from `@oclif/config` and `@oclif/command`? See the [v1 migration guide](./guides/PRE_CORE_MIGRATION.md).

# 📌 Documentation

The official oclif website, [oclif.io](https://oclif.io/), contains all the documentation you need for developing a CLI with oclif.

If there's anything you'd like to see in the documentation, please submit an issue on the [oclif.github.io repo](https://github.com/oclif/oclif.github.io).

# 🚀 Standalone Usage

We strongly encourage you generate an oclif CLI using the [oclif cli](https://github.com/oclif/oclif). The generator will generate an npm package with `@oclif/core` as a dependency.

You can, however, use `@oclif/core` in a standalone script like this:

```typescript
#!/usr/bin/env -S node --loader ts-node/esm --no-warnings=ExperimentalWarning

import * as fs from 'fs'
import {Command, Flags, flush, handle} from '@oclif/core'

class LS extends Command {
  static description = 'List the files in a directory.'
  static flags = {
    version: Flags.version(),
    help: Flags.help(),
    dir: Flags.string({
      char: 'd',
      default: process.cwd(),
    }),
  }

  async run() {
    const {flags} = await this.parse(LS)
    const files = fs.readdirSync(flags.dir)
    for (const f of files) {
      this.log(f)
    }
  }
}

LS.run().then(
  async () => {
    await flush()
  },
  async (err) => {
    await handle(err)
  },
)
```

Then run it like this:

```sh-session
$ ts-node myscript.ts
...files in current dir...
```

🚀 Contributing

See the [contributing guide](./CONRTIBUTING.md).
