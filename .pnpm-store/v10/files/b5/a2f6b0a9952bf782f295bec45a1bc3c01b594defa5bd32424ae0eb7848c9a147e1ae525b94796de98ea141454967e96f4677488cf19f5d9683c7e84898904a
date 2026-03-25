'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../utils/index.js');
var item = require('./item.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var types = require('../../../utils/types.js');

const __default__ = vue.defineComponent({
  name: "ElStep"
});
const _sfc_main = vue.defineComponent({
  ...__default__,
  props: item.stepProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("step");
    const index$2 = vue.ref(-1);
    const lineStyle = vue.ref({});
    const internalStatus = vue.ref("");
    const parent = vue.inject("ElSteps");
    const currentInstance = vue.getCurrentInstance();
    vue.onMounted(() => {
      vue.watch([
        () => parent.props.active,
        () => parent.props.processStatus,
        () => parent.props.finishStatus
      ], ([active]) => {
        updateStatus(active);
      }, { immediate: true });
    });
    vue.onBeforeUnmount(() => {
      parent.removeStep(stepItemState.uid);
    });
    const currentStatus = vue.computed(() => {
      return props.status || internalStatus.value;
    });
    const prevStatus = vue.computed(() => {
      const prevStep = parent.steps.value[index$2.value - 1];
      return prevStep ? prevStep.currentStatus : "wait";
    });
    const isCenter = vue.computed(() => {
      return parent.props.alignCenter;
    });
    const isVertical = vue.computed(() => {
      return parent.props.direction === "vertical";
    });
    const isSimple = vue.computed(() => {
      return parent.props.simple;
    });
    const stepsCount = vue.computed(() => {
      return parent.steps.value.length;
    });
    const isLast = vue.computed(() => {
      var _a;
      return ((_a = parent.steps.value[stepsCount.value - 1]) == null ? void 0 : _a.uid) === (currentInstance == null ? void 0 : currentInstance.uid);
    });
    const space = vue.computed(() => {
      return isSimple.value ? "" : parent.props.space;
    });
    const containerKls = vue.computed(() => {
      return [
        ns.b(),
        ns.is(isSimple.value ? "simple" : parent.props.direction),
        ns.is("flex", isLast.value && !space.value && !isCenter.value),
        ns.is("center", isCenter.value && !isVertical.value && !isSimple.value)
      ];
    });
    const style = vue.computed(() => {
      const style2 = {
        flexBasis: types.isNumber(space.value) ? `${space.value}px` : space.value ? space.value : `${100 / (stepsCount.value - (isCenter.value ? 0 : 1))}%`
      };
      if (isVertical.value)
        return style2;
      if (isLast.value) {
        style2.maxWidth = `${100 / stepsCount.value}%`;
      }
      return style2;
    });
    const setIndex = (val) => {
      index$2.value = val;
    };
    const calcProgress = (status) => {
      const isWait = status === "wait";
      const style2 = {
        transitionDelay: `${isWait ? "-" : ""}${150 * index$2.value}ms`
      };
      const step = status === parent.props.processStatus || isWait ? 0 : 100;
      style2.borderWidth = step && !isSimple.value ? "1px" : 0;
      style2[parent.props.direction === "vertical" ? "height" : "width"] = `${step}%`;
      lineStyle.value = style2;
    };
    const updateStatus = (activeIndex) => {
      if (activeIndex > index$2.value) {
        internalStatus.value = parent.props.finishStatus;
      } else if (activeIndex === index$2.value && prevStatus.value !== "error") {
        internalStatus.value = parent.props.processStatus;
      } else {
        internalStatus.value = "wait";
      }
      const prevChild = parent.steps.value[index$2.value - 1];
      if (prevChild)
        prevChild.calcProgress(internalStatus.value);
    };
    const stepItemState = vue.reactive({
      uid: currentInstance.uid,
      currentStatus,
      setIndex,
      calcProgress
    });
    parent.addStep(stepItemState);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        style: vue.normalizeStyle(vue.unref(style)),
        class: vue.normalizeClass(vue.unref(containerKls))
      }, [
        vue.createCommentVNode(" icon & line "),
        vue.createElementVNode("div", {
          class: vue.normalizeClass([vue.unref(ns).e("head"), vue.unref(ns).is(vue.unref(currentStatus))])
        }, [
          !vue.unref(isSimple) ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("line"))
          }, [
            vue.createElementVNode("i", {
              class: vue.normalizeClass(vue.unref(ns).e("line-inner")),
              style: vue.normalizeStyle(lineStyle.value)
            }, null, 6)
          ], 2)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("div", {
            class: vue.normalizeClass([vue.unref(ns).e("icon"), vue.unref(ns).is(_ctx.icon || _ctx.$slots.icon ? "icon" : "text")])
          }, [
            vue.renderSlot(_ctx.$slots, "icon", {}, () => [
              _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
                key: 0,
                class: vue.normalizeClass(vue.unref(ns).e("icon-inner"))
              }, {
                default: vue.withCtx(() => [
                  (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
                ]),
                _: 1
              }, 8, ["class"])) : vue.unref(currentStatus) === "success" ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
                key: 1,
                class: vue.normalizeClass([vue.unref(ns).e("icon-inner"), vue.unref(ns).is("status")])
              }, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(iconsVue.Check))
                ]),
                _: 1
              }, 8, ["class"])) : vue.unref(currentStatus) === "error" ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
                key: 2,
                class: vue.normalizeClass([vue.unref(ns).e("icon-inner"), vue.unref(ns).is("status")])
              }, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(iconsVue.Close))
                ]),
                _: 1
              }, 8, ["class"])) : !vue.unref(isSimple) ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 3,
                class: vue.normalizeClass(vue.unref(ns).e("icon-inner"))
              }, vue.toDisplayString(index$2.value + 1), 3)) : vue.createCommentVNode("v-if", true)
            ])
          ], 2)
        ], 2),
        vue.createCommentVNode(" title & description "),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("main"))
        }, [
          vue.createElementVNode("div", {
            class: vue.normalizeClass([vue.unref(ns).e("title"), vue.unref(ns).is(vue.unref(currentStatus))])
          }, [
            vue.renderSlot(_ctx.$slots, "title", {}, () => [
              vue.createTextVNode(vue.toDisplayString(_ctx.title), 1)
            ])
          ], 2),
          vue.unref(isSimple) ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("arrow"))
          }, null, 2)) : (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass([vue.unref(ns).e("description"), vue.unref(ns).is(vue.unref(currentStatus))])
          }, [
            vue.renderSlot(_ctx.$slots, "description", {}, () => [
              vue.createTextVNode(vue.toDisplayString(_ctx.description), 1)
            ])
          ], 2))
        ], 2)
      ], 6);
    };
  }
});
var Step = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/steps/src/item.vue"]]);

exports["default"] = Step;
//# sourceMappingURL=item2.js.map
