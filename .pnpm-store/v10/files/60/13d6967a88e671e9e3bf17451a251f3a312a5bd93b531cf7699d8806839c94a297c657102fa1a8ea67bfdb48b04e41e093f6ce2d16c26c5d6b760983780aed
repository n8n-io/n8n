#!/usr/bin/env node

import path from 'path'
import arg from 'arg'
import fs from 'fs'

import { build } from './build'
import { help } from './help'
import { init } from './init'

function oneOf(...options) {
  return Object.assign(
    (value = true) => {
      for (let option of options) {
        let parsed = option(value)
        if (parsed === value) {
          return parsed
        }
      }

      throw new Error('...')
    },
    { manualParsing: true }
  )
}

let commands = {
  init: {
    run: init,
    args: {
      '--esm': { type: Boolean, description: `Initialize configuration file as ESM` },
      '--ts': { type: Boolean, description: `Initialize configuration file as TypeScript` },
      '--postcss': { type: Boolean, description: `Initialize a \`postcss.config.js\` file` },
      '--full': {
        type: Boolean,
        description: `Include the default values for all options in the generated configuration file`,
      },
      '-f': '--full',
      '-p': '--postcss',
    },
  },
  build: {
    run: build,
    args: {
      '--input': { type: String, description: 'Input file' },
      '--output': { type: String, description: 'Output file' },
      '--watch': {
        type: oneOf(String, Boolean),
        description: 'Watch for changes and rebuild as needed',
      },
      '--poll': {
        type: Boolean,
        description: 'Use polling instead of filesystem events when watching',
      },
      '--content': {
        type: String,
        description: 'Content paths to use for removing unused classes',
      },
      '--purge': {
        type: String,
        deprecated: true,
      },
      '--postcss': {
        type: oneOf(String, Boolean),
        description: 'Load custom PostCSS configuration',
      },
      '--minify': { type: Boolean, description: 'Minify the output' },
      '--config': {
        type: String,
        description: 'Path to a custom config file',
      },
      '--no-autoprefixer': {
        type: Boolean,
        description: 'Disable autoprefixer',
      },
      '-c': '--config',
      '-i': '--input',
      '-o': '--output',
      '-m': '--minify',
      '-w': '--watch',
      '-p': '--poll',
    },
  },
}

let sharedFlags = {
  '--help': { type: Boolean, description: 'Display usage information' },
  '-h': '--help',
}

if (
  process.stdout.isTTY /* Detect redirecting output to a file */ &&
  (process.argv[2] === undefined ||
    process.argv.slice(2).every((flag) => sharedFlags[flag] !== undefined))
) {
  help({
    usage: [
      'tailwindcss [--input input.css] [--output output.css] [--watch] [options...]',
      'tailwindcss init [--full] [--postcss] [options...]',
    ],
    commands: Object.keys(commands)
      .filter((command) => command !== 'build')
      .map((command) => `${command} [options]`),
    options: { ...commands.build.args, ...sharedFlags },
  })
  process.exit(0)
}

let command = ((arg = '') => (arg.startsWith('-') ? undefined : arg))(process.argv[2]) || 'build'

if (commands[command] === undefined) {
  if (fs.existsSync(path.resolve(command))) {
    // TODO: Deprecate this in future versions
    // Check if non-existing command, might be a file.
    command = 'build'
  } else {
    help({
      message: `Invalid command: ${command}`,
      usage: ['tailwindcss <command> [options]'],
      commands: Object.keys(commands)
        .filter((command) => command !== 'build')
        .map((command) => `${command} [options]`),
      options: sharedFlags,
    })
    process.exit(1)
  }
}

// Execute command
let { args: flags, run } = commands[command]
let args = (() => {
  try {
    let result = arg(
      Object.fromEntries(
        Object.entries({ ...flags, ...sharedFlags })
          .filter(([_key, value]) => !value?.type?.manualParsing)
          .map(([key, value]) => [key, typeof value === 'object' ? value.type : value])
      ),
      { permissive: true }
    )

    // Manual parsing of flags to allow for special flags like oneOf(Boolean, String)
    for (let i = result['_'].length - 1; i >= 0; --i) {
      let flag = result['_'][i]
      if (!flag.startsWith('-')) continue

      let [flagName, flagValue] = flag.split('=')
      let handler = flags[flagName]

      // Resolve flagName & handler
      while (typeof handler === 'string') {
        flagName = handler
        handler = flags[handler]
      }

      if (!handler) continue

      let args = []
      let offset = i + 1

      // --flag value syntax was used so we need to pull `value` from `args`
      if (flagValue === undefined) {
        // Parse args for current flag
        while (result['_'][offset] && !result['_'][offset].startsWith('-')) {
          args.push(result['_'][offset++])
        }

        // Cleanup manually parsed flags + args
        result['_'].splice(i, 1 + args.length)

        // No args were provided, use default value defined in handler
        // One arg was provided, use that directly
        // Multiple args were provided so pass them all in an array
        flagValue = args.length === 0 ? undefined : args.length === 1 ? args[0] : args
      } else {
        // Remove the whole flag from the args array
        result['_'].splice(i, 1)
      }

      // Set the resolved value in the `result` object
      result[flagName] = handler.type(flagValue, flagName)
    }

    // Ensure that the `command` is always the first argument in the `args`.
    // This is important so that we don't have to check if a default command
    // (build) was used or not from within each plugin.
    //
    // E.g.: tailwindcss input.css -> _: ['build', 'input.css']
    // E.g.: tailwindcss build input.css -> _: ['build', 'input.css']
    if (result['_'][0] !== command) {
      result['_'].unshift(command)
    }

    return result
  } catch (err) {
    if (err.code === 'ARG_UNKNOWN_OPTION') {
      help({
        message: err.message,
        usage: ['tailwindcss <command> [options]'],
        options: sharedFlags,
      })
      process.exit(1)
    }
    throw err
  }
})()

if (args['--help']) {
  help({
    options: { ...flags, ...sharedFlags },
    usage: [`tailwindcss ${command} [options]`],
  })
  process.exit(0)
}

run(args)
