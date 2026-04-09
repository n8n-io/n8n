'use strict';

const state = {
    warningEmitted: false,
};
const emitWarningIfUnsupportedVersion = (version) => {
    if (version && !state.warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 20) {
        state.warningEmitted = true;
        process.emitWarning(`NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js ${version} in January 2026.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/c895JFp`);
    }
};

function setCredentialFeature(credentials, feature, value) {
    if (!credentials.$source) {
        credentials.$source = {};
    }
    credentials.$source[feature] = value;
    return credentials;
}

function setFeature(context, feature, value) {
    if (!context.__aws_sdk_context) {
        context.__aws_sdk_context = {
            features: {},
        };
    }
    else if (!context.__aws_sdk_context.features) {
        context.__aws_sdk_context.features = {};
    }
    context.__aws_sdk_context.features[feature] = value;
}

function setTokenFeature(token, feature, value) {
    if (!token.$source) {
        token.$source = {};
    }
    token.$source[feature] = value;
    return token;
}

exports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
exports.setCredentialFeature = setCredentialFeature;
exports.setFeature = setFeature;
exports.setTokenFeature = setTokenFeature;
exports.state = state;
