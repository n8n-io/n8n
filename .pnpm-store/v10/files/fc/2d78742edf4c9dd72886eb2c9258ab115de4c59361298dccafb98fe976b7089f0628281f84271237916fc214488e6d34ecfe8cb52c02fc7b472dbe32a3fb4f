import { defineComponent, ref, inject, getCurrentInstance, onMounted, watch, onBeforeUnmount, computed, reactive, openBlock, createElementBlock, normalizeStyle, unref, normalizeClass, createCommentVNode, createElementVNode, renderSlot, createBlock, withCtx, resolveDynamicComponent, createVNode, toDisplayString, createTextVNode } from 'vue';
import '../../../hooks/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import { Check, Close } from '@element-plus/icons-vue';
import '../../../utils/index.mjs';
import { stepProps } from './item.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isNumber } from '../../../utils/types.mjs';

const __default__ = defineComponent({
  name: "ElStep"
});
const _sfc_main = defineComponent({
  ...__default__,
  props: stepProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("step");
    const index = ref(-1);
    const lineStyle = ref({});
    const internalStatus = ref("");
    const parent = inject("ElSteps");
    const currentInstance = getCurrentInstance();
    onMounted(() => {
      watch([
        () => parent.props.active,
        () => parent.props.processStatus,
        () => parent.props.finishStatus
      ], ([active]) => {
        updateStatus(active);
      }, { immediate: true });
    });
    onBeforeUnmount(() => {
      parent.removeStep(stepItemState.uid);
    });
    const currentStatus = computed(() => {
      return props.status || internalStatus.value;
    });
    const prevStatus = computed(() => {
      const prevStep = parent.steps.value[index.value - 1];
      return prevStep ? prevStep.currentStatus : "wait";
    });
    const isCenter = computed(() => {
      return parent.props.alignCenter;
    });
    const isVertical = computed(() => {
      return parent.props.direction === "vertical";
    });
    const isSimple = computed(() => {
      return parent.props.simple;
    });
    const stepsCount = computed(() => {
      return parent.steps.value.length;
    });
    const isLast = computed(() => {
      var _a;
      return ((_a = parent.steps.value[stepsCount.value - 1]) == null ? void 0 : _a.uid) === (currentInstance == null ? void 0 : currentInstance.uid);
    });
    const space = computed(() => {
      return isSimple.value ? "" : parent.props.space;
    });
    const containerKls = computed(() => {
      return [
        ns.b(),
        ns.is(isSimple.value ? "simple" : parent.props.direction),
        ns.is("flex", isLast.value && !space.value && !isCenter.value),
        ns.is("center", isCenter.value && !isVertical.value && !isSimple.value)
      ];
    });
    const style = computed(() => {
      const style2 = {
        flexBasis: isNumber(space.value) ? `${space.value}px` : space.value ? space.value : `${100 / (stepsCount.value - (isCenter.value ? 0 : 1))}%`
      };
      if (isVertical.value)
        return style2;
      if (isLast.value) {
        style2.maxWidth = `${100 / stepsCount.value}%`;
      }
      return style2;
    });
    const setIndex = (val) => {
      index.value = val;
    };
    const calcProgress = (status) => {
      const isWait = status === "wait";
      const style2 = {
        transitionDelay: `${isWait ? "-" : ""}${150 * index.value}ms`
      };
      const step = status === parent.props.processStatus || isWait ? 0 : 100;
      style2.borderWidth = step && !isSimple.value ? "1px" : 0;
      style2[parent.props.direction === "vertical" ? "height" : "width"] = `${step}%`;
      lineStyle.value = style2;
    };
    const updateStatus = (activeIndex) => {
      if (activeIndex > index.value) {
        internalStatus.value = parent.props.finishStatus;
      } else if (activeIndex === index.value && prevStatus.value !== "error") {
        internalStatus.value = parent.props.processStatus;
      } else {
        internalStatus.value = "wait";
      }
      const prevChild = parent.steps.value[index.value - 1];
      if (prevChild)
        prevChild.calcProgress(internalStatus.value);
    };
    const stepItemState = reactive({
      uid: currentInstance.uid,
      currentStatus,
      setIndex,
      calcProgress
    });
    parent.addStep(stepItemState);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        style: normalizeStyle(unref(style)),
        class: normalizeClass(unref(containerKls))
      }, [
        createCommentVNode(" icon & line "),
        createElementVNode("div", {
          class: normalizeClass([unref(ns).e("head"), unref(ns).is(unref(currentStatus))])
        }, [
          !unref(isSimple) ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(unref(ns).e("line"))
          }, [
            createElementVNode("i", {
              class: normalizeClass(unref(ns).e("line-inner")),
              style: normalizeStyle(lineStyle.value)
            }, null, 6)
          ], 2)) : createCommentVNode("v-if", true),
          createElementVNode("div", {
            class: normalizeClass([unref(ns).e("icon"), unref(ns).is(_ctx.icon || _ctx.$slots.icon ? "icon" : "text")])
          }, [
            renderSlot(_ctx.$slots, "icon", {}, () => [
              _ctx.icon ? (openBlock(), createBlock(unref(ElIcon), {
                key: 0,
                class: normalizeClass(unref(ns).e("icon-inner"))
              }, {
                default: withCtx(() => [
                  (openBlock(), createBlock(resolveDynamicComponent(_ctx.icon)))
                ]),
                _: 1
              }, 8, ["class"])) : unref(currentStatus) === "success" ? (openBlock(), createBlock(unref(ElIcon), {
                key: 1,
                class: normalizeClass([unref(ns).e("icon-inner"), unref(ns).is("status")])
              }, {
                default: withCtx(() => [
                  createVNode(unref(Check))
                ]),
                _: 1
              }, 8, ["class"])) : unref(currentStatus) === "error" ? (openBlock(), createBlock(unref(ElIcon), {
                key: 2,
                class: normalizeClass([unref(ns).e("icon-inner"), unref(ns).is("status")])
              }, {
                default: withCtx(() => [
                  createVNode(unref(Close))
                ]),
                _: 1
              }, 8, ["class"])) : !unref(isSimple) ? (openBlock(), createElementBlock("div", {
                key: 3,
                class: normalizeClass(unref(ns).e("icon-inner"))
              }, toDisplayString(index.value + 1), 3)) : createCommentVNode("v-if", true)
            ])
          ], 2)
        ], 2),
        createCommentVNode(" title & description "),
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("main"))
        }, [
          createElementVNode("div", {
            class: normalizeClass([unref(ns).e("title"), unref(ns).is(unref(currentStatus))])
          }, [
            renderSlot(_ctx.$slots, "title", {}, () => [
              createTextVNode(toDisplayString(_ctx.title), 1)
            ])
          ], 2),
          unref(isSimple) ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(unref(ns).e("arrow"))
          }, null, 2)) : (openBlock(), createElementBlock("div", {
            key: 1,
            class: normalizeClass([unref(ns).e("description"), unref(ns).is(unref(currentStatus))])
          }, [
            renderSlot(_ctx.$slots, "description", {}, () => [
              createTextVNode(toDisplayString(_ctx.description), 1)
            ])
          ], 2))
        ], 2)
      ], 6);
    };
  }
});
var Step = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/steps/src/item.vue"]]);

export { Step as default };
//# sourceMappingURL=item2.mjs.map
