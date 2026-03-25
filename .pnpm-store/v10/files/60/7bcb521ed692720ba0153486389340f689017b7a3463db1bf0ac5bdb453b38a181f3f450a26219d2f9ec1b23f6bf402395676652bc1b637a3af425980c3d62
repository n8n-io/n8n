"use strict";

var mixin         = require("../../object/mixin")
  , validFunction = require("../valid-function");

module.exports = function () {
	validFunction(this);

	var args = [];
	for (var i = 0; i < this.length; ++i) args.push("arg" + (i + 1));
	// eslint-disable-next-line no-new-func
	var fn = new Function(
		"fn",
		"return function " +
			(this.name || "") +
			"(" +
			args.join(", ") +
			") { return fn.apply(this, arguments); };"
	)(this);
	try { mixin(fn, this); }
	catch (ignore) {}
	return fn;
};
