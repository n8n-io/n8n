"use strict";

var isValue       = require("../../object/is-value")
  , esniff        = require("esniff")
  , validFunction = require("../valid-function");

var classRe = /^\s*class[\s{/}]/;

module.exports = function () {
	var str = String(validFunction(this));
	if (classRe.test(str)) throw new Error("Class methods are not supported");

	var argsStartIndex
	  , argsEndIndex
	  , bodyStartIndex
	  , bodyEndReverseIndex = -1
	  , shouldTrimArgs = false;

	esniff(str, function (emitter, accessor) {
		emitter.once("trigger:(", function () { argsStartIndex = accessor.index + 1; });
		emitter.once("trigger:=", function () {
			if (isValue(argsStartIndex)) return;
			argsStartIndex = 0;
			argsEndIndex = accessor.index;
			shouldTrimArgs = true;
			if (!accessor.skipCodePart("=>")) {
				throw new Error("Unexpected function string: " + str);
			}
			accessor.skipWhitespace();
			if (!accessor.skipCodePart("{")) bodyEndReverseIndex = Infinity;
			bodyStartIndex = accessor.index;
		});
		emitter.on("trigger:)", function () {
			if (accessor.scopeDepth) return;
			argsEndIndex = accessor.index;
			accessor.skipCodePart(")");
			accessor.skipWhitespace();
			if (accessor.skipCodePart("=>")) {
				accessor.skipWhitespace();
				if (!accessor.skipCodePart("{")) bodyEndReverseIndex = Infinity;
			} else if (!accessor.skipCodePart("{")) {
				throw new Error("Unexpected function string: " + str);
			}
			bodyStartIndex = accessor.index;
			accessor.stop();
		});
	});

	var argsString = str.slice(argsStartIndex, argsEndIndex);
	if (shouldTrimArgs) argsString = argsString.trim();
	return { args: argsString, body: str.slice(bodyStartIndex, bodyEndReverseIndex) };
};
