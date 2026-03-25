import { defineComponent, getCurrentInstance, inject, ref, computed, nextTick, watch, onMounted, onUpdated, createVNode } from 'vue';
import { useDocumentVisibility, useWindowFocus, useResizeObserver } from '@vueuse/core';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import { ArrowLeft, ArrowRight, Close } from '@element-plus/icons-vue';
import '../../../hooks/index.mjs';
import TabBar from './tab-bar2.mjs';
import { tabsRootContextKey } from './constants.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';
import { throwError } from '../../../utils/error.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { capitalize } from '../../../utils/strings.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';

const tabNavProps = buildProps({
  panes: {
    type: definePropType(Array),
    default: () => mutable([])
  },
  currentName: {
    type: [String, Number],
    default: ""
  },
  editable: Boolean,
  type: {
    type: String,
    values: ["card", "border-card", ""],
    default: ""
  },
  stretch: Boolean
});
const tabNavEmits = {
  tabClick: (tab, tabName, ev) => ev instanceof Event,
  tabRemove: (tab, ev) => ev instanceof Event
};
const COMPONENT_NAME = "ElTabNav";
const TabNav = defineComponent({
  name: COMPONENT_NAME,
  props: tabNavProps,
  emits: tabNavEmits,
  setup(props, {
    expose,
    emit
  }) {
    const vm = getCurrentInstance();
    const rootTabs = inject(tabsRootContextKey);
    if (!rootTabs)
      throwError(COMPONENT_NAME, `<el-tabs><tab-nav /></el-tabs>`);
    const ns = useNamespace("tabs");
    const visibility = useDocumentVisibility();
    const focused = useWindowFocus();
    const navScroll$ = ref();
    const nav$ = ref();
    const el$ = ref();
    const tabBarRef = ref();
    const scrollable = ref(false);
    const navOffset = ref(0);
    const isFocus = ref(false);
    const focusable = ref(true);
    const sizeName = computed(() => ["top", "bottom"].includes(rootTabs.props.tabPosition) ? "width" : "height");
    const navStyle = computed(() => {
      const dir = sizeName.value === "width" ? "X" : "Y";
      return {
        transform: `translate${dir}(-${navOffset.value}px)`
      };
    });
    const scrollPrev = () => {
      if (!navScroll$.value)
        return;
      const containerSize = navScroll$.value[`offset${capitalize(sizeName.value)}`];
      const currentOffset = navOffset.value;
      if (!currentOffset)
        return;
      const newOffset = currentOffset > containerSize ? currentOffset - containerSize : 0;
      navOffset.value = newOffset;
    };
    const scrollNext = () => {
      if (!navScroll$.value || !nav$.value)
        return;
      const navSize = nav$.value[`offset${capitalize(sizeName.value)}`];
      const containerSize = navScroll$.value[`offset${capitalize(sizeName.value)}`];
      const currentOffset = navOffset.value;
      if (navSize - currentOffset <= containerSize)
        return;
      const newOffset = navSize - currentOffset > containerSize * 2 ? currentOffset + containerSize : navSize - containerSize;
      navOffset.value = newOffset;
    };
    const scrollToActiveTab = async () => {
      const nav = nav$.value;
      if (!scrollable.value || !el$.value || !navScroll$.value || !nav)
        return;
      await nextTick();
      const activeTab = el$.value.querySelector(".is-active");
      if (!activeTab)
        return;
      const navScroll = navScroll$.value;
      const isHorizontal = ["top", "bottom"].includes(rootTabs.props.tabPosition);
      const activeTabBounding = activeTab.getBoundingClientRect();
      const navScrollBounding = navScroll.getBoundingClientRect();
      const maxOffset = isHorizontal ? nav.offsetWidth - navScrollBounding.width : nav.offsetHeight - navScrollBounding.height;
      const currentOffset = navOffset.value;
      let newOffset = currentOffset;
      if (isHorizontal) {
        if (activeTabBounding.left < navScrollBounding.left) {
          newOffset = currentOffset - (navScrollBounding.left - activeTabBounding.left);
        }
        if (activeTabBounding.right > navScrollBounding.right) {
          newOffset = currentOffset + activeTabBounding.right - navScrollBounding.right;
        }
      } else {
        if (activeTabBounding.top < navScrollBounding.top) {
          newOffset = currentOffset - (navScrollBounding.top - activeTabBounding.top);
        }
        if (activeTabBounding.bottom > navScrollBounding.bottom) {
          newOffset = currentOffset + (activeTabBounding.bottom - navScrollBounding.bottom);
        }
      }
      newOffset = Math.max(newOffset, 0);
      navOffset.value = Math.min(newOffset, maxOffset);
    };
    const update = () => {
      var _a;
      if (!nav$.value || !navScroll$.value)
        return;
      props.stretch && ((_a = tabBarRef.value) == null ? void 0 : _a.update());
      const navSize = nav$.value[`offset${capitalize(sizeName.value)}`];
      const containerSize = navScroll$.value[`offset${capitalize(sizeName.value)}`];
      const currentOffset = navOffset.value;
      if (containerSize < navSize) {
        scrollable.value = scrollable.value || {};
        scrollable.value.prev = currentOffset;
        scrollable.value.next = currentOffset + containerSize < navSize;
        if (navSize - currentOffset < containerSize) {
          navOffset.value = navSize - containerSize;
        }
      } else {
        scrollable.value = false;
        if (currentOffset > 0) {
          navOffset.value = 0;
        }
      }
    };
    const changeTab = (e) => {
      const code = e.code;
      const {
        up,
        down,
        left,
        right
      } = EVENT_CODE;
      if (![up, down, left, right].includes(code))
        return;
      const tabList = Array.from(e.currentTarget.querySelectorAll("[role=tab]:not(.is-disabled)"));
      const currentIndex = tabList.indexOf(e.target);
      let nextIndex;
      if (code === left || code === up) {
        if (currentIndex === 0) {
          nextIndex = tabList.length - 1;
        } else {
          nextIndex = currentIndex - 1;
        }
      } else {
        if (currentIndex < tabList.length - 1) {
          nextIndex = currentIndex + 1;
        } else {
          nextIndex = 0;
        }
      }
      tabList[nextIndex].focus({
        preventScroll: true
      });
      tabList[nextIndex].click();
      setFocus();
    };
    const setFocus = () => {
      if (focusable.value)
        isFocus.value = true;
    };
    const removeFocus = () => isFocus.value = false;
    watch(visibility, (visibility2) => {
      if (visibility2 === "hidden") {
        focusable.value = false;
      } else if (visibility2 === "visible") {
        setTimeout(() => focusable.value = true, 50);
      }
    });
    watch(focused, (focused2) => {
      if (focused2) {
        setTimeout(() => focusable.value = true, 50);
      } else {
        focusable.value = false;
      }
    });
    useResizeObserver(el$, update);
    onMounted(() => setTimeout(() => scrollToActiveTab(), 0));
    onUpdated(() => update());
    expose({
      scrollToActiveTab,
      removeFocus
    });
    watch(() => props.panes, () => vm.update(), {
      flush: "post",
      deep: true
    });
    return () => {
      const scrollBtn = scrollable.value ? [createVNode("span", {
        "class": [ns.e("nav-prev"), ns.is("disabled", !scrollable.value.prev)],
        "onClick": scrollPrev
      }, [createVNode(ElIcon, null, {
        default: () => [createVNode(ArrowLeft, null, null)]
      })]), createVNode("span", {
        "class": [ns.e("nav-next"), ns.is("disabled", !scrollable.value.next)],
        "onClick": scrollNext
      }, [createVNode(ElIcon, null, {
        default: () => [createVNode(ArrowRight, null, null)]
      })])] : null;
      const tabs = props.panes.map((pane, index) => {
        var _a, _b, _c, _d;
        const uid = pane.uid;
        const disabled = pane.props.disabled;
        const tabName = (_b = (_a = pane.props.name) != null ? _a : pane.index) != null ? _b : `${index}`;
        const closable = !disabled && (pane.isClosable || props.editable);
        pane.index = `${index}`;
        const btnClose = closable ? createVNode(ElIcon, {
          "class": "is-icon-close",
          "onClick": (ev) => emit("tabRemove", pane, ev)
        }, {
          default: () => [createVNode(Close, null, null)]
        }) : null;
        const tabLabelContent = ((_d = (_c = pane.slots).label) == null ? void 0 : _d.call(_c)) || pane.props.label;
        const tabindex = !disabled && pane.active ? 0 : -1;
        return createVNode("div", {
          "ref": `tab-${uid}`,
          "class": [ns.e("item"), ns.is(rootTabs.props.tabPosition), ns.is("active", pane.active), ns.is("disabled", disabled), ns.is("closable", closable), ns.is("focus", isFocus.value)],
          "id": `tab-${tabName}`,
          "key": `tab-${uid}`,
          "aria-controls": `pane-${tabName}`,
          "role": "tab",
          "aria-selected": pane.active,
          "tabindex": tabindex,
          "onFocus": () => setFocus(),
          "onBlur": () => removeFocus(),
          "onClick": (ev) => {
            removeFocus();
            emit("tabClick", pane, tabName, ev);
          },
          "onKeydown": (ev) => {
            if (closable && (ev.code === EVENT_CODE.delete || ev.code === EVENT_CODE.backspace)) {
              emit("tabRemove", pane, ev);
            }
          }
        }, [...[tabLabelContent, btnClose]]);
      });
      return createVNode("div", {
        "ref": el$,
        "class": [ns.e("nav-wrap"), ns.is("scrollable", !!scrollable.value), ns.is(rootTabs.props.tabPosition)]
      }, [scrollBtn, createVNode("div", {
        "class": ns.e("nav-scroll"),
        "ref": navScroll$
      }, [createVNode("div", {
        "class": [ns.e("nav"), ns.is(rootTabs.props.tabPosition), ns.is("stretch", props.stretch && ["top", "bottom"].includes(rootTabs.props.tabPosition))],
        "ref": nav$,
        "style": navStyle.value,
        "role": "tablist",
        "onKeydown": changeTab
      }, [...[!props.type ? createVNode(TabBar, {
        "ref": tabBarRef,
        "tabs": [...props.panes]
      }, null) : null, tabs]])])]);
    };
  }
});

export { TabNav as default, tabNavEmits, tabNavProps };
//# sourceMappingURL=tab-nav.mjs.map
