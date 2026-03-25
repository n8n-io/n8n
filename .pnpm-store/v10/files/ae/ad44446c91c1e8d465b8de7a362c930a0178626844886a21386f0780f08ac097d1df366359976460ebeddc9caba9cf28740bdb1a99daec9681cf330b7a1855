const FALSY_ENV_VALUES = new Set(['false', 'f', 'n', 'no', 'off', '0']);
const TRUTHY_ENV_VALUES = new Set(['true', 't', 'y', 'yes', 'on', '1']);

/**
 * A helper function which casts an ENV variable value to `true` or `false` using the constants defined above.
 * In strict mode, it may return `null` if the value doesn't match any of the predefined values.
 *
 * @param value The value of the env variable
 * @param options -- Only has `strict` key for now, which requires a strict match for `true` in TRUTHY_ENV_VALUES
 * @returns true/false if the lowercase value matches the predefined values above. If not, null in strict mode,
 *          and Boolean(value) in loose mode.
 */
function envToBool(value, options) {
  const normalized = String(value).toLowerCase();

  if (FALSY_ENV_VALUES.has(normalized)) {
    return false;
  }

  if (TRUTHY_ENV_VALUES.has(normalized)) {
    return true;
  }

  return options?.strict ? null : Boolean(value);
}

export { FALSY_ENV_VALUES, TRUTHY_ENV_VALUES, envToBool };
//# sourceMappingURL=envToBool.js.map
