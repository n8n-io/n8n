import log from './log'

export function validateConfig(config) {
  if (config.content.files.length === 0) {
    log.warn('content-problems', [
      'The `content` option in your Tailwind CSS configuration is missing or empty.',
      'Configure your content sources or your generated CSS will be missing styles.',
      'https://tailwindcss.com/docs/content-configuration',
    ])
  }

  // Warn if the line-clamp plugin is installed
  try {
    let plugin = require('@tailwindcss/line-clamp')
    if (config.plugins.includes(plugin)) {
      log.warn('line-clamp-in-core', [
        'As of Tailwind CSS v3.3, the `@tailwindcss/line-clamp` plugin is now included by default.',
        'Remove it from the `plugins` array in your configuration to eliminate this warning.',
      ])

      config.plugins = config.plugins.filter((p) => p !== plugin)
    }
  } catch {}

  return config
}
