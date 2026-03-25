"use strict";

var repeat = require("es5-ext/string/#/repeat")
  , esniff = require("./");

module.exports = exports = function (code/*, options*/) {
	var options = Object(arguments[1]);

	var comments = esniff(code, function (emitter, accessor) {
		accessor.shouldCollectComments = true;
	});

	if (!comments.length) return code;
	var i = 0, result = [];
	comments.forEach(function (commentMeta) {
		result.push(code.slice(i, commentMeta.point));
		if (options.preserveLocation) {
			result.push(repeat.call(" ", commentMeta.endPoint - commentMeta.point));
		}
		i = commentMeta.endPoint;
	});
	result.push(code.slice(i));
	return result.join("");
};
