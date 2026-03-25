var path = require('path');
var url = require('url');

var isRemoteResource = require('../utils/is-remote-resource');
var hasProtocol = require('../utils/has-protocol');

var HTTP_PROTOCOL = 'http:';

function isAllowedResource(uri, isRemote, rules) {
  var match;
  var absoluteUri;
  var allowed = isRemote ? false : true;
  var rule;
  var isNegated;
  var normalizedRule;
  var i;

  if (rules.length === 0) {
    return false;
  }

  if (isRemote && !hasProtocol(uri)) {
    uri = HTTP_PROTOCOL + uri;
  }

  match = isRemote ?
    url.parse(uri).host :
    uri;

  absoluteUri = isRemote ?
    uri :
    path.resolve(uri);

  for (i = 0; i < rules.length; i++) {
    rule = rules[i];
    isNegated = rule[0] == '!';
    normalizedRule = rule.substring(1);

    if (isNegated && isRemote && isRemoteRule(normalizedRule)) {
      allowed = allowed && !isAllowedResource(uri, true, [normalizedRule]);
    } else if (isNegated && !isRemote && !isRemoteRule(normalizedRule)) {
      allowed = allowed && !isAllowedResource(uri, false, [normalizedRule]);
    } else if (isNegated) {
      allowed = allowed && true;
    } else if (rule == 'all') {
      allowed = true;
    } else if (isRemote && rule == 'local') {
      allowed = allowed || false;
    } else if (isRemote && rule == 'remote') {
      allowed = true;
    } else if (!isRemote && rule == 'remote') {
      allowed = false;
    } else if (!isRemote && rule == 'local') {
      allowed = true;
    } else if (rule === match) {
      allowed = true;
    } else if (rule === uri) {
      allowed = true;
    } else if (isRemote && absoluteUri.indexOf(rule) === 0) {
      allowed = true;
    } else if (!isRemote && absoluteUri.indexOf(path.resolve(rule)) === 0) {
      allowed = true;
    } else if (isRemote != isRemoteRule(normalizedRule)) {
      allowed = allowed && true;
    } else {
      allowed = false;
    }
  }

  return allowed;
}

function isRemoteRule(rule) {
  return isRemoteResource(rule) || url.parse(HTTP_PROTOCOL + '//' + rule).host == rule;
}

module.exports = isAllowedResource;
