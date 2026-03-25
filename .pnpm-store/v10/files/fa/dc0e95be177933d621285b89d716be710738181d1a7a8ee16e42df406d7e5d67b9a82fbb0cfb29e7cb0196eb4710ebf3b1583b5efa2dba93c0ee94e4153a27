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
var nodeParameter_getters_exports = {};
__export(nodeParameter_getters_exports, {
  getCollectionOptions: () => getCollectionOptions,
  getDefault: () => getDefault,
  getDescription: () => getDescription,
  getDisplayName: () => getDisplayName,
  getFixedCollectionValues: () => getFixedCollectionValues,
  getGetAllOption: () => getGetAllOption,
  getHint: () => getHint,
  getLoadOptions: () => getLoadOptions,
  getLoadOptionsMethod: () => getLoadOptionsMethod,
  getMaxValue: () => getMaxValue,
  getMinValue: () => getMinValue,
  getName: () => getName,
  getNoDataExpression: () => getNoDataExpression,
  getNumberProperty: () => getNumberProperty,
  getOptions: () => getOptions,
  getPlaceholder: () => getPlaceholder,
  getRequired: () => getRequired,
  getStringProperty: () => getStringProperty,
  getType: () => getType,
  getTypeOptions: () => getTypeOptions
});
module.exports = __toCommonJS(nodeParameter_getters_exports);
var import_utils = require("@typescript-eslint/utils");
var import_identifiers = require("../identifiers");
var import_restorers = require("../restorers");
var import_common = require("../identifiers/common.identifiers");
function getStringProperty(identifier, nodeParam) {
  const found = nodeParam.properties.find(identifier);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
function getDisplayName(nodeParam) {
  return getStringProperty(import_identifiers.id.nodeParam.isDisplayName, nodeParam);
}
function getPlaceholder(nodeParam) {
  return getStringProperty(import_identifiers.id.nodeParam.isPlaceholder, nodeParam);
}
function getName(nodeParam) {
  return getStringProperty(import_identifiers.id.nodeParam.isName, nodeParam);
}
function getHint(nodeParam) {
  return getStringProperty(import_identifiers.id.nodeParam.isHint, nodeParam);
}
function getType(nodeParam) {
  return getStringProperty(import_identifiers.id.nodeParam.isType, nodeParam);
}
function getBooleanProperty(identifier, nodeParam) {
  const found = nodeParam.properties.find(identifier);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
function getNoDataExpression(nodeParam) {
  return getBooleanProperty(import_identifiers.id.nodeParam.isNoDataExpression, nodeParam);
}
function getRequired(nodeParam) {
  return getBooleanProperty(import_identifiers.id.nodeParam.isRequired, nodeParam);
}
function getNumberProperty(identifier, nodeParam) {
  const found = nodeParam.properties.find(identifier);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
function getGetAllOption(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeParam.isGetAllOptionProperty);
  if (!found)
    return null;
  return {
    ast: found,
    value: ""
    // TODO
  };
}
function getTypeOptions(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeParam.isTypeOptions);
  if (!found)
    return null;
  return {
    ast: found,
    value: (0, import_restorers.restoreObject)(found.value)
  };
}
function getOptions(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeParam.isOptions);
  if (!found)
    return null;
  if (found.value.type !== import_utils.AST_NODE_TYPES.ArrayExpression || !found.value.elements) {
    return {
      ast: found,
      value: [{ name: "", value: "", description: "", action: "" }],
      // unused placeholder
      hasPropertyPointingToIdentifier: true
    };
  }
  const elements = found.value.elements.filter(
    (i) => i?.type === "ObjectExpression"
  );
  if (!elements.length) {
    return {
      ast: found,
      value: [{ name: "", value: "", description: "", action: "" }],
      // unused placeholder
      hasPropertyPointingToIdentifier: true
    };
  }
  if (hasMemberExpression(elements)) {
    return {
      ast: found,
      value: (0, import_restorers.restoreNodeParamOptions)(elements),
      hasPropertyPointingToMemberExpression: true
    };
  }
  return {
    ast: found,
    value: (0, import_restorers.restoreNodeParamOptions)(elements)
  };
}
function getCollectionOptions(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeParam.isOptions);
  if (!found)
    return null;
  if (!found.value.elements) {
    return {
      ast: found,
      value: [{ displayName: "" }],
      // unused placeholder
      hasPropertyPointingToIdentifier: true
    };
  }
  const elements = found.value.elements.filter(
    (i) => i?.type === "ObjectExpression"
  );
  if (!elements.length)
    return null;
  if (hasMemberExpression(elements)) {
    return {
      ast: found,
      value: (0, import_restorers.restoreNodeParamCollectionOptions)(elements),
      hasPropertyPointingToMemberExpression: true
    };
  }
  return {
    ast: found,
    value: (0, import_restorers.restoreNodeParamCollectionOptions)(elements),
    hasPropertyPointingToIdentifier: false
  };
}
function hasMemberExpression(elements) {
  return elements.find(
    (element) => element.properties.find(import_common.isMemberExpression)
  );
}
function getFixedCollectionValues(nodeParam) {
  const found = nodeParam.properties.find(import_identifiers.id.nodeParam.isFixedCollectionValues);
  if (!found)
    return null;
  const elements = found.value.elements.filter(
    (i) => i.type === "ObjectExpression"
  );
  if (!elements.length)
    return null;
  return {
    ast: found,
    value: (0, import_restorers.restoreFixedCollectionValues)(elements)
  };
}
function getTypeOptionsValue(nodeParam, identifier) {
  const typeOptions = getTypeOptions(nodeParam);
  if (!typeOptions)
    return null;
  const { properties } = typeOptions.ast.value;
  const found = properties.find(identifier);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
const getMinValue = (nodeParam) => getTypeOptionsValue(nodeParam, import_identifiers.id.nodeParam.isMinValue);
const getMaxValue = (nodeParam) => getTypeOptionsValue(nodeParam, import_identifiers.id.nodeParam.isMaxValue);
function getLoadOptionsMethod(nodeParam) {
  const typeOptions = getTypeOptions(nodeParam);
  if (!typeOptions)
    return null;
  const { properties } = typeOptions.ast.value;
  const found = properties.find(import_identifiers.id.nodeParam.isLoadOptionsMethod);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
function getLoadOptions(nodeParam) {
  const typeOptions = getTypeOptions(nodeParam);
  if (!typeOptions)
    return null;
  const { properties } = typeOptions.ast.value;
  const found = properties.find(import_identifiers.id.nodeParam.isLoadOptions);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value
    // Object value, not string like loadOptionsMethod
  };
}
function getDescription(nodeParam) {
  for (const property of nodeParam.properties) {
    if (import_identifiers.id.nodeParam.isDescription(property)) {
      return {
        ast: property,
        value: property.value.value
      };
    }
    if (import_identifiers.id.nodeParam.isTemplateDescription(property)) {
      if (property.value.quasis.length > 1) {
        const consolidated = property.value.quasis.map((templateElement2) => templateElement2.value.cooked).join();
        return {
          ast: property,
          value: consolidated,
          hasUnneededBackticks: false
        };
      }
      const [templateElement] = property.value.quasis;
      const { value: content } = templateElement;
      const escapedRawContent = content.raw.replace(/\\/g, "");
      return {
        ast: property,
        value: content.raw,
        hasUnneededBackticks: escapedRawContent === content.cooked
      };
    }
  }
  return null;
}
function getDefault(nodeParam) {
  const isUnparseable = (type) => [import_utils.AST_NODE_TYPES.CallExpression, import_utils.AST_NODE_TYPES.Identifier].includes(type);
  for (const property of nodeParam.properties) {
    if (property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "default" && isUnparseable(property.value.type)) {
      return {
        ast: property,
        isUnparseable: true
        // `default: myVar.join(',')` or `default: myVar`
      };
    }
    if (import_identifiers.id.nodeParam.isTemplateLiteralDefault(property)) {
      const consolidated = property.value.quasis.map((templateElement) => templateElement.value.cooked).join();
      return {
        ast: property,
        value: consolidated
      };
    }
    if (import_identifiers.id.nodeParam.isUnaryExpression(property)) {
      return {
        ast: property,
        value: parseInt(
          property.value.operator + property.value.argument.raw
          // e.g. -1
        )
      };
    }
    if (import_identifiers.id.nodeParam.isPrimitiveDefault(property)) {
      return {
        ast: property,
        value: property.value.value
      };
    }
    if (import_identifiers.id.nodeParam.isObjectDefault(property)) {
      return {
        ast: property,
        value: (0, import_restorers.restoreObject)(property.value)
      };
    }
    if (import_identifiers.id.nodeParam.isArrayDefault(property)) {
      return {
        ast: property,
        value: property.value.elements
      };
    }
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCollectionOptions,
  getDefault,
  getDescription,
  getDisplayName,
  getFixedCollectionValues,
  getGetAllOption,
  getHint,
  getLoadOptions,
  getLoadOptionsMethod,
  getMaxValue,
  getMinValue,
  getName,
  getNoDataExpression,
  getNumberProperty,
  getOptions,
  getPlaceholder,
  getRequired,
  getStringProperty,
  getType,
  getTypeOptions
});
