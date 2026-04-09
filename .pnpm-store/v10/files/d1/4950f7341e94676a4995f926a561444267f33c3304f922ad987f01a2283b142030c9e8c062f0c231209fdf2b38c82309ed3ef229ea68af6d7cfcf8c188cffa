// @ts-check
const req = require('./req.js')

/**
 * Load Options
 *
 * @private
 * @method options
 *
 * @param  {Object} config  PostCSS Config
 *
 * @return {Promise<Object>} options PostCSS Options
 */
async function options(config, file) {
  if (config.parser && typeof config.parser === 'string') {
    try {
      config.parser = await req(config.parser, file)
    } catch (err) {
      throw new Error(
        `Loading PostCSS Parser failed: ${err.message}\n\n(@${file})`
      )
    }
  }

  if (config.syntax && typeof config.syntax === 'string') {
    try {
      config.syntax = await req(config.syntax, file)
    } catch (err) {
      throw new Error(
        `Loading PostCSS Syntax failed: ${err.message}\n\n(@${file})`
      )
    }
  }

  if (config.stringifier && typeof config.stringifier === 'string') {
    try {
      config.stringifier = await req(config.stringifier, file)
    } catch (err) {
      throw new Error(
        `Loading PostCSS Stringifier failed: ${err.message}\n\n(@${file})`
      )
    }
  }

  return config
}

module.exports = options
