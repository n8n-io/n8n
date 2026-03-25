import { DEFAULT_UA_APP_ID } from "@aws-sdk/middleware-user-agent";
export const UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
export const UA_APP_ID_INI_NAME = "sdk_ua_app_id";
const UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
export const NODE_APP_ID_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[UA_APP_ID_ENV_NAME],
    configFileSelector: (profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED],
    default: DEFAULT_UA_APP_ID,
};
