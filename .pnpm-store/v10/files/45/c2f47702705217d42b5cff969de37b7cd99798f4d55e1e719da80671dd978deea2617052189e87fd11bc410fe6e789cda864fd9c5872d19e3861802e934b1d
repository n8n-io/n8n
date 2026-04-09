'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-arrow-functions-in-watch.js
/**
* @author Sosuke Suzuki
*/
var require_no_arrow_functions_in_watch = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using arrow functions to define watcher",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-arrow-functions-in-watch.html"
			},
			fixable: null,
			schema: [],
			messages: { noArrowFunctionsInWatch: "You should not use an arrow function to define a watcher." }
		},
		create(context) {
			return utils.executeOnVue(context, (obj) => {
				const watchNode = utils.findProperty(obj, "watch");
				if (watchNode == null) return;
				const watchValue = watchNode.value;
				if (watchValue.type !== "ObjectExpression") return;
				for (const property of watchValue.properties) {
					if (property.type !== "Property") continue;
					for (const handler of utils.iterateWatchHandlerValues(property)) if (handler.type === "ArrowFunctionExpression") context.report({
						node: handler,
						messageId: "noArrowFunctionsInWatch"
					});
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_arrow_functions_in_watch();
  }
});