'use strict';

var utilMiddleware = require('@smithy/util-middleware');

const DEFAULT_ACCOUNT_ID_ENDPOINT_MODE = "preferred";
const ACCOUNT_ID_ENDPOINT_MODE_VALUES = ["disabled", "preferred", "required"];
function validateAccountIdEndpointMode(value) {
    return ACCOUNT_ID_ENDPOINT_MODE_VALUES.includes(value);
}

const resolveAccountIdEndpointModeConfig = (input) => {
    const { accountIdEndpointMode } = input;
    const accountIdEndpointModeProvider = utilMiddleware.normalizeProvider(accountIdEndpointMode ?? DEFAULT_ACCOUNT_ID_ENDPOINT_MODE);
    return Object.assign(input, {
        accountIdEndpointMode: async () => {
            const accIdMode = await accountIdEndpointModeProvider();
            if (!validateAccountIdEndpointMode(accIdMode)) {
                throw new Error(`Invalid value for accountIdEndpointMode: ${accIdMode}. Valid values are: "required", "preferred", "disabled".`);
            }
            return accIdMode;
        },
    });
};

const err = "Invalid AccountIdEndpointMode value";
const _throw = (message) => {
    throw new Error(message);
};
const ENV_ACCOUNT_ID_ENDPOINT_MODE = "AWS_ACCOUNT_ID_ENDPOINT_MODE";
const CONFIG_ACCOUNT_ID_ENDPOINT_MODE = "account_id_endpoint_mode";
const NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
        const value = env[ENV_ACCOUNT_ID_ENDPOINT_MODE];
        if (value && !validateAccountIdEndpointMode(value)) {
            _throw(err);
        }
        return value;
    },
    configFileSelector: (profile) => {
        const value = profile[CONFIG_ACCOUNT_ID_ENDPOINT_MODE];
        if (value && !validateAccountIdEndpointMode(value)) {
            _throw(err);
        }
        return value;
    },
    default: DEFAULT_ACCOUNT_ID_ENDPOINT_MODE,
};

exports.ACCOUNT_ID_ENDPOINT_MODE_VALUES = ACCOUNT_ID_ENDPOINT_MODE_VALUES;
exports.CONFIG_ACCOUNT_ID_ENDPOINT_MODE = CONFIG_ACCOUNT_ID_ENDPOINT_MODE;
exports.DEFAULT_ACCOUNT_ID_ENDPOINT_MODE = DEFAULT_ACCOUNT_ID_ENDPOINT_MODE;
exports.ENV_ACCOUNT_ID_ENDPOINT_MODE = ENV_ACCOUNT_ID_ENDPOINT_MODE;
exports.NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS = NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS;
exports.resolveAccountIdEndpointModeConfig = resolveAccountIdEndpointModeConfig;
exports.validateAccountIdEndpointMode = validateAccountIdEndpointMode;
