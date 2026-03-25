'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Node = require('./Node');

var _Node2 = _interopRequireDefault(_Node);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Container(opts) {
  var _this = this;

  this.constructor(opts);

  this.nodes = opts.nodes;

  if (this.after === undefined) {
    this.after = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].after : '';
  }

  if (this.before === undefined) {
    this.before = this.nodes.length > 0 ? this.nodes[0].before : '';
  }

  if (this.sourceIndex === undefined) {
    this.sourceIndex = this.before.length;
  }

  this.nodes.forEach(function (node) {
    node.parent = _this; // eslint-disable-line no-param-reassign
  });
} /**
   * A node that contains other nodes and support traversing over them
   */

Container.prototype = Object.create(_Node2.default.prototype);
Container.constructor = _Node2.default;

/**
 * Iterate over descendant nodes of the node
 *
 * @param {RegExp|string} filter - Optional. Only nodes with node.type that
 *    satisfies the filter will be traversed over
 * @param {function} cb - callback to call on each node. Takes theese params:
 *    node - the node being processed, i - it's index, nodes - the array
 *    of all nodes
 *    If false is returned, the iteration breaks
 *
 * @return (boolean) false, if the iteration was broken
 */
Container.prototype.walk = function walk(filter, cb) {
  var hasFilter = typeof filter === 'string' || filter instanceof RegExp;
  var callback = hasFilter ? cb : filter;
  var filterReg = typeof filter === 'string' ? new RegExp(filter) : filter;

  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    var filtered = hasFilter ? filterReg.test(node.type) : true;
    if (filtered && callback && callback(node, i, this.nodes) === false) {
      return false;
    }
    if (node.nodes && node.walk(filter, cb) === false) {
      return false;
    }
  }
  return true;
};

/**
 * Iterate over immediate children of the node
 *
 * @param {function} cb - callback to call on each node. Takes theese params:
 *    node - the node being processed, i - it's index, nodes - the array
 *    of all nodes
 *    If false is returned, the iteration breaks
 *
 * @return (boolean) false, if the iteration was broken
 */
Container.prototype.each = function each() {
  var cb = arguments.length <= 0 || arguments[0] === undefined ? function () {} : arguments[0];

  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    if (cb(node, i, this.nodes) === false) {
      return false;
    }
  }
  return true;
};

exports.default = Container;