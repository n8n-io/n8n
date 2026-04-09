'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-empty-component-block.js
/**
* @author tyankatsu <https://github.com/tyankatsu0105>
* See LICENSE file in root directory for full license.
*/
var require_no_empty_component_block = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { isVElement } = require_index.default;
	/**
	* check whether has attribute `src`
	* @param {VElement} componentBlock
	*/
	function hasAttributeSrc(componentBlock) {
		const hasAttribute = componentBlock.startTag.attributes.length > 0;
		const hasSrc = componentBlock.startTag.attributes.some((attribute) => !attribute.directive && attribute.key.name === "src" && attribute.value && attribute.value.value !== "");
		return hasAttribute && hasSrc;
	}
	/**
	* check whether value under the component block is only whitespaces or break lines
	* @param {VElement} componentBlock
	*/
	function isValueOnlyWhiteSpacesOrLineBreaks(componentBlock) {
		return componentBlock.children.length === 1 && componentBlock.children[0].type === "VText" && !componentBlock.children[0].value.trim();
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow the `<template>` `<script>` `<style>` block to be empty",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-empty-component-block.html"
			},
			fixable: "code",
			schema: [],
			messages: { unexpected: "`<{{ blockName }}>` is empty. Empty block is not allowed." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			if (!sourceCode.parserServices.getDocumentFragment) return {};
			const documentFragment = sourceCode.parserServices.getDocumentFragment();
			if (!documentFragment) return {};
			const componentBlocks = documentFragment.children.filter(isVElement);
			return { Program() {
				for (const componentBlock of componentBlocks) {
					if (componentBlock.name !== "template" && componentBlock.name !== "script" && componentBlock.name !== "style") continue;
					if (hasAttributeSrc(componentBlock)) continue;
					if (isValueOnlyWhiteSpacesOrLineBreaks(componentBlock) || componentBlock.children.length === 0) context.report({
						node: componentBlock,
						loc: componentBlock.loc,
						messageId: "unexpected",
						data: { blockName: componentBlock.name },
						fix(fixer) {
							return fixer.remove(componentBlock);
						}
					});
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_empty_component_block();
  }
});