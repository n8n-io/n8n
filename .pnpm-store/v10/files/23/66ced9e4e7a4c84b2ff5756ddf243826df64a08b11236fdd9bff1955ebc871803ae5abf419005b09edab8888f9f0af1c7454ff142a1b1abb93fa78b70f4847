import { defineComponent, shallowRef, ref, computed, watch, onMounted, watchEffect, openBlock, createElementBlock, normalizeClass, unref, normalizeStyle, createElementVNode, renderSlot } from 'vue';
import { useWindowSize, useElementBounding, useEventListener } from '@vueuse/core';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { affixProps, affixEmits } from './affix.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { addUnit } from '../../../utils/dom/style.mjs';
import { throwError } from '../../../utils/error.mjs';
import { getScrollContainer } from '../../../utils/dom/scroll.mjs';

const COMPONENT_NAME = "ElAffix";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: affixProps,
  emits: affixEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = useNamespace("affix");
    const target = shallowRef();
    const root = shallowRef();
    const scrollContainer = shallowRef();
    const { height: windowHeight } = useWindowSize();
    const {
      height: rootHeight,
      width: rootWidth,
      top: rootTop,
      bottom: rootBottom,
      update: updateRoot
    } = useElementBounding(root, { windowScroll: false });
    const targetRect = useElementBounding(target);
    const fixed = ref(false);
    const scrollTop = ref(0);
    const transform = ref(0);
    const rootStyle = computed(() => {
      return {
        height: fixed.value ? `${rootHeight.value}px` : "",
        width: fixed.value ? `${rootWidth.value}px` : ""
      };
    });
    const affixStyle = computed(() => {
      if (!fixed.value)
        return {};
      const offset = props.offset ? addUnit(props.offset) : 0;
      return {
        height: `${rootHeight.value}px`,
        width: `${rootWidth.value}px`,
        top: props.position === "top" ? offset : "",
        bottom: props.position === "bottom" ? offset : "",
        transform: transform.value ? `translateY(${transform.value}px)` : "",
        zIndex: props.zIndex
      };
    });
    const update = () => {
      if (!scrollContainer.value)
        return;
      scrollTop.value = scrollContainer.value instanceof Window ? document.documentElement.scrollTop : scrollContainer.value.scrollTop || 0;
      if (props.position === "top") {
        if (props.target) {
          const difference = targetRect.bottom.value - props.offset - rootHeight.value;
          fixed.value = props.offset > rootTop.value && targetRect.bottom.value > 0;
          transform.value = difference < 0 ? difference : 0;
        } else {
          fixed.value = props.offset > rootTop.value;
        }
      } else if (props.target) {
        const difference = windowHeight.value - targetRect.top.value - props.offset - rootHeight.value;
        fixed.value = windowHeight.value - props.offset < rootBottom.value && windowHeight.value > targetRect.top.value;
        transform.value = difference < 0 ? -difference : 0;
      } else {
        fixed.value = windowHeight.value - props.offset < rootBottom.value;
      }
    };
    const handleScroll = () => {
      updateRoot();
      emit("scroll", {
        scrollTop: scrollTop.value,
        fixed: fixed.value
      });
    };
    watch(fixed, (val) => emit("change", val));
    onMounted(() => {
      var _a;
      if (props.target) {
        target.value = (_a = document.querySelector(props.target)) != null ? _a : void 0;
        if (!target.value)
          throwError(COMPONENT_NAME, `Target is not existed: ${props.target}`);
      } else {
        target.value = document.documentElement;
      }
      scrollContainer.value = getScrollContainer(root.value, true);
      updateRoot();
    });
    useEventListener(scrollContainer, "scroll", handleScroll);
    watchEffect(update);
    expose({
      update,
      updateRoot
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "root",
        ref: root,
        class: normalizeClass(unref(ns).b()),
        style: normalizeStyle(unref(rootStyle))
      }, [
        createElementVNode("div", {
          class: normalizeClass({ [unref(ns).m("fixed")]: fixed.value }),
          style: normalizeStyle(unref(affixStyle))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 6)
      ], 6);
    };
  }
});
var Affix = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/affix/src/affix.vue"]]);

export { Affix as default };
//# sourceMappingURL=affix2.mjs.map
