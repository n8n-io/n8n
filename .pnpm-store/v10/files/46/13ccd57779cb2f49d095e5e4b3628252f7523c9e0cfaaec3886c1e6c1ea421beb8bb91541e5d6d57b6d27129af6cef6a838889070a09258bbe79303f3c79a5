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
var node_param_default_wrong_for_options_exports = {};
__export(node_param_default_wrong_for_options_exports, {
  default: () => node_param_default_wrong_for_options_default
});
module.exports = __toCommonJS(node_param_default_wrong_for_options_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_default_wrong_for_options_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`default` for an options-type node parameter must be one of the options.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      chooseOption: "Set one of {{ eligibleOptions }} as default [autofixable]",
      setEmptyString: "Set an empty string as default [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isOptionsType(node))
          return;
        const _default = import_getters.getters.nodeParam.getDefault(node);
        if (!_default)
          return;
        const loadOptionsMethod = import_getters.getters.nodeParam.getLoadOptionsMethod(node);
        const loadOptions = import_getters.getters.nodeParam.getLoadOptions(node);
        if (loadOptionsMethod || loadOptions)
          return;
        if (_default.isUnparseable) {
          return;
        }
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options && _default.value !== "") {
          context.report({
            messageId: "setEmptyString",
            node: _default.ast,
            fix: (fixer) => fixer.replaceText(_default.ast, "default: ''")
          });
        }
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier || // e.g. `value: myVar`
        options.hasPropertyPointingToMemberExpression) {
          return;
        }
        const eligibleOptions = options.value.map(
          (option) => option.value
        );
        if (!eligibleOptions.includes(_default.value)) {
          const zerothOption = eligibleOptions[0];
          const fixed = `default: ${typeof zerothOption === "string" ? `'${zerothOption}'` : zerothOption}`;
          context.report({
            messageId: "chooseOption",
            data: {
              eligibleOptions: eligibleOptions.join(" or ")
            },
            node: _default.ast,
            fix: (fixer) => fixer.replaceText(_default.ast, fixed)
          });
        }
      }
    };
  }
});
