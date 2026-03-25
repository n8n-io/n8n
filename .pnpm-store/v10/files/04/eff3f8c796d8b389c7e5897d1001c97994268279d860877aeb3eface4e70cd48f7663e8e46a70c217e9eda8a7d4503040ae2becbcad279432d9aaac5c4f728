import jitiFactory from 'jiti'
import { transform } from 'sucrase'

import { Config } from '../../types/config'

let jiti: ReturnType<typeof jitiFactory> | null = null

// @internal
// This WILL be removed in some future release
// If you rely on this your stuff WILL break
export function useCustomJiti(_jiti: () => ReturnType<typeof jitiFactory>) {
  jiti = _jiti()
}

function lazyJiti() {
  return (
    jiti ??
    (jiti = jitiFactory(__filename, {
      interopDefault: true,
      transform: (opts) => {
        // Sucrase can't transform import.meta so we have to use Babel
        if (opts.source.includes('import.meta')) {
          return require('jiti/dist/babel.js')(opts)
        }

        return transform(opts.source, {
          transforms: ['typescript', 'imports'],
        })
      },
    }))
  )
}

export function loadConfig(path: string): Config {
  let config = (function () {
    try {
      return path ? require(path) : {}
    } catch {
      return lazyJiti()(path)
    }
  })()

  return config.default ?? config
}
