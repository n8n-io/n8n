const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_ts_types$1 = require('./ts-types.js');
const require_ts_ast$1 = require('./ts-ast.js');

//#region lib/utils/ts-utils/index.js
var require_ts_utils = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { isTypeNode, extractRuntimeProps, isTSTypeLiteral, isTSTypeLiteralOrTSFunctionType, extractRuntimeEmits, flattenTypeNodes, isTSInterfaceBody, extractRuntimeSlots } = require_ts_ast$1.default;
	const { getComponentPropsFromTypeDefineTypes, getComponentEmitsFromTypeDefineTypes, getComponentSlotsFromTypeDefineTypes } = require_ts_types$1.default;
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TSESTreeTypeNode
	*/
	/**
	* @typedef {import('../index').ComponentTypeProp} ComponentTypeProp
	* @typedef {import('../index').ComponentInferTypeProp} ComponentInferTypeProp
	* @typedef {import('../index').ComponentUnknownProp} ComponentUnknownProp
	* @typedef {import('../index').ComponentTypeEmit} ComponentTypeEmit
	* @typedef {import('../index').ComponentInferTypeEmit} ComponentInferTypeEmit
	* @typedef {import('../index').ComponentUnknownEmit} ComponentUnknownEmit
	* @typedef {import('../index').ComponentTypeSlot} ComponentTypeSlot
	* @typedef {import('../index').ComponentInferTypeSlot} ComponentInferTypeSlot
	* @typedef {import('../index').ComponentUnknownSlot} ComponentUnknownSlot
	*/
	module.exports = {
		isTypeNode,
		getComponentPropsFromTypeDefine,
		getComponentEmitsFromTypeDefine,
		getComponentSlotsFromTypeDefine
	};
	/**
	* Get all props by looking at all component's properties
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TypeNode} propsNode Type with props definition
	* @return {(ComponentTypeProp|ComponentInferTypeProp|ComponentUnknownProp)[]} Array of component props
	*/
	function getComponentPropsFromTypeDefine(context, propsNode) {
		/** @type {(ComponentTypeProp|ComponentInferTypeProp|ComponentUnknownProp)[]} */
		const result = [];
		for (const defNode of flattenTypeNodes(context, propsNode)) if (isTSInterfaceBody(defNode) || isTSTypeLiteral(defNode)) result.push(...extractRuntimeProps(context, defNode));
		else result.push(...getComponentPropsFromTypeDefineTypes(context, defNode));
		return result;
	}
	/**
	* Get all emits by looking at all component's properties
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TypeNode} emitsNode Type with emits definition
	* @return {(ComponentTypeEmit|ComponentInferTypeEmit|ComponentUnknownEmit)[]} Array of component emits
	*/
	function getComponentEmitsFromTypeDefine(context, emitsNode) {
		/** @type {(ComponentTypeEmit|ComponentInferTypeEmit|ComponentUnknownEmit)[]} */
		const result = [];
		for (const defNode of flattenTypeNodes(context, emitsNode)) if (isTSInterfaceBody(defNode) || isTSTypeLiteralOrTSFunctionType(defNode)) result.push(...extractRuntimeEmits(defNode));
		else result.push(...getComponentEmitsFromTypeDefineTypes(context, defNode));
		return result;
	}
	/**
	* Get all slots by looking at all component's properties
	* @param {RuleContext} context The ESLint rule context object.
	* @param {TypeNode} slotsNode Type with slots definition
	* @return {(ComponentTypeSlot|ComponentInferTypeSlot|ComponentUnknownSlot)[]} Array of component slots
	*/
	function getComponentSlotsFromTypeDefine(context, slotsNode) {
		/** @type {(ComponentTypeSlot|ComponentInferTypeSlot|ComponentUnknownSlot)[]} */
		const result = [];
		for (const defNode of flattenTypeNodes(context, slotsNode)) if (isTSInterfaceBody(defNode) || isTSTypeLiteral(defNode)) result.push(...extractRuntimeSlots(defNode));
		else result.push(...getComponentSlotsFromTypeDefineTypes(context, defNode));
		return result;
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_ts_utils();
  }
});