#!/usr/bin/env node
'use strict';

const citty = require('citty');
const pathe = require('pathe');
const consola = require('consola');
const api = require('./shared/nypm.BSZ9LRu3.cjs');
require('pkg-types');
require('node:module');
require('ufo');
require('tinyexec');
require('node:fs');
require('node:fs/promises');

const name = "nypm";
const version = "0.5.4";
const description = "Unified Package Manager for Node.js";

const operationArgs = {
  cwd: {
    type: "string",
    description: "Current working directory"
  },
  workspace: {
    type: "boolean",
    description: "Add to workspace"
  },
  silent: {
    type: "boolean",
    description: "Run in silent mode"
  }
};
const install = citty.defineCommand({
  meta: {
    description: "Install dependencies"
  },
  args: {
    ...operationArgs,
    name: {
      type: "positional",
      description: "Dependency name",
      required: false
    },
    dev: {
      type: "boolean",
      alias: "D",
      description: "Add as dev dependency"
    },
    global: {
      type: "boolean",
      alias: "g",
      description: "Add globally"
    },
    "frozen-lockfile": {
      type: "boolean",
      description: "Install dependencies with frozen lock file"
    }
  },
  run: async ({ args }) => {
    await (args._.length > 0 ? api.addDependency(args._, args) : api.installDependencies(args));
  }
});
const remove = citty.defineCommand({
  meta: {
    description: "Remove dependencies"
  },
  args: {
    name: {
      type: "positional",
      description: "Dependency name",
      required: true
    },
    ...operationArgs
  },
  run: async ({ args }) => {
    await api.removeDependency(args.name, args);
  }
});
const detect = citty.defineCommand({
  meta: {
    description: "Detect the current package manager"
  },
  args: {
    cwd: {
      type: "string",
      description: "Current working directory"
    }
  },
  run: async ({ args }) => {
    const cwd = pathe.resolve(args.cwd || ".");
    const packageManager = await api.detectPackageManager(cwd);
    if (packageManager?.warnings) {
      for (const warning of packageManager.warnings) {
        consola.consola.warn(warning);
      }
    }
    if (!packageManager) {
      consola.consola.error(`Cannot detect package manager in \`${cwd}\``);
      return process.exit(1);
    }
    consola.consola.log(
      `Detected package manager in \`${cwd}\`: \`${packageManager.name}@${packageManager.version}\``
    );
  }
});
const dedupe = citty.defineCommand({
  meta: {
    description: "Dedupe dependencies"
  },
  args: {
    cwd: {
      type: "string",
      description: "Current working directory"
    },
    silent: {
      type: "boolean",
      description: "Run in silent mode"
    },
    recreateLockFile: {
      type: "boolean",
      description: "Recreate lock file"
    }
  },
  run: async ({ args }) => {
    await api.dedupeDependencies(args);
  }
});
const main = citty.defineCommand({
  meta: {
    name,
    version,
    description
  },
  subCommands: {
    install,
    i: install,
    add: install,
    remove,
    rm: remove,
    uninstall: remove,
    un: remove,
    detect,
    dedupe
  }
});
citty.runMain(main);
