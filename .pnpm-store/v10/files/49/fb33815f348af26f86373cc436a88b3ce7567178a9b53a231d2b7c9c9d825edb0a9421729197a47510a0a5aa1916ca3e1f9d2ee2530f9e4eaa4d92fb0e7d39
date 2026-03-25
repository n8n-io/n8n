'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../form/index.js');
require('../../config-provider/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var index = require('../../../hooks/use-deprecated/index.js');
var useGlobalConfig = require('../../config-provider/src/hooks/use-global-config.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');

const useButton = (props, emit) => {
  index.useDeprecated({
    from: "type.text",
    replacement: "link",
    version: "3.0.0",
    scope: "props",
    ref: "https://element-plus.org/en-US/component/button.html#button-attributes"
  }, vue.computed(() => props.type === "text"));
  const buttonGroupContext = vue.inject(constants.buttonGroupContextKey, void 0);
  const globalConfig = useGlobalConfig.useGlobalConfig("button");
  const { form } = useFormItem.useFormItem();
  const _size = useFormCommonProps.useFormSize(vue.computed(() => buttonGroupContext == null ? void 0 : buttonGroupContext.size));
  const _disabled = useFormCommonProps.useFormDisabled();
  const _ref = vue.ref();
  const slots = vue.useSlots();
  const _type = vue.computed(() => props.type || (buttonGroupContext == null ? void 0 : buttonGroupContext.type) || "");
  const autoInsertSpace = vue.computed(() => {
    var _a, _b, _c;
    return (_c = (_b = props.autoInsertSpace) != null ? _b : (_a = globalConfig.value) == null ? void 0 : _a.autoInsertSpace) != null ? _c : false;
  });
  const _props = vue.computed(() => {
    if (props.tag === "button") {
      return {
        ariaDisabled: _disabled.value || props.loading,
        disabled: _disabled.value || props.loading,
        autofocus: props.autofocus,
        type: props.nativeType
      };
    }
    return {};
  });
  const shouldAddSpace = vue.computed(() => {
    var _a;
    const defaultSlot = (_a = slots.default) == null ? void 0 : _a.call(slots);
    if (autoInsertSpace.value && (defaultSlot == null ? void 0 : defaultSlot.length) === 1) {
      const slot = defaultSlot[0];
      if ((slot == null ? void 0 : slot.type) === vue.Text) {
        const text = slot.children;
        return /^\p{Unified_Ideograph}{2}$/u.test(text.trim());
      }
    }
    return false;
  });
  const handleClick = (evt) => {
    if (props.nativeType === "reset") {
      form == null ? void 0 : form.resetFields();
    }
    emit("click", evt);
  };
  return {
    _disabled,
    _size,
    _type,
    _ref,
    _props,
    shouldAddSpace,
    handleClick
  };
};

exports.useButton = useButton;
//# sourceMappingURL=use-button.js.map
