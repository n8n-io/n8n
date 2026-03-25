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
var nodeExecuteBlock_getters_exports = {};
__export(nodeExecuteBlock_getters_exports, {
  collectConsequents: () => collectConsequents,
  getExecuteContent: () => getExecuteContent,
  getInputItemsIndexName: () => getInputItemsIndexName,
  getMarkedNodeFromConsequent: () => getMarkedNodeFromConsequent,
  getOperationConsequents: () => getOperationConsequents,
  getPairedItemValue: () => getPairedItemValue
});
module.exports = __toCommonJS(nodeExecuteBlock_getters_exports);
var import_utils = require("@typescript-eslint/utils");
var import_identifiers = require("../identifiers");
function getOperationConsequents(node, { filter }) {
  const executeMethod = getExecuteContent(node);
  if (!executeMethod)
    return;
  const returnDataArrayName = getReturnDataArrayName(executeMethod);
  if (!returnDataArrayName)
    return;
  const forLoop = executeMethod.body.find(import_identifiers.id.nodeExecuteBlock.isForLoop);
  if (!forLoop)
    return;
  const inputItemsIndexName = getInputItemsIndexName(forLoop);
  if (!inputItemsIndexName)
    return;
  const tryCatch = forLoop.body.body.find(import_identifiers.id.nodeExecuteBlock.isTryCatch);
  if (!tryCatch)
    return;
  const resourcesRoot = tryCatch.block.body.find(
    import_identifiers.id.nodeExecuteBlock.isResourceChecksRoot
  );
  if (!resourcesRoot)
    return;
  const operationConsequents = collectConsequents(resourcesRoot).reduce((acc, resourceConsequent) => {
    if (resourceConsequent.body.length !== 1)
      return acc;
    const [operationsRoot] = resourceConsequent.body;
    const opConsequentsPerResource = filter === "all" ? collectConsequents(operationsRoot) : collectConsequents(operationsRoot).filter(
      (consequent) => filter === "plural" ? isGetAll(consequent) : !isGetAll(consequent)
    );
    return [...acc, ...opConsequentsPerResource];
  }, []);
  return {
    operationConsequents,
    inputItemsIndexName,
    returnDataArrayName
  };
}
function getExecuteContent({ key, value }) {
  if (key.type === import_utils.AST_NODE_TYPES.Identifier && key.name === "execute" && value.type === import_utils.AST_NODE_TYPES.FunctionExpression && value.body.type === import_utils.AST_NODE_TYPES.BlockStatement) {
    return value.body;
  }
}
function getReturnDataArrayName(executeMethod) {
  for (const node of executeMethod.body) {
    if (node.type === import_utils.AST_NODE_TYPES.VariableDeclaration && node.declarations.length === 1 && node.declarations[0].id.type === import_utils.AST_NODE_TYPES.Identifier && node.declarations[0].init !== null && node.declarations[0].init.type === import_utils.AST_NODE_TYPES.ArrayExpression && node.declarations[0].init.elements.length === 0 && node.declarations[0].id.typeAnnotation !== void 0 && node.declarations[0].id.typeAnnotation.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSArrayType && node.declarations[0].id.typeAnnotation.typeAnnotation.elementType.type === import_utils.AST_NODE_TYPES.TSTypeReference && node.declarations[0].id.typeAnnotation.typeAnnotation.elementType.typeName.type === import_utils.AST_NODE_TYPES.Identifier && ["IDataObject", "INodeExecutionData"].includes(
      node.declarations[0].id.typeAnnotation.typeAnnotation.elementType.typeName.name
    )) {
      return node.declarations[0].id.name;
    }
  }
  return null;
}
function getInputItemsIndexName(forLoop) {
  if (forLoop.init !== null && forLoop.init.type === import_utils.AST_NODE_TYPES.VariableDeclaration && forLoop.init.declarations.length > 0 && forLoop.init.declarations[0].type === import_utils.AST_NODE_TYPES.VariableDeclarator && forLoop.init.declarations[0].id.type === import_utils.AST_NODE_TYPES.Identifier) {
    return forLoop.init.declarations[0].id.name;
  }
  return null;
}
function collectConsequents(node, collection = []) {
  if (node.type === import_utils.AST_NODE_TYPES.IfStatement && node.consequent.type === import_utils.AST_NODE_TYPES.BlockStatement) {
    collection.push(node.consequent);
  }
  if (node.type === import_utils.AST_NODE_TYPES.IfStatement && node.alternate !== null && node.alternate.type === import_utils.AST_NODE_TYPES.IfStatement) {
    collectConsequents(node.alternate, collection);
  }
  return collection;
}
function getPairedItemValue(properties) {
  const found = properties.find(
    (property) => property.type === import_utils.AST_NODE_TYPES.Property && property.value.type === import_utils.AST_NODE_TYPES.ObjectExpression
  );
  return found ? found.value : null;
}
function getMarkedNodeFromConsequent(consequent) {
  if (consequent.parent?.type === import_utils.AST_NODE_TYPES.IfStatement && consequent.parent?.test.type === import_utils.AST_NODE_TYPES.BinaryExpression && consequent.parent?.test.operator === "===" && consequent.parent?.test.left.type === import_utils.AST_NODE_TYPES.Identifier && consequent.parent?.test.left.name === "operation") {
    return consequent.parent?.test.right;
  }
}
function isGetAll(consequent) {
  return consequent.parent !== void 0 && consequent.parent.type === import_utils.AST_NODE_TYPES.IfStatement && consequent.parent.test.type === import_utils.AST_NODE_TYPES.BinaryExpression && consequent.parent.test.operator === "===" && consequent.parent.test.left.type === import_utils.AST_NODE_TYPES.Identifier && consequent.parent.test.left.name === "operation" && consequent.parent.test.right.type === import_utils.AST_NODE_TYPES.Literal && consequent.parent.test.right.value === "getAll";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  collectConsequents,
  getExecuteContent,
  getInputItemsIndexName,
  getMarkedNodeFromConsequent,
  getOperationConsequents,
  getPairedItemValue
});
