'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-template-key.js
/**
* @author Toru Nagashima
* @copyright 2016 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_no_template_key = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow `key` attribute on `<template>`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-template-key.html"
			},
			fixable: null,
			schema: [],
			messages: { disallow: "'<template>' cannot be keyed. Place the key on real elements instead." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='template']"(node) {
				const keyNode = utils.getAttribute(node, "key") || utils.getDirective(node, "bind", "key");
				if (keyNode) {
					if (utils.hasDirective(node, "for")) return;
					context.report({
						node: keyNode,
						loc: keyNode.loc,
						messageId: "disallow"
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_template_key();
  }
});