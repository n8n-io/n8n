'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInstance = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _immutable = require('immutable');

var _defaultsDeep = require('lodash/defaultsDeep');

var _defaultsDeep2 = _interopRequireDefault(_defaultsDeep);

var _merge = require('lodash/merge');

var _merge2 = _interopRequireDefault(_merge);

var _MJMLElementsCollection = require('../MJMLElementsCollection');

var _MJMLElementsCollection2 = _interopRequireDefault(_MJMLElementsCollection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var parseInstance = exports.parseInstance = function parseInstance(instance, attributes) {
  var parseNode = function parseNode(node) {
    node['attributes'] = node['attributes'] || {};

    var Component = _MJMLElementsCollection2.default[node.tagName];
    var nodeClasses = node['attributes']['mj-class'];

    var classAttributes = !nodeClasses ? {} : _merge2.default.apply(undefined, [{}].concat(_toConsumableArray(nodeClasses.split(' ').map(function (nodeClass) {
      return { attributes: attributes.cssClasses[nodeClass] };
    }))));

    return !Component ? {} : _extends({}, (0, _defaultsDeep2.default)(node, classAttributes, { attributes: attributes.defaultAttributes[node.tagName] }, { attributes: attributes.defaultAttributes["mj-all"] } || {}, Component.defaultMJMLDefinition), {
      // do same to children
      children: (node.children || []).map(parseNode)
    });
  };

  return (0, _immutable.fromJS)(parseNode(instance));
};