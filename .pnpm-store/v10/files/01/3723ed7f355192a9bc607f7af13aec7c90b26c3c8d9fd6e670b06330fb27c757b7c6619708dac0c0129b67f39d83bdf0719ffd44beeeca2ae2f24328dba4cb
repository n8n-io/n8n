import { defineComponent, getCurrentInstance, inject, ref, watch, nextTick, openBlock, createElementBlock, normalizeClass, unref, normalizeStyle } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { tabsRootContextKey } from './constants.mjs';
import { tabBarProps } from './tab-bar.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { throwError } from '../../../utils/error.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { capitalize } from '../../../utils/strings.mjs';

const COMPONENT_NAME = "ElTabBar";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: tabBarProps,
  setup(__props, { expose }) {
    const props = __props;
    const instance = getCurrentInstance();
    const rootTabs = inject(tabsRootContextKey);
    if (!rootTabs)
      throwError(COMPONENT_NAME, "<el-tabs><el-tab-bar /></el-tabs>");
    const ns = useNamespace("tabs");
    const barRef = ref();
    const barStyle = ref();
    const getBarStyle = () => {
      let offset = 0;
      let tabSize = 0;
      const sizeName = ["top", "bottom"].includes(rootTabs.props.tabPosition) ? "width" : "height";
      const sizeDir = sizeName === "width" ? "x" : "y";
      const position = sizeDir === "x" ? "left" : "top";
      props.tabs.every((tab) => {
        var _a, _b;
        const $el = (_b = (_a = instance.parent) == null ? void 0 : _a.refs) == null ? void 0 : _b[`tab-${tab.uid}`];
        if (!$el)
          return false;
        if (!tab.active) {
          return true;
        }
        offset = $el[`offset${capitalize(position)}`];
        tabSize = $el[`client${capitalize(sizeName)}`];
        const tabStyles = window.getComputedStyle($el);
        if (sizeName === "width") {
          if (props.tabs.length > 1) {
            tabSize -= Number.parseFloat(tabStyles.paddingLeft) + Number.parseFloat(tabStyles.paddingRight);
          }
          offset += Number.parseFloat(tabStyles.paddingLeft);
        }
        return false;
      });
      return {
        [sizeName]: `${tabSize}px`,
        transform: `translate${capitalize(sizeDir)}(${offset}px)`
      };
    };
    const update = () => barStyle.value = getBarStyle();
    watch(() => props.tabs, async () => {
      await nextTick();
      update();
    }, { immediate: true });
    useResizeObserver(barRef, () => update());
    expose({
      ref: barRef,
      update
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "barRef",
        ref: barRef,
        class: normalizeClass([unref(ns).e("active-bar"), unref(ns).is(unref(rootTabs).props.tabPosition)]),
        style: normalizeStyle(barStyle.value)
      }, null, 6);
    };
  }
});
var TabBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tabs/src/tab-bar.vue"]]);

export { TabBar as default };
//# sourceMappingURL=tab-bar2.mjs.map
