// @ts-check

import path from 'path'
import fs from 'fs'
import postcssrc from 'postcss-load-config'
import { lilconfig } from 'lilconfig'
import loadPlugins from 'postcss-load-config/src/plugins' // Little bit scary, looking at private/internal API
import loadOptions from 'postcss-load-config/src/options' // Little bit scary, looking at private/internal API

import tailwind from '../../processTailwindFeatures'
import { loadAutoprefixer, loadCssNano, loadPostcss, loadPostcssImport } from './deps'
import { formatNodes, drainStdin, outputFile } from './utils'
import { env } from '../../lib/sharedState'
import resolveConfig from '../../../resolveConfig.js'
import { parseCandidateFiles } from '../../lib/content.js'
import { createWatcher } from './watching.js'
import fastGlob from 'fast-glob'
import { findAtConfigPath } from '../../lib/findAtConfigPath.js'
import log from '../../util/log'
import { loadConfig } from '../../lib/load-config'
import getModuleDependencies from '../../lib/getModuleDependencies'

/**
 *
 * @param {string} [customPostCssPath ]
 * @returns
 */
async function loadPostCssPlugins(customPostCssPath) {
  let config = customPostCssPath
    ? await (async () => {
        let file = path.resolve(customPostCssPath)

        // Implementation, see: https://unpkg.com/browse/postcss-load-config@3.1.0/src/index.js
        // @ts-ignore
        let { config = {} } = await lilconfig('postcss').load(file)
        if (typeof config === 'function') {
          config = config()
        } else {
          config = Object.assign({}, config)
        }

        if (!config.plugins) {
          config.plugins = []
        }

        return {
          file,
          plugins: loadPlugins(config, file),
          options: loadOptions(config, file),
        }
      })()
    : await postcssrc()

  let configPlugins = config.plugins

  let configPluginTailwindIdx = configPlugins.findIndex((plugin) => {
    if (typeof plugin === 'function' && plugin.name === 'tailwindcss') {
      return true
    }

    if (typeof plugin === 'object' && plugin !== null && plugin.postcssPlugin === 'tailwindcss') {
      return true
    }

    return false
  })

  let beforePlugins =
    configPluginTailwindIdx === -1 ? [] : configPlugins.slice(0, configPluginTailwindIdx)
  let afterPlugins =
    configPluginTailwindIdx === -1
      ? configPlugins
      : configPlugins.slice(configPluginTailwindIdx + 1)

  return [beforePlugins, afterPlugins, config.options]
}

function loadBuiltinPostcssPlugins() {
  let postcss = loadPostcss()
  let IMPORT_COMMENT = '__TAILWIND_RESTORE_IMPORT__: '
  return [
    [
      (root) => {
        root.walkAtRules('import', (rule) => {
          if (rule.params.slice(1).startsWith('tailwindcss/')) {
            rule.after(postcss.comment({ text: IMPORT_COMMENT + rule.params }))
            rule.remove()
          }
        })
      },
      loadPostcssImport(),
      (root) => {
        root.walkComments((rule) => {
          if (rule.text.startsWith(IMPORT_COMMENT)) {
            rule.after(
              postcss.atRule({
                name: 'import',
                params: rule.text.replace(IMPORT_COMMENT, ''),
              })
            )
            rule.remove()
          }
        })
      },
    ],
    [],
    {},
  ]
}

