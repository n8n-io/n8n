'use strict';

var os = require('os');
var process = require('process');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');

const crtAvailability = {
    isCrtAvailable: false,
};

const isCrtAvailable = () => {
    if (crtAvailability.isCrtAvailable) {
        return ["md/crt-avail"];
    }
    return null;
};

const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => {
    return async (config) => {
        const sections = [
            ["aws-sdk-js", clientVersion],
            ["ua", "2.1"],
            [`os/${os.platform()}`, os.release()],
            ["lang/js"],
            ["md/nodejs", `${process.versions.node}`],
        ];
        const crtAvailable = isCrtAvailable();
        if (crtAvailable) {
            sections.push(crtAvailable);
        }
        if (serviceId) {
            sections.push([`api/${serviceId}`, clientVersion]);
        }
        if (process.env.AWS_EXECUTION_ENV) {
            sections.push([`exec-env/${process.env.AWS_EXECUTION_ENV}`]);
        }
        const appId = await config?.userAgentAppId?.();
        const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
        return resolvedUserAgent;
    };
};
const defaultUserAgent = createDefaultUserAgentProvider;

const UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
const UA_APP_ID_INI_NAME = "sdk_ua_app_id";
const UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
const NODE_APP_ID_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[UA_APP_ID_ENV_NAME],
    configFileSelector: (profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED],
    default: middlewareUserAgent.DEFAULT_UA_APP_ID,
};

exports.NODE_APP_ID_CONFIG_OPTIONS = NODE_APP_ID_CONFIG_OPTIONS;
exports.UA_APP_ID_ENV_NAME = UA_APP_ID_ENV_NAME;
exports.UA_APP_ID_INI_NAME = UA_APP_ID_INI_NAME;
exports.createDefaultUserAgentProvider = createDefaultUserAgentProvider;
exports.crtAvailability = crtAvailability;
exports.defaultUserAgent = defaultUserAgent;
