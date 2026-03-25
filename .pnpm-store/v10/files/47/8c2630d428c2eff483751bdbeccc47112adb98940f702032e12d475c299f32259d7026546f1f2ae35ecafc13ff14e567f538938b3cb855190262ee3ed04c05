export const CONFIG_FORMATS = [
    'name',
    'plugin-colon-prefix-name',
    'prefix-name',
];
export function configNameToDisplay(configName, configFormat, pluginPrefix) {
    switch (configFormat) {
        case 'name': {
            return configName;
        }
        case 'plugin-colon-prefix-name': {
            return `plugin:${pluginPrefix}/${configName}`; // Exact format used in an ESLint config file under "extends".
        }
        case 'prefix-name': {
            return `${pluginPrefix}/${configName}`;
        }
        /* istanbul ignore next -- this shouldn't happen */
        default: {
            throw new Error(`Unhandled config format: ${String(configFormat)}`);
        }
    }
}
