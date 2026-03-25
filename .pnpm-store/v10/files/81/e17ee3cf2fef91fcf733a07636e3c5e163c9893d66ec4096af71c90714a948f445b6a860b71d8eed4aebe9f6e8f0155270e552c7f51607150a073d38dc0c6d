'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var useOption = require('./useOption.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-id/index.js');

const _sfc_main = vue.defineComponent({
  name: "ElOption",
  componentName: "ElOption",
  props: {
    value: {
      required: true,
      type: [String, Number, Boolean, Object]
    },
    label: [String, Number],
    created: Boolean,
    disabled: Boolean
  },
  setup(props) {
    const ns = index.useNamespace("select");
    const id = index$1.useId();
    const containerKls = vue.computed(() => [
      ns.be("dropdown", "item"),
      ns.is("disabled", vue.unref(isDisabled)),
      {
        selected: vue.unref(itemSelected),
        hover: vue.unref(hover)
      }
    ]);
    const states = vue.reactive({
      index: -1,
      groupDisabled: false,
      visible: true,
      hitState: false,
      hover: false
    });
    const { currentLabel, itemSelected, isDisabled, select, hoverItem } = useOption.useOption(props, states);
    const { visible, hover } = vue.toRefs(states);
    const vm = vue.getCurrentInstance().proxy;
    select.onOptionCreate(vm);
    vue.onBeforeUnmount(() => {
      const key = vm.value;
      const { selected } = select;
      const selectedOptions = select.props.multiple ? selected : [selected];
      const doesSelected = selectedOptions.some((item) => {
        return item.value === vm.value;
      });
      vue.nextTick(() => {
        if (select.cachedOptions.get(key) === vm && !doesSelected) {
          select.cachedOptions.delete(key);
        }
      });
      select.onOptionDestroy(key, vm);
    });
    function selectOptionClick() {
      if (props.disabled !== true && states.groupDisabled !== true) {
        select.handleOptionSelect(vm);
      }
    }
    return {
      ns,
      id,
      containerKls,
      currentLabel,
      itemSelected,
      isDisabled,
      select,
      hoverItem,
      visible,
      hover,
      selectOptionClick,
      states
    };
  }
});
const _hoisted_1 = ["id", "aria-disabled", "aria-selected"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return vue.withDirectives((vue.openBlock(), vue.createElementBlock("li", {
    id: _ctx.id,
    class: vue.normalizeClass(_ctx.containerKls),
    role: "option",
    "aria-disabled": _ctx.isDisabled || void 0,
    "aria-selected": _ctx.itemSelected,
    onMouseenter: _cache[0] || (_cache[0] = (...args) => _ctx.hoverItem && _ctx.hoverItem(...args)),
    onClick: _cache[1] || (_cache[1] = vue.withModifiers((...args) => _ctx.selectOptionClick && _ctx.selectOptionClick(...args), ["stop"]))
  }, [
    vue.renderSlot(_ctx.$slots, "default", {}, () => [
      vue.createElementVNode("span", null, vue.toDisplayString(_ctx.currentLabel), 1)
    ])
  ], 42, _hoisted_1)), [
    [vue.vShow, _ctx.visible]
  ]);
}
var Option = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select/src/option.vue"]]);

exports["default"] = Option;
//# sourceMappingURL=option.js.map
