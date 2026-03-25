import { booleanSelector, SelectorType } from "@smithy/util-config-provider";
export const S3_EXPRESS_BUCKET_TYPE = "Directory";
export const S3_EXPRESS_BACKEND = "S3Express";
export const S3_EXPRESS_AUTH_SCHEME = "sigv4-s3express";
export const SESSION_TOKEN_QUERY_PARAM = "X-Amz-S3session-Token";
export const SESSION_TOKEN_HEADER = SESSION_TOKEN_QUERY_PARAM.toLowerCase();
export const NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_ENV_NAME = "AWS_S3_DISABLE_EXPRESS_SESSION_AUTH";
export const NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_INI_NAME = "s3_disable_express_session_auth";
export const NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS = {
    environmentVariableSelector: (env) => booleanSelector(env, NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_ENV_NAME, SelectorType.ENV),
    configFileSelector: (profile) => booleanSelector(profile, NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_INI_NAME, SelectorType.CONFIG),
    default: false,
};
