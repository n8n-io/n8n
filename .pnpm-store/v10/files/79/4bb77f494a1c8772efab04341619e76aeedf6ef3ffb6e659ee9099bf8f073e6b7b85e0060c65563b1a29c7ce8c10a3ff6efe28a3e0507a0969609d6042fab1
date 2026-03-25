import { booleanSelector, SelectorType } from "@smithy/util-config-provider";
export const NODE_USE_ARN_REGION_ENV_NAME = "AWS_S3_USE_ARN_REGION";
export const NODE_USE_ARN_REGION_INI_NAME = "s3_use_arn_region";
export const NODE_USE_ARN_REGION_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => booleanSelector(env, NODE_USE_ARN_REGION_ENV_NAME, SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, NODE_USE_ARN_REGION_INI_NAME, SelectorType.CONFIG),
    default: false,
};
