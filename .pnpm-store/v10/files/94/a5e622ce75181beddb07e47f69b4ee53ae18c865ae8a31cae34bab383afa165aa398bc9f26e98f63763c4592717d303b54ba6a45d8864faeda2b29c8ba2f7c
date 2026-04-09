// @ts-check
const req = require('./req.js')

/**
 * Plugin Loader
 *
 * @private
 * @method load
 *
 * @param  {String} plugin PostCSS Plugin Name
 * @param  {Object} options PostCSS Plugin Options
 *
 * @return {Promise<Function>} PostCSS Plugin
 */
async function load(plugin, options, file) {
  try {
    if (
      options === null ||
      options === undefined ||
      Object.keys(options).length === 0
    ) {
      return await req(plugin, file)
    } else {
      return (await req(plugin, file))(options)
      /* c8 ignore next */
    }
  } catch (err) {
    throw new Error(
      `Loading PostCSS Plugin failed: ${err.message}\n\n(@${file})`
    )
  }
}

/**
 * Load Plugins
 *
 * @private
 * @method plugins
 *
 * @param {Object} config PostCSS Config Plugins
 *
 * @return {Promise<Array>} plugins PostCSS Plugins
 */
async function plugins(config, file) {
  let list = []

  if (Array.isArray(config.plugins)) {
    list = config.plugins.filter(Boolean)
  } else {
    list = Object.entries(config.plugins)
      .filter(([, options]) => {
        return options !== false
      })
      .map(([plugin, options]) => {
        return load(plugin, options, file)
      })
    list = await Promise.all(list)
  }

  if (list.length && list.length > 0) {
    list.forEach((plugin, i) => {
      if (plugin.default) {
        plugin = plugin.default
      }

      if (plugin.postcss === true) {
        plugin = plugin()
      } else if (plugin.postcss) {
        plugin = plugin.postcss
      }

      if (
        !(
          (typeof plugin === 'object' && Array.isArray(plugin.plugins)) ||
          (typeof plugin === 'object' && plugin.postcssPlugin) ||
          typeof plugin === 'function'
        )
      ) {
        throw new TypeError(
          `Invalid PostCSS Plugin found at: plugins[${i}]\n\n(@${file})`
        )
      }
    })
  }

  return list
}

module.exports = plugins
