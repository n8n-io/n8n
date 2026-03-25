'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _some = require('lodash/some');

var _some2 = _interopRequireDefault(_some);

var _startsWith = require('lodash/startsWith');

var _startsWith2 = _interopRequireDefault(_startsWith);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _MJMLElementsCollection = require('../MJMLElementsCollection');

var _MJMLElementsCollection2 = _interopRequireDefault(_MJMLElementsCollection);

var _mjmlValidator = require('mjml-validator');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cwd = process.cwd();

var isRelativePath = function isRelativePath(name) {
  return (0, _some2.default)(['./', '.', '../'], function (matcher) {
    return (0, _startsWith2.default)(name, matcher);
  });
};

var checkIfConfigFileExist = function checkIfConfigFileExist() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  try {
    _fs2.default.statSync((options.cwd || cwd) + '/.mjmlconfig');
    return true;
  } catch (e) {
    (0, _warning2.default)(!(0, _isEmpty2.default)(_MJMLElementsCollection2.default), 'No .mjmlconfig found in path ' + cwd + ', consider to add one');
    return false;
  }
};

var parseConfigFile = function parseConfigFile() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!checkIfConfigFileExist(options)) {
    return false;
  }

  try {
    return JSON.parse(_fs2.default.readFileSync((options.cwd || cwd) + '/.mjmlconfig').toString());
  } catch (e) {
    (0, _warning2.default)(false, '.mjmlconfig has a ParseError: ' + e);
  }
};

var parsePackages = function parsePackages(packages) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!packages) {
    return;
  }

  packages.forEach(function (file) {
    if (!file) {
      return;
    }

    try {
      var filename = _path2.default.join(options.cwd || cwd, file);
      var Component = isRelativePath(file) ? require(filename) : require.main.require(file);

      (0, _MJMLElementsCollection.registerMJElement)(Component.default || Component);
    } catch (e) {
      (0, _warning2.default)(false, '.mjmlconfig file ' + file + ' opened from ' + cwd + ' has an error : ' + e);
    }
  });
};

var parseRules = function parseRules(validators) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!validators) {
    return;
  }

  validators.forEach(function (file) {
    if (!file) {
      return;
    }

    try {
      var filename = _path2.default.join(options.cwd || cwd, file);
      var rule = isRelativePath(file) ? require(filename) : require.main.require(file);

      (0, _mjmlValidator.registerMJRule)(rule);
    } catch (e) {
      (0, _warning2.default)(false, '.mjmlconfig file ' + file + ' opened from ' + cwd + ' has an error : ' + e);
    }
  });
};

exports.default = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var config = parseConfigFile(options);

  if (!config) {
    return;
  }

  parsePackages(config.packages, options);
  parseRules(config.validators, options);
};