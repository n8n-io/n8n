import { envToBool } from '@sentry/core';

/**
 * Parse the spotlight option with proper precedence:
 * - `false` or explicit string from options: use as-is
 * - `true`: enable spotlight, but prefer a custom URL from the env var if set
 * - `undefined`: defer entirely to the env var (bool or URL)
 */
function getSpotlightConfig(optionsSpotlight) {
  if (optionsSpotlight === false) {
    return false;
  }

  if (typeof optionsSpotlight === 'string') {
    return optionsSpotlight;
  }

  // optionsSpotlight is true or undefined
  const envBool = envToBool(process.env.SENTRY_SPOTLIGHT, { strict: true });
  const envUrl = envBool === null && process.env.SENTRY_SPOTLIGHT ? process.env.SENTRY_SPOTLIGHT : undefined;

  return optionsSpotlight === true
    ? (envUrl ?? true) // true: use env URL if present, otherwise true
    : (envBool ?? envUrl); // undefined: use env var (bool or URL)
}

export { getSpotlightConfig };
//# sourceMappingURL=spotlight.js.map
