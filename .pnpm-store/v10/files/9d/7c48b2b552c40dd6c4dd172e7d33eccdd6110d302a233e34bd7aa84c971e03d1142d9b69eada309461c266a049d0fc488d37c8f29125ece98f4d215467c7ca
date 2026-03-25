'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
var customParseFormat = require('dayjs/plugin/customParseFormat.js');
var constants = require('./constants.js');
var picker = require('./common/picker.js');
var panelTimePick = require('./time-picker-com/panel-time-pick.js');
var panelTimeRange = require('./time-picker-com/panel-time-range.js');
var props = require('./common/props.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);
var customParseFormat__default = /*#__PURE__*/_interopDefaultLegacy(customParseFormat);

dayjs__default["default"].extend(customParseFormat__default["default"]);
var TimePicker = vue.defineComponent({
  name: "ElTimePicker",
  install: null,
  props: {
    ...props.timePickerDefaultProps,
    isRange: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const commonPicker = vue.ref();
    const [type, Panel] = props.isRange ? ["timerange", panelTimeRange["default"]] : ["time", panelTimePick["default"]];
    const modelUpdater = (value) => ctx.emit("update:modelValue", value);
    vue.provide("ElPopperOptions", props.popperOptions);
    ctx.expose({
      focus: (e) => {
        var _a;
        (_a = commonPicker.value) == null ? void 0 : _a.handleFocusInput(e);
      },
      blur: (e) => {
        var _a;
        (_a = commonPicker.value) == null ? void 0 : _a.handleBlurInput(e);
      },
      handleOpen: () => {
        var _a;
        (_a = commonPicker.value) == null ? void 0 : _a.handleOpen();
      },
      handleClose: () => {
        var _a;
        (_a = commonPicker.value) == null ? void 0 : _a.handleClose();
      }
    });
    return () => {
      var _a;
      const format = (_a = props.format) != null ? _a : constants.DEFAULT_FORMATS_TIME;
      return vue.createVNode(picker["default"], vue.mergeProps(props, {
        "ref": commonPicker,
        "type": type,
        "format": format,
        "onUpdate:modelValue": modelUpdater
      }), {
        default: (props2) => vue.createVNode(Panel, props2, null)
      });
    };
  }
});

exports["default"] = TimePicker;
//# sourceMappingURL=time-picker.js.map
