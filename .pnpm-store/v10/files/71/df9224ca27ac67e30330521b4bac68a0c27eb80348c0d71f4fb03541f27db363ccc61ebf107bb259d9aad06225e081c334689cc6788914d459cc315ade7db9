import { LoadSettingError } from '@ai-sdk/provider';

/**
 * Loads a `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @param settingName - The setting name.
 * @param description - The description of the setting.
 * @returns The setting value.
 */
export function loadSetting({
  settingValue,
  environmentVariableName,
  settingName,
  description,
}: {
  settingValue: string | undefined;
  environmentVariableName: string;
  settingName: string;
  description: string;
}): string {
  if (typeof settingValue === 'string') {
    return settingValue;
  }

  if (settingValue != null) {
    throw new LoadSettingError({
      message: `${description} setting must be a string.`,
    });
  }

  if (typeof process === 'undefined') {
    throw new LoadSettingError({
      message:
        `${description} setting is missing. ` +
        `Pass it using the '${settingName}' parameter. ` +
        `Environment variables is not supported in this environment.`,
    });
  }

  settingValue = process.env[environmentVariableName];

  if (settingValue == null) {
    throw new LoadSettingError({
      message:
        `${description} setting is missing. ` +
        `Pass it using the '${settingName}' parameter ` +
        `or the ${environmentVariableName} environment variable.`,
    });
  }

  if (typeof settingValue !== 'string') {
    throw new LoadSettingError({
      message:
        `${description} setting must be a string. ` +
        `The value of the ${environmentVariableName} environment variable is not a string.`,
    });
  }

  return settingValue;
}
