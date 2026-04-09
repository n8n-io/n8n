'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-v-for-template-key.js
/**
* @author Yosuke Ota
*/
var require_no_v_for_template_key = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow `key` attribute on `<template v-for>`",
				categories: ["vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-v-for-template-key.html"
			},
			fixable: null,
			deprecated: true,
			schema: [],
			messages: { disallow: "'<template v-for>' cannot be keyed. Place the key on real elements instead." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='template'] > VStartTag > VAttribute[directive=true][key.name.name='for']"(node) {
				const element = node.parent.parent;
				const keyNode = utils.getAttribute(element, "key") || utils.getDirective(element, "bind", "key");
				if (keyNode) context.report({
					node: keyNode,
					loc: keyNode.loc,
					messageId: "disallow"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_v_for_template_key();
  }
});