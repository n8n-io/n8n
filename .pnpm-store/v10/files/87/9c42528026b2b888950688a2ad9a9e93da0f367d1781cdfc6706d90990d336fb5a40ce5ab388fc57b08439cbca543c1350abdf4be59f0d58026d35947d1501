import colors from 'picocolors'
import log from './util/log'

let defaults = {
  optimizeUniversalDefaults: false,
  generalizedModifiers: true,
  disableColorOpacityUtilitiesByDefault: false,
  relativeContentPathsByDefault: false,
}

let featureFlags = {
  future: [
    'hoverOnlyWhenSupported',
    'respectDefaultRingColorOpacity',
    'disableColorOpacityUtilitiesByDefault',
    'relativeContentPathsByDefault',
  ],
  experimental: ['optimizeUniversalDefaults', 'generalizedModifiers'],
}

export function flagEnabled(config, flag) {
  if (featureFlags.future.includes(flag)) {
    return config.future === 'all' || (config?.future?.[flag] ?? defaults[flag] ?? false)
  }

  if (featureFlags.experimental.includes(flag)) {
    return (
      config.experimental === 'all' || (config?.experimental?.[flag] ?? defaults[flag] ?? false)
    )
  }

  return false
}

function experimentalFlagsEnabled(config) {
  if (config.experimental === 'all') {
    return featureFlags.experimental
  }

  return Object.keys(config?.experimental ?? {}).filter(
    (flag) => featureFlags.experimental.includes(flag) && config.experimental[flag]
  )
}

export function issueFlagNotices(config) {
  if (process.env.JEST_WORKER_ID !== undefined) {
    return
  }

  if (experimentalFlagsEnabled(config).length > 0) {
    let changes = experimentalFlagsEnabled(config)
      .map((s) => colors.yellow(s))
      .join(', ')

    log.warn('experimental-flags-enabled', [
      `You have enabled experimental features: ${changes}`,
      'Experimental features in Tailwind CSS are not covered by semver, may introduce breaking changes, and can change at any time.',
    ])
  }
}

export default featureFlags
