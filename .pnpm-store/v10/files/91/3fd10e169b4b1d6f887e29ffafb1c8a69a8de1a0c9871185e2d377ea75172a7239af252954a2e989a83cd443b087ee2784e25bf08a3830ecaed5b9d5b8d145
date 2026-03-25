"use strict";

var ensureString = require("type/string/ensure")
  , isValue      = require("type/value/is")
  , esniff       = require("./");

module.exports = function (name/*, options*/) {
	var options = Object(arguments[1])
	  , asProperty = options.asProperty
	  , asPlain = isValue(options.asPlain) ? options.asPlain : true;
	var length, names;
	name = ensureString(name);
	names = name.split(".").map(function (prop) {
		prop = prop.trim();
		if (!prop) throw new TypeError(name + " is not valid function name");
		return prop;
	});
	length = names.length;
	return function (code) {
		code = ensureString(code);
		return esniff(code, function (emitter) {
			emitter.on("trigger:" + names[0][0], function (accessor) {
				if (accessor.previousToken === ".") {
					if (!asProperty) return;
				} else if (!asPlain) {
					return;
				}
				for (var i = 0, propertyName; (propertyName = names[i]); ++i) {
					if (!accessor.skipCodePart(propertyName)) return;
					accessor.skipWhitespace();
					if (i < length - 1) {
						if (!accessor.skipCodePart(".")) return;
						accessor.skipWhitespace();
					}
				}
				accessor.collectScope();
			});
		});
	};
};
