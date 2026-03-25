'use strict';
/**
 * @module cheerio
 * @borrows load.load as load
 * @borrows static.html as html
 * @borrows static.text as text
 * @borrows static.xml as xml
 */
exports = module.exports = require('./lib/cheerio');

var staticMethods = require('./lib/static');
var loadMethod = require('./lib/load');

/**
 * An identifier describing the version of Cheerio which has been executed.
 *
 * @type {string}
 */
exports.version = require('./package.json').version;

exports.load = loadMethod.load;
exports.html = staticMethods.html;
exports.text = staticMethods.text;
exports.xml = staticMethods.xml;

/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name.
 *
 * @deprecated
 * @example
 *   var $ = cheerio.load('<div><p></p></div>');
 *   $.contains($('div').get(0), $('p').get(0)); // true
 *   $.contains($('p').get(0), $('div').get(0)); // false
 *
 * @function
 * @returns {boolean}
 */
exports.contains = staticMethods.contains;

/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name.
 *
 * @deprecated
 * @example
 *   var $ = cheerio.load('');
 *   $.merge([1, 2], [3, 4]); // [1, 2, 3, 4]
 *
 * @function
 */
exports.merge = staticMethods.merge;

/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name as it is defined on the
 * "loaded" Cheerio factory function.
 *
 * @deprecated See {@link static/parseHTML}.
 * @example
 *   var $ = cheerio.load('');
 *   $.parseHTML('<b>markup</b>');
 *
 * @function
 */
exports.parseHTML = staticMethods.parseHTML;

/**
 * Users seeking to access the top-level element of a parsed document should
 * instead use the `root` static method of a "loaded" Cheerio function.
 *
 * @deprecated
 * @example
 *   var $ = cheerio.load('');
 *   $.root();
 *
 * @function
 */
exports.root = staticMethods.root;
