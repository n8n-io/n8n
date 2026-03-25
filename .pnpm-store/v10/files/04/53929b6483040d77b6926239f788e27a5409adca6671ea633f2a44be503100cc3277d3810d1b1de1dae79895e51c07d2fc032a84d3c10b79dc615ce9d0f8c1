'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerMJElement = exports.postRenders = exports.endingTags = undefined;

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var endingTags = exports.endingTags = [];
var postRenders = exports.postRenders = [];

var registerMJElement = exports.registerMJElement = function registerMJElement(Component) {
  var endingTag = Component.endingTag,
      postRender = Component.postRender,
      tagName = Component.tagName;


  if (!tagName) {
    return (0, _warning2.default)(false, 'Component has no tagName');
  }

  endingTag && !(0, _lodash.includes)(endingTags, tagName) && endingTags.push(tagName);
  postRender && postRenders.push(postRender);

  MJMLElementsCollection[tagName] = Component;
};

var MJMLElementsCollection = {};

exports.default = MJMLElementsCollection;