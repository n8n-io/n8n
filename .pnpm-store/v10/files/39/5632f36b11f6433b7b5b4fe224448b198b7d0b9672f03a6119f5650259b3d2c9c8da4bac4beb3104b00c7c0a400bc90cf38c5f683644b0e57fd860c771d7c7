'use strict';

var fromTokenFile = require('./fromTokenFile');
var fromWebToken = require('./fromWebToken');



Object.keys(fromTokenFile).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return fromTokenFile[k]; }
	});
});
Object.keys(fromWebToken).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return fromWebToken[k]; }
	});
});
