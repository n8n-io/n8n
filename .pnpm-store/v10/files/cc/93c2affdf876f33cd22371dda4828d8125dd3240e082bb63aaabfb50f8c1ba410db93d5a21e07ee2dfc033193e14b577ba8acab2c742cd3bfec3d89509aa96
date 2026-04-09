'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/html-end-tags.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_html_end_tags = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce end tag style",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/html-end-tags.html"
			},
			fixable: "code",
			schema: [],
			messages: { missingEndTag: "'<{{name}}>' should have end tag." }
		},
		create(context) {
			let hasInvalidEOF = false;
			return utils.defineTemplateBodyVisitor(context, { VElement(node) {
				if (hasInvalidEOF) return;
				const name = node.name;
				const isVoid = utils.isHtmlVoidElementName(name);
				const isSelfClosing = node.startTag.selfClosing;
				const hasEndTag = node.endTag != null;
				if (!isVoid && !hasEndTag && !isSelfClosing) context.report({
					node: node.startTag,
					loc: node.startTag.loc,
					messageId: "missingEndTag",
					data: { name },
					fix: (fixer) => fixer.insertTextAfter(node, `</${name}>`)
				});
			} }, { Program(node) {
				hasInvalidEOF = utils.hasInvalidEOF(node);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_end_tags();
  }
});