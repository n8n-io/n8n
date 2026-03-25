import { DEFAULT_ACCOUNT_ID_ENDPOINT_MODE, validateAccountIdEndpointMode, } from "./AccountIdEndpointModeConstants";
const err = "Invalid AccountIdEndpointMode value";
const _throw = (message) => {
    throw new Error(message);
};
export const ENV_ACCOUNT_ID_ENDPOINT_MODE = "AWS_ACCOUNT_ID_ENDPOINT_MODE";
export const CONFIG_ACCOUNT_ID_ENDPOINT_MODE = "account_id_endpoint_mode";
export const NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS = {
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
