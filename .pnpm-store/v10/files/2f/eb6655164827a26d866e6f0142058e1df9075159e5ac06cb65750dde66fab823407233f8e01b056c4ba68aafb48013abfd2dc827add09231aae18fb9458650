import { flagEnabled } from '../featureFlags'
import log, { dim } from './log'

export function normalizeConfig(config) {
  // Quick structure validation
  /**
   * type FilePath = string
   * type RawFile = { raw: string, extension?: string }
   * type ExtractorFn = (content: string) => Array<string>
   * type TransformerFn = (content: string) => string
   *
   * type Content =
   *   | Array<FilePath | RawFile>
   *   | {
   *       files: Array<FilePath | RawFile>,
   *       extract?: ExtractorFn | { [extension: string]: ExtractorFn }
   *       transform?: TransformerFn | { [extension: string]: TransformerFn }
   *   }
   */
  let valid = (() => {
    // `config.purge` should not exist anymore
    if (config.purge) {
      return false
    }

    // `config.content` should exist
    if (!config.content) {
      return false
    }

    // `config.content` should be an object or an array
    if (
      !Array.isArray(config.content) &&
      !(typeof config.content === 'object' && config.content !== null)
    ) {
      return false
    }

    // When `config.content` is an array, it should consist of FilePaths or RawFiles
    if (Array.isArray(config.content)) {
      return config.content.every((path) => {
        // `path` can be a string
        if (typeof path === 'string') return true

        // `path` can be an object { raw: string, extension?: string }
        // `raw` must be a string
        if (typeof path?.raw !== 'string') return false

        // `extension` (if provided) should also be a string
        if (path?.extension && typeof path?.extension !== 'string') {
          return false
        }

        return true
      })
    }

    // When `config.content` is an object
    if (typeof config.content === 'object' && config.content !== null) {
      // Only `files`, `relative`, `extract`, and `transform` can exist in `config.content`
      if (
        Object.keys(config.content).some(
          (key) => !['files', 'relative', 'extract', 'transform'].includes(key)
        )
      ) {
        return false
      }

      // `config.content.files` should exist of FilePaths or RawFiles
      if (Array.isArray(config.content.files)) {
        if (
          !config.content.files.every((path) => {
            // `path` can be a string
            if (typeof path === 'string') return true

            // `path` can be an object { raw: string, extension?: string }
            // `raw` must be a string
            if (typeof path?.raw !== 'string') return false

            // `extension` (if provided) should also be a string
            if (path?.extension && typeof path?.extension !== 'string') {
              return false
            }

            return true
          })
        ) {
          return false
        }

        // `config.content.extract` is optional, and can be a Function or a Record<String, Function>
        if (typeof config.content.extract === 'object') {
          for (let value of Object.values(config.content.extract)) {
            if (typeof value !== 'function') {
              return false
            }
          }
        } else if (
          !(config.content.extract === undefined || typeof config.content.extract === 'function')
        ) {
          return false
        }

        // `config.content.transform` is optional, and can be a Function or a Record<String, Function>
        if (typeof config.content.transform === 'object') {
          for (let value of Object.values(config.content.transform)) {
            if (typeof value !== 'function') {
              return false
            }
          }
        } else if (
          !(
            config.content.transform === undefined || typeof config.content.transform === 'function'
          )
        ) {
          return false
        }

        // `config.content.relative` is optional and can be a boolean
        if (
          typeof config.content.relative !== 'boolean' &&
          typeof config.content.relative !== 'undefined'
        ) {
          return false
        }
      }

      return true
    }

    return false
  })()

  if (!valid) {
    log.warn('purge-deprecation', [
      'The `purge`/`content` options have changed in Tailwind CSS v3.0.',
      'Update your configuration file to eliminate this warning.',
      'https://tailwindcss.com/docs/upgrade-guide#configure-content-sources',
    ])
  }

  // Normalize the `safelist`
  config.safelist = (() => {
    let { content, purge, safelist } = config

    if (Array.isArray(safelist)) return safelist
    if (Array.isArray(content?.safelist)) return content.safelist
    if (Array.isArray(purge?.safelist)) return purge.safelist
    if (Array.isArray(purge?.options?.safelist)) return purge.options.safelist

    return []
  })()

  // Normalize the `blocklist`
  config.blocklist = (() => {
    let { blocklist } = config

    if (Array.isArray(blocklist)) {
      if (blocklist.every((item) => typeof item === 'string')) {
        return blocklist
      }

      log.warn('blocklist-invalid', [
        'The `blocklist` option must be an array of strings.',
        'https://tailwindcss.com/docs/content-configuration#discarding-classes',
      ])
    }

    return []
  })()

  // Normalize prefix option
  if (typeof config.prefix === 'function') {
    log.warn('prefix-function', [
      'As of Tailwind CSS v3.0, `prefix` cannot be a function.',
      'Update `prefix` in your configuration to be a string to eliminate this warning.',
      'https://tailwindcss.com/docs/upgrade-guide#prefix-cannot-be-a-function',
    ])
    config.prefix = ''
  } else {
    config.prefix = config.prefix ?? ''
  }

  // Normalize the `content`
  config.content = {
    relative: (() => {
      let { content } = config

      if (content?.relative) {
        return content.relative
      }

      return flagEnabled(config, 'relativeContentPathsByDefault')
    })(),

    files: (() => {
      let { content, purge } = config

      if (Array.isArray(purge)) return purge
      if (Array.isArray(purge?.content)) return purge.content
      if (Array.isArray(content)) return content
      if (Array.isArray(content?.content)) return content.content
      if (Array.isArray(content?.files)) return content.files

      return []
    })(),

    extract: (() => {
      let extract = (() => {
        if (config.purge?.extract) return config.purge.extract
        if (config.content?.extract) return config.content.extract

        if (config.purge?.extract?.DEFAULT) return config.purge.extract.DEFAULT
        if (config.content?.extract?.DEFAULT) return config.content.extract.DEFAULT

        if (config.purge?.options?.extractors) return config.purge.options.extractors
        if (config.content?.options?.extractors) return config.content.options.extractors

        return {}
      })()

      let extractors = {}

      let defaultExtractor = (() => {
        if (config.purge?.options?.defaultExtractor) {
          return config.purge.options.defaultExtractor
        }

        if (config.content?.options?.defaultExtractor) {
          return config.content.options.defaultExtractor
        }

        return undefined
      })()

      if (defaultExtractor !== undefined) {
        extractors.DEFAULT = defaultExtractor
      }

      // Functions
      if (typeof extract === 'function') {
        extractors.DEFAULT = extract
      }

      // Arrays
      else if (Array.isArray(extract)) {
        for (let { extensions, extractor } of extract ?? []) {
          for (let extension of extensions) {
            extractors[extension] = extractor
          }
        }
      }

      // Objects
      else if (typeof extract === 'object' && extract !== null) {
        Object.assign(extractors, extract)
      }

      return extractors
    })(),

    transform: (() => {
      let transform = (() => {
        if (config.purge?.transform) return config.purge.transform
        if (config.content?.transform) return config.content.transform

        if (config.purge?.transform?.DEFAULT) return config.purge.transform.DEFAULT
        if (config.content?.transform?.DEFAULT) return config.content.transform.DEFAULT

        return {}
      })()

      let transformers = {}

      if (typeof transform === 'function') {
        transformers.DEFAULT = transform
      } else if (typeof transform === 'object' && transform !== null) {
        Object.assign(transformers, transform)
      }

      return transformers
    })(),
  }

  // Validate globs to prevent bogus globs.
  // E.g.: `./src/*.{html}` is invalid, the `{html}` should just be `html`
  for (let file of config.content.files) {
    if (typeof file === 'string' && /{([^,]*?)}/g.test(file)) {
      log.warn('invalid-glob-braces', [
        `The glob pattern ${dim(file)} in your Tailwind CSS configuration is invalid.`,
        `Update it to ${dim(file.replace(/{([^,]*?)}/g, '$1'))} to silence this warning.`,
        // TODO: Add https://tw.wtf/invalid-glob-braces
      ])
      break
    }
  }

  return config
}
