import defaultFullConfig from '../../stubs/config.full.js'
import { flagEnabled } from '../featureFlags'

export default function getAllConfigs(config) {
  const configs = (config?.presets ?? [defaultFullConfig])
    .slice()
    .reverse()
    .flatMap((preset) => getAllConfigs(preset instanceof Function ? preset() : preset))

  const features = {
    // Add experimental configs here...
    respectDefaultRingColorOpacity: {
      theme: {
        ringColor: ({ theme }) => ({
          DEFAULT: '#3b82f67f',
          ...theme('colors'),
        }),
      },
    },

    disableColorOpacityUtilitiesByDefault: {
      corePlugins: {
        backgroundOpacity: false,
        borderOpacity: false,
        divideOpacity: false,
        placeholderOpacity: false,
        ringOpacity: false,
        textOpacity: false,
      },
    },
  }

  const experimentals = Object.keys(features)
    .filter((feature) => flagEnabled(config, feature))
    .map((feature) => features[feature])

  return [config, ...experimentals, ...configs]
}
