"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var constants_exports = {};
__export(constants_exports, {
  COMMUNITY_PACKAGE_JSON: () => COMMUNITY_PACKAGE_JSON,
  CREDS_EXEMPTED_FROM_API_SUFFIX: () => CREDS_EXEMPTED_FROM_API_SUFFIX,
  CRED_SENSITIVE_CLASS_FIELDS: () => CRED_SENSITIVE_CLASS_FIELDS,
  DOCUMENTATION: () => DOCUMENTATION,
  DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER: () => DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER,
  DYNAMIC_OPTIONS_NODE_PARAMETER: () => DYNAMIC_OPTIONS_NODE_PARAMETER,
  EMAIL_PLACEHOLDER: () => EMAIL_PLACEHOLDER,
  FALSE_POSITIVE_CRED_SENSITIVE_CLASS_FIELDS: () => FALSE_POSITIVE_CRED_SENSITIVE_CLASS_FIELDS,
  FALSE_POSITIVE_NODE_SENSITIVE_PARAM_NAMES: () => FALSE_POSITIVE_NODE_SENSITIVE_PARAM_NAMES,
  IGNORE_SSL_ISSUES_NODE_PARAMETER: () => IGNORE_SSL_ISSUES_NODE_PARAMETER,
  LIMIT_NODE_PARAMETER: () => LIMIT_NODE_PARAMETER,
  LINE_BREAK_HTML_TAG_REGEX: () => LINE_BREAK_HTML_TAG_REGEX,
  MIN_ITEMS_TO_ALPHABETIZE: () => MIN_ITEMS_TO_ALPHABETIZE,
  MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT: () => MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT,
  MISCASED_ID_REGEX: () => MISCASED_ID_REGEX,
  MISCASED_JSON_REGEX: () => MISCASED_JSON_REGEX,
  MISCASED_URL_REGEX: () => MISCASED_URL_REGEX,
  N8N_NODE_ERROR_TYPES: () => N8N_NODE_ERROR_TYPES,
  NODE_CLASS_DESCRIPTION_SUBTITLE: () => NODE_CLASS_DESCRIPTION_SUBTITLE,
  NODE_SENSITIVE_PARAM_NAMES: () => NODE_SENSITIVE_PARAM_NAMES,
  RESOURCE_DESCRIPTION_SUFFIX: () => RESOURCE_DESCRIPTION_SUFFIX,
  RETURN_ALL_NODE_PARAMETER: () => RETURN_ALL_NODE_PARAMETER,
  SIMPLIFY_NODE_PARAMETER: () => SIMPLIFY_NODE_PARAMETER,
  SVG_ICON_SOURCES: () => SVG_ICON_SOURCES,
  TOP_LEVEL_FIXED_COLLECTION: () => TOP_LEVEL_FIXED_COLLECTION,
  UPDATE_FIELDS_NODE_PARAM_DISPLAY_NAME: () => UPDATE_FIELDS_NODE_PARAM_DISPLAY_NAME,
  UPSERT_NODE_PARAMETER: () => UPSERT_NODE_PARAMETER,
  VALID_HTML_TAG_REGEX: () => VALID_HTML_TAG_REGEX,
  VERSION_REGEX: () => VERSION_REGEX,
  WEAK_DESCRIPTIONS: () => WEAK_DESCRIPTIONS
});
module.exports = __toCommonJS(constants_exports);
const MIN_ITEMS_TO_ALPHABETIZE = 5;
const MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT = "five";
const WEAK_DESCRIPTIONS = [
  "Resource to consume",
  "Resource to operate on",
  "Operation to perform",
  "Action to perform",
  "Method of authentication"
];
const SVG_ICON_SOURCES = [
  "https://vecta.io/symbols",
  "https://github.com/gilbarbara/logos"
];
const RESOURCE_DESCRIPTION_SUFFIX = "Description.ts";
const EXPRESSIONS_DOCS_URL = "https://docs.n8n.io/code/expressions/";
const DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER = {
  DISPLAY_NAME_SUFFIX: "Names or IDs",
  DESCRIPTION: `Choose from the list, or specify IDs using an <a href="${EXPRESSIONS_DOCS_URL}">expression</a>`
};
const DYNAMIC_OPTIONS_NODE_PARAMETER = {
  DISPLAY_NAME_SUFFIX: "Name or ID",
  DESCRIPTION: `Choose from the list, or specify an ID using an <a href="${EXPRESSIONS_DOCS_URL}">expression</a>`
};
const NODE_CLASS_DESCRIPTION_SUBTITLE = '={{ $parameter["operation"] + ": " + $parameter["resource"] }}';
const LIMIT_NODE_PARAMETER = {
  DEFAULT_VALUE: 50,
  DESCRIPTION: "Max number of results to return"
};
const UPSERT_NODE_PARAMETER = {
  DESCRIPTION: "Create a new record, or update the current one if it already exists (upsert)"
};
const UPDATE_FIELDS_NODE_PARAM_DISPLAY_NAME = "Update Fields";
const SIMPLIFY_NODE_PARAMETER = {
  DISPLAY_NAME: "Simplify",
  DESCRIPTION: "Whether to return a simplified version of the response instead of the raw data"
};
const RETURN_ALL_NODE_PARAMETER = {
  DISPLAY_NAME: "Return All",
  DESCRIPTION: "Whether to return all results or only up to a given limit"
};
const IGNORE_SSL_ISSUES_NODE_PARAMETER = {
  DISPLAY_NAME: "Ignore SSL Issues",
  DESCRIPTION: "Whether to connect even if SSL certificate validation is not possible"
};
const TOP_LEVEL_FIXED_COLLECTION = {
  STANDARD_DISPLAY_NAME: {
    CREATE: "Additional Fields",
    UPDATE: "Update Fields",
    GETALL: "Options"
  }
};
const EMAIL_PLACEHOLDER = "name@email.com";
const CRED_SENSITIVE_CLASS_FIELDS = [
  "secret",
  "password",
  "token",
  "key"
];
const FALSE_POSITIVE_CRED_SENSITIVE_CLASS_FIELDS = [
  "accessKeyId",
  "passwordless",
  "/token"
  // when part of OAuth token endpoint
  // plus `-Url` pattern
];
const NODE_SENSITIVE_PARAM_NAMES = [
  "secret",
  "password",
  "token",
  "apiKey"
  // `"key"` leads to too many false positives
];
const FALSE_POSITIVE_NODE_SENSITIVE_PARAM_NAMES = [
  "maxTokens",
  "password_needs_reset"
];
const MISCASED_ID_REGEX = /\b(i|I)d(s?)\b/;
const MISCASED_URL_REGEX = /\b(u|U)rl(s?)\b/;
const MISCASED_JSON_REGEX = /\b(j|J)son\b/;
const VALID_HTML_TAG_REGEX = /<\/?(h\d|p|b|em|i|a|ol|ul|li|code|br)>/;
const LINE_BREAK_HTML_TAG_REGEX = /<\/? ?br ?\/?>/;
const VERSION_REGEX = /^v\d+\.\d+$/;
const COMMUNITY_PACKAGE_JSON = {
  NAME: "n8n-nodes-<...>",
  DESCRIPTION: "",
  OFFICIAL_TAG: "n8n-community-node-package",
  LICENSE: "MIT",
  AUTHOR_NAME: "",
  AUTHOR_EMAIL: "",
  REPOSITORY_URL: "https://github.com/<...>/n8n-nodes-<...>.git",
  CREDENTIALS: [
    "dist/credentials/ExampleCredentials.credentials.js",
    "dist/credentials/HttpBinApi.credentials.js"
  ],
  NODES: [
    "dist/nodes/ExampleNode/ExampleNode.node.js",
    "dist/nodes/HttpBin/HttpBin.node.js"
  ],
  SCRIPTS: `{
    "dev": "npm run watch",
    "build": "tsc && gulp",
    "lint": "tslint -p tsconfig.json -c tslint.json && node_modules/eslint/bin/eslint.js ./nodes",
    "lintfix": "tslint --fix -p tsconfig.json -c tslint.json && node_modules/eslint/bin/eslint.js --fix ./nodes",
    "watch": "tsc --watch",
    "test": "jest"
  }`,
  DEV_DEPENDENCIES: `{
    "@types/express": "^4.17.6",
    "@types/request-promise-native": "~1.0.15",
    "@typescript-eslint/parser": "^5.29.0",
    "eslint-plugin-n8n-nodes-base": "^1.0.43",
    "gulp": "^4.0.2",
    "jest": "^26.4.2",
    "n8n-workflow": "~0.104.0",
    "ts-jest": "^26.3.0",
    "tslint": "^6.1.2",
    "typescript": "~4.3.5"
  }`
};
const DOCUMENTATION = {
  APPLICABLE_BY_EXTENSION_TO_NAME: "Applicable by extension to `name` in options-type or multi-options-type node parameter.",
  APPLICABLE_BY_EXTENSION_TO_DESCRIPTION_IN_OPTION: "Applicable by extension to `description` in option in options-type and multi-options-type node parameter."
};
const N8N_NODE_ERROR_TYPES = [
  "ApplicationError",
  "NodeOperationError",
  "NodeApiError",
  "TriggerCloseError"
];
const CREDS_EXEMPTED_FROM_API_SUFFIX = [
  "Amqp",
  "Aws",
  "CrateDb",
  "Crypto",
  "FileMaker",
  "Ftp",
  "GitPassword",
  "GmailOAuth2Api",
  "GoogleAnalyticsOAuth2Api",
  "HttpBasicAuth",
  "HttpDigestAuth",
  "HttpHeaderAuth",
  "HttpQueryAuth",
  "HubspotAppToken",
  "Imap",
  "Kafka",
  "MicrosoftSql",
  "MongoDb",
  "Mqtt",
  "MySql",
  "NocoDb",
  "Postgres",
  "QuestDb",
  "RabbitMQ",
  "Redis",
  "S3",
  "Sftp",
  "Smtp",
  "Snowflake",
  "SshPassword",
  "SshPrivateKey",
  "TimescaleDb"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COMMUNITY_PACKAGE_JSON,
  CREDS_EXEMPTED_FROM_API_SUFFIX,
  CRED_SENSITIVE_CLASS_FIELDS,
  DOCUMENTATION,
  DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER,
  DYNAMIC_OPTIONS_NODE_PARAMETER,
  EMAIL_PLACEHOLDER,
  FALSE_POSITIVE_CRED_SENSITIVE_CLASS_FIELDS,
  FALSE_POSITIVE_NODE_SENSITIVE_PARAM_NAMES,
  IGNORE_SSL_ISSUES_NODE_PARAMETER,
  LIMIT_NODE_PARAMETER,
  LINE_BREAK_HTML_TAG_REGEX,
  MIN_ITEMS_TO_ALPHABETIZE,
  MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT,
  MISCASED_ID_REGEX,
  MISCASED_JSON_REGEX,
  MISCASED_URL_REGEX,
  N8N_NODE_ERROR_TYPES,
  NODE_CLASS_DESCRIPTION_SUBTITLE,
  NODE_SENSITIVE_PARAM_NAMES,
  RESOURCE_DESCRIPTION_SUFFIX,
  RETURN_ALL_NODE_PARAMETER,
  SIMPLIFY_NODE_PARAMETER,
  SVG_ICON_SOURCES,
  TOP_LEVEL_FIXED_COLLECTION,
  UPDATE_FIELDS_NODE_PARAM_DISPLAY_NAME,
  UPSERT_NODE_PARAMETER,
  VALID_HTML_TAG_REGEX,
  VERSION_REGEX,
  WEAK_DESCRIPTIONS
});
