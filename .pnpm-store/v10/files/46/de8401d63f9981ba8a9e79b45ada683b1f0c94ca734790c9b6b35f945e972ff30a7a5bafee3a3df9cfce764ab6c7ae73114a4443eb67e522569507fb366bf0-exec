#!/usr/bin/env node
'use strict';

const node_path = require('node:path');
const citty = require('citty');
const consola = require('consola');
const giget = require('./shared/giget.C0XVJdqO.cjs');
require('node:fs/promises');
require('node:fs');
require('tar');
require('pathe');
require('defu');
require('nypm');
require('node:stream');
require('node:child_process');
require('node:os');
require('node:util');
require('node-fetch-native/proxy');

const name = "giget";
const version = "1.2.5";
const description = "Download templates and git repositories with pleasure!";
const pkg = {
	name: name,
	version: version,
	description: description};

const mainCommand = citty.defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description
  },
  args: {
    // TODO: Make it `-t` in the next major version
    template: {
      type: "positional",
      description: "Template name or a a URI describing provider, repository, subdir, and branch/ref"
    },
    dir: {
      type: "positional",
      description: "A relative or absolute path where to extract the template",
      required: false
    },
    auth: {
      type: "string",
      description: "Custom Authorization token to use for downloading template. (Can be overriden with `GIGET_AUTH` environment variable)"
    },
    cwd: {
      type: "string",
      description: "Set current working directory to resolve dirs relative to it"
    },
    force: {
      type: "boolean",
      description: "Clone to existing directory even if exists"
    },
    forceClean: {
      type: "boolean",
      description: "Remove any existing directory or file recusively before cloning"
    },
    offline: {
      type: "boolean",
      description: "o not attempt to download and use cached version"
    },
    preferOffline: {
      type: "boolean",
      description: "Use cache if exists otherwise try to download"
    },
    shell: {
      type: "boolean",
      description: "Open a new shell with current working "
    },
    install: {
      type: "boolean",
      description: "Install dependencies after cloning"
    },
    verbose: {
      type: "boolean",
      description: "Show verbose debugging info"
    }
  },
  run: async ({ args }) => {
    if (args.verbose) {
      process.env.DEBUG = process.env.DEBUG || "true";
    }
    const r = await giget.downloadTemplate(args.template, {
      dir: args.dir,
      force: args.force,
      forceClean: args.forceClean,
      offline: args.offline,
      preferOffline: args.preferOffline,
      auth: args.auth,
      install: args.install
    });
    const _from = r.name || r.url;
    const _to = node_path.relative(process.cwd(), r.dir) || "./";
    consola.consola.log(`\u2728 Successfully cloned \`${_from}\` to \`${_to}\`
`);
    if (args.shell) {
      giget.startShell(r.dir);
    }
  }
});
citty.runMain(mainCommand);