let state = {
  /** @type {any} */
  context: null,

  /** @type {ReturnType<typeof createWatcher> | null} */
  watcher: null,

  /** @type {{content: string, extension: string}[]} */
  changedContent: [],

  /** @type {ReturnType<typeof load> | null} */
  configBag: null,

  contextDependencies: new Set(),

  /** @type {import('../../lib/content.js').ContentPath[]} */
  contentPaths: [],

  refreshContentPaths() {
    this.contentPaths = parseCandidateFiles(this.context, this.context?.tailwindConfig)
  },

  get config() {
    return this.context.tailwindConfig
  },

  get contentPatterns() {
    return {
      all: this.contentPaths.map((contentPath) => contentPath.pattern),
      dynamic: this.contentPaths
        .filter((contentPath) => contentPath.glob !== undefined)
        .map((contentPath) => contentPath.pattern),
    }
  },

  loadConfig(configPath, content) {
    if (this.watcher && configPath) {
      this.refreshConfigDependencies()
    }

    let config = loadConfig(configPath)
    let dependencies = getModuleDependencies(configPath)
    this.configBag = {
      config,
      dependencies,
      dispose() {
        for (let file of dependencies) {
          delete require.cache[require.resolve(file)]
        }
      },
    }

    // @ts-ignore
    this.configBag.config = resolveConfig(this.configBag.config, { content: { files: [] } })

    // Override content files if `--content` has been passed explicitly
    if (content?.length > 0) {
      this.configBag.config.content.files = content
    }

    return this.configBag.config
  },

  refreshConfigDependencies() {
    env.DEBUG && console.time('Module dependencies')
    this.configBag?.dispose()
    env.DEBUG && console.timeEnd('Module dependencies')
  },

  readContentPaths() {
    let content = []

    // Resolve globs from the content config
    // TODO: When we make the postcss plugin async-capable this can become async
    let files = fastGlob.sync(this.contentPatterns.all)

    for (let file of files) {
      content.push({
        content: fs.readFileSync(path.resolve(file), 'utf8'),
        extension: path.extname(file).slice(1),
      })
    }

    // Resolve raw content in the tailwind config
    let rawContent = this.config.content.files.filter((file) => {
      return file !== null && typeof file === 'object'
    })

    for (let { raw: htmlContent, extension = 'html' } of rawContent) {
      content.push({ content: htmlContent, extension })
    }

    return content
  },

  getContext({ createContext, cliConfigPath, root, result, content }) {
    env.DEBUG && console.time('Searching for config')
    let configPath = findAtConfigPath(root, result) ?? cliConfigPath
    env.DEBUG && console.timeEnd('Searching for config')

    if (this.context) {
      this.context.changedContent = this.changedContent.splice(0)

      return this.context
    }

    env.DEBUG && console.time('Loading config')
    let config = this.loadConfig(configPath, content)
    env.DEBUG && console.timeEnd('Loading config')

    env.DEBUG && console.time('Creating context')
    this.context = createContext(config, [])
    Object.assign(this.context, {
      userConfigPath: configPath,
    })
    env.DEBUG && console.timeEnd('Creating context')

    env.DEBUG && console.time('Resolving content paths')
    this.refreshContentPaths()
    env.DEBUG && console.timeEnd('Resolving content paths')

    if (this.watcher) {
      env.DEBUG && console.time('Watch new files')
      this.watcher.refreshWatchedFiles()
      env.DEBUG && console.timeEnd('Watch new files')
    }

    for (let file of this.readContentPaths()) {
      this.context.changedContent.push(file)
    }

    return this.context
  },
}

