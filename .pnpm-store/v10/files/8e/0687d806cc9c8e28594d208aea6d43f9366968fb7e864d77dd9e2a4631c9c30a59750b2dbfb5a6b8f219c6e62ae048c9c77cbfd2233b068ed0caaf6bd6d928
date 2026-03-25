'use strict'

const resolve = require('path').resolve
const url = require('url')

const config = require('lilconfig')
const yaml = require('yaml')

const loadOptions = require('./options.js')
const loadPlugins = require('./plugins.js')

/* istanbul ignore next */
const interopRequireDefault = (obj) => obj && obj.__esModule ? obj : { default: obj }

/**
 * Process the result from cosmiconfig
 *
 * @param  {Object} ctx Config Context
 * @param  {Object} result Cosmiconfig result
 *
 * @return {Object} PostCSS Config
 */
const processResult = (ctx, result) => {
  const file = result.filepath || ''
  let config = interopRequireDefault(result.config).default || {}

  if (typeof config === 'function') {
    config = config(ctx)
  } else {
    config = Object.assign({}, config, ctx)
  }

  if (!config.plugins) {
    config.plugins = []
  }

  return {
    plugins: loadPlugins(config, file),
    options: loadOptions(config, file),
    file
  }
}

/**
 * Builds the Config Context
 *
 * @param  {Object} ctx Config Context
 *
 * @return {Object} Config Context
 */
const createContext = (ctx) => {
  /**
   * @type {Object}
   *
   * @prop {String} cwd=process.cwd() Config search start location
   * @prop {String} env=process.env.NODE_ENV Config Enviroment, will be set to `development` by `postcss-load-config` if `process.env.NODE_ENV` is `undefined`
   */
  ctx = Object.assign({
    cwd: process.cwd(),
    env: process.env.NODE_ENV
  }, ctx)

  if (!ctx.env) {
    process.env.NODE_ENV = 'development'
  }

  return ctx
}

const importDefault = async filepath => {
  const module = await import(url.pathToFileURL(filepath).href)
  return module.default
}

const addTypeScriptLoader = (options = {}, loader) => {
  const moduleName = 'postcss'

  return {
    ...options,
    searchPlaces: [
      ...(options.searchPlaces || []),
      'package.json',
      `.${moduleName}rc`,
      `.${moduleName}rc.json`,
      `.${moduleName}rc.yaml`,
      `.${moduleName}rc.yml`,
      `.${moduleName}rc.ts`,
      `.${moduleName}rc.cts`,
      `.${moduleName}rc.js`,
      `.${moduleName}rc.cjs`,
      `.${moduleName}rc.mjs`,
      `${moduleName}.config.ts`,
      `${moduleName}.config.cts`,
      `${moduleName}.config.js`,
      `${moduleName}.config.cjs`,
      `${moduleName}.config.mjs`
    ],
    loaders: {
      ...options.loaders,
      '.yaml': (filepath, content) => yaml.parse(content),
      '.yml': (filepath, content) => yaml.parse(content),
      '.js': importDefault,
      '.cjs': importDefault,
      '.mjs': importDefault,
      '.ts': loader,
      '.cts': loader
    }
  }
}

const withTypeScriptLoader = (rcFunc) => {
  return (ctx, path, options) => {
    return rcFunc(ctx, path, addTypeScriptLoader(options, (configFile) => {
      let registerer = { enabled () {} }

      try {
        // Register TypeScript compiler instance
        registerer = require('ts-node').register({
          // transpile to cjs even if compilerOptions.module in tsconfig is not Node16/NodeNext.
          moduleTypes: { '**/*.cts': 'cjs' }
        })

        return require(configFile)
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          throw new Error(
            `'ts-node' is required for the TypeScript configuration files. Make sure it is installed\nError: ${err.message}`
          )
        }

        throw err
      } finally {
        registerer.enabled(false)
      }
    }))
  }
}

/**
 * Load Config
 *
 * @method rc
 *
 * @param  {Object} ctx Config Context
 * @param  {String} path Config Path
 * @param  {Object} options Config Options
 *
 * @return {Promise} config PostCSS Config
 */
const rc = withTypeScriptLoader((ctx, path, options) => {
  /**
   * @type {Object} The full Config Context
   */
  ctx = createContext(ctx)

  /**
   * @type {String} `process.cwd()`
   */
  path = path ? resolve(path) : process.cwd()

  return config.lilconfig('postcss', options)
    .search(path)
    .then((result) => {
      if (!result) {
        throw new Error(`No PostCSS Config found in: ${path}`)
      }

      return processResult(ctx, result)
    })
})

/**
 * Autoload Config for PostCSS
 *
 * @author Michael Ciniawsky @michael-ciniawsky <michael.ciniawsky@gmail.com>
 * @license MIT
 *
 * @module postcss-load-config
 * @version 2.1.0
 *
 * @requires comsiconfig
 * @requires ./options
 * @requires ./plugins
 */
module.exports = rc
