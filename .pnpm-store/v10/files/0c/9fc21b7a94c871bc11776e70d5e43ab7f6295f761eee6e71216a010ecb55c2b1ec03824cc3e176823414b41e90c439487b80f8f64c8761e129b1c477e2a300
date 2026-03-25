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
var node_class_description_credentials_name_unsuffixed_exports = {};
__export(node_class_description_credentials_name_unsuffixed_exports, {
  default: () => node_class_description_credentials_name_unsuffixed_default,
  getUnsuffixedCredOptionName: () => getUnsuffixedCredOptionName
});
module.exports = __toCommonJS(node_class_description_credentials_name_unsuffixed_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_class_description_credentials_name_unsuffixed_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`name` under `credentials` in node class description must be suffixed with `-Api`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      fixSuffix: "Suffix with `-Api` [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        if (hasCredExemptedFromApiSuffix(context.getFilename()))
          return;
        const credOptions = import_getters.getters.nodeClassDescription.getCredOptions(node);
        if (!credOptions)
          return;
        const unsuffixed = getUnsuffixedCredOptionName(credOptions);
        if (unsuffixed) {
          const suffixed = import_utils.utils.addApiSuffix(unsuffixed.value);
          const fixed = import_utils.utils.keyValue("name", suffixed);
          context.report({
            messageId: "fixSuffix",
            node: unsuffixed.ast,
            fix: (fixer) => fixer.replaceText(unsuffixed.ast, fixed)
          });
        }
      }
    };
  }
});
function getUnsuffixedCredOptionName(credOptions) {
  for (const credOption of credOptions.ast.value.elements) {
    for (const property of credOption.properties) {
      if (import_identifiers.id.nodeClassDescription.isName(property) && typeof property.value.value === "string" && !property.value.value.endsWith("Api")) {
        return {
          ast: property,
          value: property.value.value
        };
      }
    }
  }
  return null;
}
const NODES_EXEMPTED_FROM_HAVING_CREDS_WITH_API_SUFFIX = [
  "Amqp",
  "Aws",
  "CrateDb",
  "EmailReadImap",
  "EmailSend",
  "FileMaker",
  "Ftp",
  "Git",
  "Google",
  "GraphQL",
  "HttpRequest",
  "Hubspot",
  "Kafka",
  "MQTT",
  "Microsoft",
  "MongoDb",
  "MySql",
  "NocoDB",
  "Pipedrive",
  "Postgres",
  "QuestDb",
  "RabbitMQ",
  "Redis",
  "S3",
  "Snowflake",
  "Ssh",
  "TimescaleDb",
  "Wait",
  "Webhook"
];
function hasCredExemptedFromApiSuffix(filename) {
  return NODES_EXEMPTED_FROM_HAVING_CREDS_WITH_API_SUFFIX.some(
    (cred) => filename.includes(cred)
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getUnsuffixedCredOptionName
});
