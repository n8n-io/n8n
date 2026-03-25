'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var objects = require('../../../utils/objects.js');
var icon = require('../../../utils/vue/icon.js');

const alertEffects = ["light", "dark"];
const alertProps = runtime.buildProps({
  title: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    values: objects.keysOf(icon.TypeComponentsMap),
    default: "info"
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeText: {
    type: String,
    default: ""
  },
  showIcon: Boolean,
  center: Boolean,
  effect: {
    type: String,
    values: alertEffects,
    default: "light"
  }
});
const alertEmits = {
  close: (evt) => evt instanceof MouseEvent
};

exports.alertEffects = alertEffects;
exports.alertEmits = alertEmits;
exports.alertProps = alertProps;
//# sourceMappingURL=alert.js.map
