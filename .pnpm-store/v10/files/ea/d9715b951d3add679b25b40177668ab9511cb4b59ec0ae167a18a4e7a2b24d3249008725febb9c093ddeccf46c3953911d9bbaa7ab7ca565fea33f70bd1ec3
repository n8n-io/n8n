'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerMJHeadElement = exports.endingTags = undefined;

var _lodash = require('lodash');

var endingTags = exports.endingTags = [];
var registerMJHeadElement = exports.registerMJHeadElement = function registerMJHeadElement() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  var name = void 0,
      endingTag = void 0,
      handler = void 0; // eslint-disable-line

  if (args.length > 1) {
    name = args[0];
    handler = args[1];
    endingTag = args[2];
  } else {
    var _args$ = args[0];
    name = _args$.name;
    handler = _args$.handler;
    endingTag = _args$.endingTag;
  }

  endingTag && !(0, _lodash.includes)(endingTags, name) && endingTags.push(name);

  MJMLHeadElementsCollection[name] = handler;
};

var MJMLHeadElementsCollection = {};

exports.default = MJMLHeadElementsCollection;