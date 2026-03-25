
/**
 * Escape the given shell `arg`.
 *
 * @param {String} arg
 * @return {String}
 * @api public
 */

exports.escape = function escape (arg) {
  return '"' + String(arg).trim().replace(/"/g, '\\"') + '"';
};

exports.unescape = function escape (arg) {
    return String(arg).trim().replace(/"/g, "");
};

exports.argsToArray = function (args) {
  var arr = [];

  for (var i = 0; i <= arguments.length; i++) {
    if ('undefined' != typeof arguments[i])
      arr.push(arguments[i]);
  }

  return arr;
};

exports.isUtil = function (v) {
	var ty = 'object';
	switch (Object.prototype.toString.call(v)) {
	case '[object String]':
		ty = 'String';
		break;
	case '[object Array]':
		ty = 'Array';
		break;
	case '[object Boolean]':
		ty = 'Boolean';
		break;
	}
	return ty;
}