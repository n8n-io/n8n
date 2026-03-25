"use strict";

var ensureString = require("type/string/ensure")
  , esniff       = require("./");

module.exports = function (objName) {
	var length;
	objName = ensureString(objName);
	length = objName.length;
	if (!length) throw new TypeError(objName + " is not valid object name");
	return function (code) {
		var data = [];
		code = ensureString(code);
		esniff(code, function (emitter) {
			emitter.on("trigger:" + objName[0], function (accessor) {
				if (accessor.previousToken === ".") return;
				if (!accessor.skipCodePart(objName)) return;
				accessor.skipWhitespace();
				if (!accessor.skipCodePart(".")) return;
				accessor.skipWhitespace();
				var identifierMeta = accessor.skipIdentifier();
				if (identifierMeta) data.push(identifierMeta);
			});
		});
		return data;
	};
};
