import browserslist from 'browserslist'

// convert the browserslist field in package.json to
// esbuild compatible array of browsers
export default function browserslistToEsbuild(browserslistConfig, options = {}) {
  if (!browserslistConfig) {
    // the path from where the script is run
    const path = process.cwd()

    // read config if none is passed
    browserslistConfig = browserslist.loadConfig({ path, ...options })
  }

  const SUPPORTED_ESBUILD_TARGETS = [
    'es',
    'chrome',
    'edge',
    'firefox',
    'ios',
    'node',
    'safari',
    'opera',
    'ie',
  ]

  // https://github.com/eBay/browserslist-config/issues/16#issuecomment-863870093
  const UNSUPPORTED = ['android 4']

  const replaces = {
    ios_saf: 'ios',
    android: 'chrome',
  }

  const separator = ' '

  return (
    browserslist(browserslistConfig, options)
      // filter out the unsupported ones
      .filter((b) => !UNSUPPORTED.some((u) => b.startsWith(u)))
      // replaces safari TP with latest safari version
      .map((b) => {
        if (b === 'safari TP') {
          return browserslist('last 1 safari version')[0]
        }

        return b
      })
      // transform into ['chrome', '88']
      .map((b) => b.split(separator))
      // replace the similar browser
      .map((b) => {
        if (replaces[b[0]]) {
          b[0] = replaces[b[0]]
        }

        return b
      })
      // 11.0-12.0 --> 11.0
      .map((b) => {
        if (b[1].includes('-')) {
          b[1] = b[1].slice(0, b[1].indexOf('-'))
        }

        return b
      })
      // 11.0 --> 11
      .map((b) => {
        if (b[1].endsWith('.0')) {
          b[1] = b[1].slice(0, -2)
        }

        return b
      })
      // removes invalid versions that will break esbuild
      // https://github.com/evanw/esbuild/blob/35c0d65b9d4f29a26176404d2890d1b499634e9f/compat-table/src/caniuse.ts#L119-L122
      .filter((b) => /^\d+(\.\d+)*$/.test(b[1]))
      // only get the targets supported by esbuild
      .filter((b) => SUPPORTED_ESBUILD_TARGETS.includes(b[0]))
      // only get the oldest version, assuming that the older version
      // is last in the array
      .reduce((acc, b) => {
        const existingIndex = acc.findIndex((br) => br[0] === b[0])

        if (existingIndex !== -1) {
          acc[existingIndex][1] = b[1]
        } else {
          acc.push(b)
        }
        return acc
      }, [])
      // remove separator
      .map((b) => b.join(''))
  )
}
