import { booleanSelector, SelectorType } from "@smithy/util-config-provider";
export const NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME = "AWS_S3_DISABLE_MULTIREGION_ACCESS_POINTS";
export const NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME = "s3_disable_multiregion_access_points";
export const NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => booleanSelector(env, NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME, SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME, SelectorType.CONFIG),
    default: false,
};
