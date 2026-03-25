'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var constants = require('../constants.js');
var index = require('../../../../hooks/use-prop/index.js');
var index$1 = require('../../../../hooks/use-size/index.js');

const useFormSize = (fallback, ignore = {}) => {
  const emptyRef = vue.ref(void 0);
  const size = ignore.prop ? emptyRef : index.useProp("size");
  const globalConfig = ignore.global ? emptyRef : index$1.useGlobalSize();
  const form = ignore.form ? { size: void 0 } : vue.inject(constants.formContextKey, void 0);
  const formItem = ignore.formItem ? { size: void 0 } : vue.inject(constants.formItemContextKey, void 0);
  return vue.computed(() => size.value || vue.unref(fallback) || (formItem == null ? void 0 : formItem.size) || (form == null ? void 0 : form.size) || globalConfig.value || "");
};
const useFormDisabled = (fallback) => {
  const disabled = index.useProp("disabled");
  const form = vue.inject(constants.formContextKey, void 0);
  return vue.computed(() => disabled.value || vue.unref(fallback) || (form == null ? void 0 : form.disabled) || false);
};
const useSize = useFormSize;
const useDisabled = useFormDisabled;

exports.useDisabled = useDisabled;
exports.useFormDisabled = useFormDisabled;
exports.useFormSize = useFormSize;
exports.useSize = useSize;
//# sourceMappingURL=use-form-common-props.js.map