export async function createProcessor(args, cliConfigPath) {
  let postcss = loadPostcss()

  let input = args['--input']
  let output = args['--output']
  let includePostCss = args['--postcss']
  let customPostCssPath = typeof args['--postcss'] === 'string' ? args['--postcss'] : undefined

  let [beforePlugins, afterPlugins, postcssOptions] = includePostCss
    ? await loadPostCssPlugins(customPostCssPath)
    : loadBuiltinPostcssPlugins()

  if (args['--purge']) {
    log.warn('purge-flag-deprecated', [
      'The `--purge` flag has been deprecated.',
      'Please use `--content` instead.',
    ])

    if (!args['--content']) {
      args['--content'] = args['--purge']
    }
  }

  let content = args['--content']?.split(/(?<!{[^}]+),/) ?? []

  let tailwindPlugin = () => {
    return {
      postcssPlugin: 'tailwindcss',
      async Once(root, { result }) {
        env.DEBUG && console.time('Compiling CSS')
        await tailwind(({ createContext }) => {
          console.error()
          console.error('Rebuilding...')

          return () => {
            return state.getContext({
              createContext,
              cliConfigPath,
              root,
              result,
              content,
            })
          }
        })(root, result)
        env.DEBUG && console.timeEnd('Compiling CSS')
      },
    }
  }

  tailwindPlugin.postcss = true

  let plugins = [
    ...beforePlugins,
    tailwindPlugin,
    !args['--minify'] && formatNodes,
    ...afterPlugins,
    !args['--no-autoprefixer'] && loadAutoprefixer(),
    args['--minify'] && loadCssNano(),
  ].filter(Boolean)

  /** @type {import('postcss').Processor} */
  // @ts-ignore
  let processor = postcss(plugins)

  async function readInput() {
    // Piping in data, let's drain the stdin
    if (input === '-') {
      return drainStdin()
    }

    // Input file has been provided
    if (input) {
      return fs.promises.readFile(path.resolve(input), 'utf8')
    }

    // No input file provided, fallback to default atrules
    return '@tailwind base; @tailwind components; @tailwind utilities'
  }

  async function build() {
    let start = process.hrtime.bigint()

    return readInput()
      .then((css) => processor.process(css, { ...postcssOptions, from: input, to: output }))
      .then((result) => {
        if (!state.watcher) {
          return result
        }

        env.DEBUG && console.time('Recording PostCSS dependencies')
        for (let message of result.messages) {
          if (message.type === 'dependency') {
            state.contextDependencies.add(message.file)
          }
        }
        env.DEBUG && console.timeEnd('Recording PostCSS dependencies')

        // TODO: This needs to be in a different spot
        env.DEBUG && console.time('Watch new files')
        state.watcher.refreshWatchedFiles()
        env.DEBUG && console.timeEnd('Watch new files')

        return result
      })
      .then((result) => {
        if (!output) {
          process.stdout.write(result.css)
          return
        }

        return Promise.all([
          outputFile(result.opts.to, result.css),
          result.map && outputFile(result.opts.to + '.map', result.map.toString()),
        ])
      })
      .then(() => {
        let end = process.hrtime.bigint()
        console.error()
        console.error('Done in', (end - start) / BigInt(1e6) + 'ms.')
      })
      .then(
        () => {},
        (err) => {
          // TODO: If an initial build fails we can't easily pick up any PostCSS dependencies
          // that were collected before the error occurred
          // The result is not stored on the error so we have to store it externally
          // and pull the messages off of it here somehow

          // This results in a less than ideal DX because the watcher will not pick up
          // changes to imported CSS if one of them caused an error during the initial build
          // If you fix it and then save the main CSS file so there's no error
          // The watcher will start watching the imported CSS files and will be
          // resilient to future errors.

          if (state.watcher) {
            console.error(err)
          } else {
            return Promise.reject(err)
          }
        }
      )
  }

  /**
   * @param {{file: string, content(): Promise<string>, extension: string}[]} changes
   */
  async function parseChanges(changes) {
    return Promise.all(
      changes.map(async (change) => ({
        content: await change.content(),
        extension: change.extension,
      }))
    )
  }

  if (input !== undefined && input !== '-') {
    state.contextDependencies.add(path.resolve(input))
  }

  return {
    build,
    watch: async () => {
      state.watcher = createWatcher(args, {
        state,

        /**
         * @param {{file: string, content(): Promise<string>, extension: string}[]} changes
         */
        async rebuild(changes) {
          let needsNewContext = changes.some((change) => {
            return (
              state.configBag?.dependencies.has(change.file) ||
              state.contextDependencies.has(change.file)
            )
          })

          if (needsNewContext) {
            state.context = null
          } else {
            for (let change of await parseChanges(changes)) {
              state.changedContent.push(change)
            }
          }

          return build()
        },
      })

      await build()
    },
  }
}
