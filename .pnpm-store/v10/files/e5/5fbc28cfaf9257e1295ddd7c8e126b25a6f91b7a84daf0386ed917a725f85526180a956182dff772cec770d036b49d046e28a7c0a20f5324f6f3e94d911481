'use strict';

var configResolver = require('@smithy/config-resolver');
var stsRegionDefaultResolver = require('./regionConfig/stsRegionDefaultResolver');

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

Object.defineProperty(exports, "NODE_REGION_CONFIG_FILE_OPTIONS", {
    enumerable: true,
    get: function () { return configResolver.NODE_REGION_CONFIG_FILE_OPTIONS; }
});
Object.defineProperty(exports, "NODE_REGION_CONFIG_OPTIONS", {
    enumerable: true,
    get: function () { return configResolver.NODE_REGION_CONFIG_OPTIONS; }
});
Object.defineProperty(exports, "REGION_ENV_NAME", {
    enumerable: true,
    get: function () { return configResolver.REGION_ENV_NAME; }
});
Object.defineProperty(exports, "REGION_INI_NAME", {
    enumerable: true,
    get: function () { return configResolver.REGION_INI_NAME; }
});
Object.defineProperty(exports, "resolveRegionConfig", {
    enumerable: true,
    get: function () { return configResolver.resolveRegionConfig; }
});
exports.getAwsRegionExtensionConfiguration = getAwsRegionExtensionConfiguration;
exports.resolveAwsRegionExtensionConfiguration = resolveAwsRegionExtensionConfiguration;
Object.keys(stsRegionDefaultResolver).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
        enumerable: true,
        get: function () { return stsRegionDefaultResolver[k]; }
    });
});
