'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var steps = require('./steps.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-ordered-children/index.js');
var event = require('../../../constants/event.js');

const __default__ = vue.defineComponent({
  name: "ElSteps"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: steps.stepsProps,
  emits: steps.stepsEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("steps");
    const {
      children: steps,
      addChild: addStep,
      removeChild: removeStep
    } = index$1.useOrderedChildren(vue.getCurrentInstance(), "ElStep");
    vue.watch(steps, () => {
      steps.value.forEach((instance, index) => {
        instance.setIndex(index);
      });
    });
    vue.provide("ElSteps", { props, steps, addStep, removeStep });
    vue.watch(() => props.active, (newVal, oldVal) => {
      emit(event.CHANGE_EVENT, newVal, oldVal);
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b(), vue.unref(ns).m(_ctx.simple ? "simple" : _ctx.direction)])
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var Steps = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/steps/src/steps.vue"]]);

exports["default"] = Steps;
//# sourceMappingURL=steps2.js.map
