'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('call-bind');
var callBound = require('call-bind/callBound');

var $ownKeys = GetIntrinsic('%Reflect.ownKeys%', true);
var $pushApply = callBind.apply(GetIntrinsic('%Array.prototype.push%'));
var $SymbolValueOf = callBound('Symbol.prototype.valueOf', true);
var $gOPN = GetIntrinsic('%Object.getOwnPropertyNames%', true);
var $gOPS = $SymbolValueOf ? GetIntrinsic('%Object.getOwnPropertySymbols%') : null;

var keys = require('object-keys');

module.exports = $ownKeys || function OwnPropertyKeys(source) {
	var ownKeys = ($gOPN || keys)(source);
	if ($gOPS) {
		$pushApply(ownKeys, $gOPS(source));
	}
	return ownKeys;
};
