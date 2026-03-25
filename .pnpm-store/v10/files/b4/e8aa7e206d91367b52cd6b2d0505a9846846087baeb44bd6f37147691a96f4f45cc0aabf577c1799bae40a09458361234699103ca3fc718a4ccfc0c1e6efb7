"use strict";

var from         = require("es5-ext/array/from")
  , ensureString = require("type/string/ensure")
  , primitiveSet = require("es5-ext/object/primitive-set")
  , esniff       = require("./");

var allowedSeparators = primitiveSet.apply(null, from(".+-*/,&|;"));

module.exports = function (code, sep/*, limit*/) {
	var expressions, fromIndex, limit = arguments[2] || Infinity;
	code = ensureString(code);
	sep = ensureString(sep);
	if (!allowedSeparators[sep]) throw new Error(sep + " is not supported separator");
	expressions = [];
	fromIndex = 0;
	esniff(code, function (emitter) {
		emitter.on("trigger:" + sep, function (accessor) {
			if (accessor.scopeDepth !== 0) return;
			var index = accessor.index;
			if (expressions.push(code.slice(fromIndex, index)) === limit) accessor.stop();
			fromIndex = index + 1;
		});
	});
	if (expressions.length < limit) expressions.push(code.slice(fromIndex));
	return expressions;
};
