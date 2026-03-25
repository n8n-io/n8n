'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseMedia;

var _Container = require('./nodes/Container');

var _Container2 = _interopRequireDefault(_Container);

var _parsers = require('./parsers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parses a media query list into an array of nodes. A typical node signature:
 *  {string} node.type -- one of: 'media-query', 'media-type', 'keyword',
 *    'media-feature-expression', 'media-feature', 'colon', 'value'
 *  {string} node.value -- the contents of a particular element, trimmed
 *    e.g.: `screen`, `max-width`, `1024px`
 *  {string} node.after -- whitespaces that follow the element
 *  {string} node.before -- whitespaces that precede the element
 *  {string} node.sourceIndex -- the index of the element in a source media
 *    query list, 0-based
 *  {object} node.parent -- a link to the parent node (a container)
 *
 * Some nodes (media queries, media feature expressions) contain other nodes.
 * They additionally have:
 *  {array} node.nodes -- an array of nodes of the type described here
 *  {funciton} node.each -- traverses direct children of the node, calling
 *    a callback for each one
 *  {funciton} node.walk -- traverses ALL descendants of the node, calling
 *    a callback for each one
 */

function parseMedia(value) {
  return new _Container2.default({
    nodes: (0, _parsers.parseMediaList)(value),
    type: 'media-query-list',
    value: value.trim()
  });
}