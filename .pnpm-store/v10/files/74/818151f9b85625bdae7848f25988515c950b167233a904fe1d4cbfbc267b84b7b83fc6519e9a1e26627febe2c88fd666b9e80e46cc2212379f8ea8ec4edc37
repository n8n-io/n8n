'use strict';

var getInferredName;
try {
	// eslint-disable-next-line no-new-func
	getInferredName = Function('s', 'return { [s]() {} }[s].name;');
} catch (e) {}

var inferred = function () {};
module.exports = getInferredName && inferred.name === 'inferred' ? getInferredName : null;
