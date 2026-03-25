'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
var shared = require('@vue/shared');

const isTriggerType = (trigger, type) => {
  if (shared.isArray(trigger)) {
    return trigger.includes(type);
  }
  return trigger === type;
};
const whenTrigger = (trigger, type, handler) => {
  return (e) => {
    isTriggerType(vue.unref(trigger), type) && handler(e);
  };
};

exports.isTriggerType = isTriggerType;
exports.whenTrigger = whenTrigger;
//# sourceMappingURL=utils.js.map
