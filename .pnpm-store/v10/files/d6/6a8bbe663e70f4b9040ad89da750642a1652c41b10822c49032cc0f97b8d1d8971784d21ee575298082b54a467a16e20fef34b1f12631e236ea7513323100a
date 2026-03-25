function createPlugin(plugin, config) {
  return {
    handler: plugin,
    config,
  }
}

createPlugin.withOptions = function (pluginFunction, configFunction = () => ({})) {
  const optionsFunction = function (options) {
    return {
      __options: options,
      handler: pluginFunction(options),
      config: configFunction(options),
    }
  }

  optionsFunction.__isOptionsFunction = true

  // Expose plugin dependencies so that `object-hash` returns a different
  // value if anything here changes, to ensure a rebuild is triggered.
  optionsFunction.__pluginFunction = pluginFunction
  optionsFunction.__configFunction = configFunction

  return optionsFunction
}

export default createPlugin
