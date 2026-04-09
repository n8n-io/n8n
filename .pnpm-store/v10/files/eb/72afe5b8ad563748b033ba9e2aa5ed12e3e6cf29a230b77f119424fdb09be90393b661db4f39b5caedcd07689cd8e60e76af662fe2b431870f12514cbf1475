const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/utils/comments.js
var require_comments = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	/**
	* @param {Comment} node
	* @returns {boolean}
	*/
	const isJSDocComment = (node) => node.type === "Block" && node.value.charAt(0) === "*" && node.value.charAt(1) !== "*";
	/**
	* @param {Comment} node
	* @returns {boolean}
	*/
	const isBlockComment = (node) => node.type === "Block" && (node.value.charAt(0) !== "*" || node.value.charAt(1) === "*");
	module.exports = {
		isJSDocComment,
		isBlockComment
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_comments();
  }
});