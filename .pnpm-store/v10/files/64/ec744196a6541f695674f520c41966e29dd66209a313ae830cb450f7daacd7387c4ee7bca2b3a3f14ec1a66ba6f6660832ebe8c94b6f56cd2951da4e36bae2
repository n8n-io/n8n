'use strict';

var stsRegionDefaultResolver = require('./regionConfig/stsRegionDefaultResolver');
var configResolver = require('@smithy/config-resolver');

const getAwsRegionExtensionConfiguration = (runtimeConfig) => {
    return {
        setRegion(region) {
            runtimeConfig.region = region;
        },
        region() {
            return runtimeConfig.region;
        },
    };
};
const resolveAwsRegionExtensionConfiguration = (awsRegionExtensionConfiguration) => {
    return {
        region: awsRegionExtensionConfiguration.region(),
    };
};

exports.NODE_REGION_CONFIG_FILE_OPTIONS = configResolver.NODE_REGION_CONFIG_FILE_OPTIONS;
exports.NODE_REGION_CONFIG_OPTIONS = configResolver.NODE_REGION_CONFIG_OPTIONS;
exports.REGION_ENV_NAME = configResolver.REGION_ENV_NAME;
exports.REGION_INI_NAME = configResolver.REGION_INI_NAME;
exports.resolveRegionConfig = configResolver.resolveRegionConfig;
exports.getAwsRegionExtensionConfiguration = getAwsRegionExtensionConfiguration;
exports.resolveAwsRegionExtensionConfiguration = resolveAwsRegionExtensionConfiguration;
Object.prototype.hasOwnProperty.call(stsRegionDefaultResolver, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: stsRegionDefaultResolver['__proto__']
    });

Object.keys(stsRegionDefaultResolver).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = stsRegionDefaultResolver[k];
});
