"use strict";

var isStringLiteral = require("./is-string-literal");

module.exports = function (arg) {
	if (isStringLiteral(arg)) return arg;
	throw new TypeError(arg + " does not represent string literal");
};
