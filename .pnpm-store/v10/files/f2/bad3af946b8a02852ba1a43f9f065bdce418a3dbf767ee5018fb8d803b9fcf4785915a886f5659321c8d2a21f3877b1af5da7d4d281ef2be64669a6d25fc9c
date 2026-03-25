"use strict";

const { createPlugin } = require("stylelint");
const rules = require("./rules");
const namespace = require("./utils/namespace");

const rulesPlugins = Object.keys(rules).map(ruleName => {
  return createPlugin(namespace(ruleName), rules[ruleName]);
});

module.exports = rulesPlugins;
