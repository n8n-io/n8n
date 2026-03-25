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
var nodeClassDescription_getters_exports = {};
__export(nodeClassDescription_getters_exports, {
  getCredOptions: () => getCredOptions,
  getDefaultVersion: () => getDefaultVersion,
  getDefaults: () => getDefaults,
  getDescription: () => getDescription,
  getDisplayName: () => getDisplayName,
  getIcon: () => getIcon,
  getInputs: () => getInputs,
  getName: () => getName,
  getOutputs: () => getOutputs,
  getSubtitle: () => getSubtitle,
  getVersion: () => getVersion
});
module.exports = __toCommonJS(nodeClassDescription_getters_exports);
var import_identifiers = require("../identifiers");
var import_restorers = require("../restorers");
var import_nodeParameter = require("./nodeParameter.getters");
function getCredOptions(nodeParam) {
  const found = nodeParam.properties.find(
    import_identifiers.id.nodeClassDescription.isCredentials
  );
  if (!found)
    return null;
  return {
    ast: found,
    value: (0, import_restorers.restoreClassDescriptionOptions)(found.value.elements)
  };
}
function getInputs(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeClassDescription.isInputs);
  if (!found)
    return null;
  return {
    ast: found,
    // @ts-ignore @TODO
    value: (0, import_restorers.restoreArray)(found.value.elements)
  };
}
function getOutputs(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeClassDescription.isOutputs);
  if (!found)
    return null;
  return {
    ast: found,
    // @ts-ignore @TODO
    value: (0, import_restorers.restoreArray)(found.value.elements)
  };
}
function getSubtitle(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeClassDescription.isSubtitle);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
const getName = import_nodeParameter.getName;
const getDisplayName = import_nodeParameter.getDisplayName;
const getDescription = import_nodeParameter.getDescription;
function getVersion(nodeParam) {
  return (0, import_nodeParameter.getNumberProperty)(import_identifiers.id.nodeClassDescription.isVersion, nodeParam);
}
function getDefaultVersion(nodeParam) {
  return (0, import_nodeParameter.getNumberProperty)(import_identifiers.id.nodeClassDescription.isDefaultVersion, nodeParam);
}
function getIcon(nodeParam) {
  return (0, import_nodeParameter.getStringProperty)(import_identifiers.id.nodeClassDescription.isIcon, nodeParam);
}
function getDefaults(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeClassDescription.isDefaults);
  if (!found)
    return null;
  return {
    ast: found,
    value: (0, import_restorers.restoreObject)(found.value)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCredOptions,
  getDefaultVersion,
  getDefaults,
  getDescription,
  getDisplayName,
  getIcon,
  getInputs,
  getName,
  getOutputs,
  getSubtitle,
  getVersion
});
