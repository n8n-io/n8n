"use strict";

var pattern = /-(\w|$)/g;

var callback = function callback(dashChar, char) {
	return char.toUpperCase();
};

var camelCaseCSS = function camelCaseCSS(property) {
	property = property.toLowerCase();

	// NOTE :: IE8's "styleFloat" is intentionally not supported
	if (property === "float") {
		return "cssFloat";
	}
	// Microsoft vendor-prefixes are uniquely cased
	else if (property.charCodeAt(0) === 45&& property.charCodeAt(1) === 109&& property.charCodeAt(2) === 115&& property.charCodeAt(3) === 45) {
			return property.substr(1).replace(pattern, callback);
		} else {
			return property.replace(pattern, callback);
		}
};

module.exports = camelCaseCSS;
