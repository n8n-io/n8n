/**
 * Loads an optional `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @returns The setting value.
 */
export function loadOptionalSetting({
  settingValue,
  environmentVariableName,
}: {
  settingValue: string | undefined;
  environmentVariableName: string;
}): string | undefined {
  if (typeof settingValue === 'string') {
    return settingValue;
  }

  if (settingValue != null || typeof process === 'undefined') {
    return undefined;
  }

  settingValue = process.env[environmentVariableName];

  if (settingValue == null || typeof settingValue !== 'string') {
    return undefined;
  }

  return settingValue;
}
