const description =
  ' See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.'

warnCjsUsage()

// type utils
module.exports.defineConfig = (config) => config

// proxy cjs utils (sync functions)
Object.assign(module.exports, require('./dist/node-cjs/publicUtils.cjs'))

// async functions, can be redirect from ESM build
const asyncFunctions = [
  'build',
  'createServer',
  'preview',
  'transformWithEsbuild',
  'resolveConfig',
  'optimizeDeps',
  'formatPostcssSourceMap',
  'loadConfigFromFile',
  'preprocessCSS',
  'createBuilder',
  'runnerImport',
]
asyncFunctions.forEach((name) => {
  module.exports[name] = (...args) =>
    import('./dist/node/index.js').then((i) => i[name](...args))
})

// variables and sync functions that cannot be used from cjs build
const disallowedVariables = [
  // was not exposed in cjs from the beginning
  'parseAst',
  'parseAstAsync',
  'buildErrorMessage',
  'sortUserPlugins',
  // Environment API related variables that are too big to include in the cjs build
  'DevEnvironment',
  'BuildEnvironment',
  'createIdResolver',
  'createRunnableDevEnvironment',
  // can be redirected from ESM, but doesn't make sense as it's Environment API related
  'fetchModule',
  'moduleRunnerTransform',
  // can be exposed, but doesn't make sense as it's Environment API related
  'createServerHotChannel',
  'createServerModuleRunner',
  'createServerModuleRunnerTransport',
  'isRunnableDevEnvironment',
  'createFetchableDevEnvironment',
  'isFetchableDevEnvironment',
]
disallowedVariables.forEach((name) => {
  Object.defineProperty(module.exports, name, {
    get() {
      throw new Error(
        `${name} is not available in the CJS build of Vite.` + description,
      )
    },
  })
})

function warnCjsUsage() {
  if (process.env.VITE_CJS_IGNORE_WARNING) return
  const logLevelIndex = process.argv.findIndex((arg) =>
    /^(?:-l|--logLevel)/.test(arg),
  )
  if (logLevelIndex > 0) {
    const logLevelValue = process.argv[logLevelIndex + 1]
    if (logLevelValue === 'silent' || logLevelValue === 'error') {
      return
    }
    if (/silent|error/.test(process.argv[logLevelIndex])) {
      return
    }
  }
  const yellow = (str) => `\u001b[33m${str}\u001b[39m`
  console.warn(
    yellow("The CJS build of Vite's Node API is deprecated." + description),
  )
  if (process.env.VITE_CJS_TRACE) {
    const e = {}
    const stackTraceLimit = Error.stackTraceLimit
    Error.stackTraceLimit = 100
    Error.captureStackTrace(e)
    Error.stackTraceLimit = stackTraceLimit
    console.log(
      e.stack
        .split('\n')
        .slice(1)
        .filter((line) => !line.includes('(node:'))
        .join('\n'),
    )
  }
}
