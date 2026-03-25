import { defineComponent, ref, computed, reactive, nextTick, provide, watch, onBeforeUpdate, onMounted, resolveComponent, openBlock, createElementBlock, normalizeClass, Fragment, renderList, createBlock } from 'vue';
import { isEqual, flattenDeep, cloneDeep } from 'lodash-unified';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import ElCascaderMenu from './menu.mjs';
import Store from './store.mjs';
import Node from './node.mjs';
import { CommonProps, useCascaderConfig } from './config.mjs';
import { sortByOriginalOrder, checkNode, getMenuIndex } from './utils.mjs';
import { CASCADER_PANEL_INJECTION_KEY } from './types.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isEmpty } from '../../../utils/types.mjs';
import { unique, castArray } from '../../../utils/arrays.mjs';
import { isClient } from '@vueuse/core';
import { scrollIntoView } from '../../../utils/dom/scroll.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';
import { focusNode, getSibling } from '../../../utils/dom/aria.mjs';

const _sfc_main = defineComponent({
  name: "ElCascaderPanel",
  components: {
    ElCascaderMenu
  },
  props: {
    ...CommonProps,
    border: {
      type: Boolean,
      default: true
    },
    renderLabel: Function
  },
  emits: [UPDATE_MODEL_EVENT, CHANGE_EVENT, "close", "expand-change"],
  setup(props, { emit, slots }) {
    let manualChecked = false;
    const ns = useNamespace("cascader");
    const config = useCascaderConfig(props);
    let store = null;
    const initialLoaded = ref(true);
    const menuList = ref([]);
    const checkedValue = ref(null);
    const menus = ref([]);
    const expandingNode = ref(null);
    const checkedNodes = ref([]);
    const isHoverMenu = computed(() => config.value.expandTrigger === "hover");
    const renderLabelFn = computed(() => props.renderLabel || slots.default);
    const initStore = () => {
      const { options } = props;
      const cfg = config.value;
      manualChecked = false;
      store = new Store(options, cfg);
      menus.value = [store.getNodes()];
      if (cfg.lazy && isEmpty(props.options)) {
        initialLoaded.value = false;
        lazyLoad(void 0, (list) => {
          if (list) {
            store = new Store(list, cfg);
            menus.value = [store.getNodes()];
          }
          initialLoaded.value = true;
          syncCheckedValue(false, true);
        });
      } else {
        syncCheckedValue(false, true);
      }
    };
    const lazyLoad = (node, cb) => {
      const cfg = config.value;
      node = node || new Node({}, cfg, void 0, true);
      node.loading = true;
      const resolve = (dataList) => {
        const _node = node;
        const parent = _node.root ? null : _node;
        dataList && (store == null ? void 0 : store.appendNodes(dataList, parent));
        _node.loading = false;
        _node.loaded = true;
        _node.childrenData = _node.childrenData || [];
        cb && cb(dataList);
      };
      cfg.lazyLoad(node, resolve);
    };
    const expandNode = (node, silent) => {
      var _a;
      const { level } = node;
      const newMenus = menus.value.slice(0, level);
      let newExpandingNode;
      if (node.isLeaf) {
        newExpandingNode = node.pathNodes[level - 2];
      } else {
        newExpandingNode = node;
        newMenus.push(node.children);
      }
      if (((_a = expandingNode.value) == null ? void 0 : _a.uid) !== (newExpandingNode == null ? void 0 : newExpandingNode.uid)) {
        expandingNode.value = node;
        menus.value = newMenus;
        !silent && emit("expand-change", (node == null ? void 0 : node.pathValues) || []);
      }
    };
    const handleCheckChange = (node, checked, emitClose = true) => {
      const { checkStrictly, multiple } = config.value;
      const oldNode = checkedNodes.value[0];
      manualChecked = true;
      !multiple && (oldNode == null ? void 0 : oldNode.doCheck(false));
      node.doCheck(checked);
      calculateCheckedValue();
      emitClose && !multiple && !checkStrictly && emit("close");
      !emitClose && !multiple && !checkStrictly && expandParentNode(node);
    };
    const expandParentNode = (node) => {
      if (!node)
        return;
      node = node.parent;
      expandParentNode(node);
      node && expandNode(node);
    };
    const getFlattedNodes = (leafOnly) => {
      return store == null ? void 0 : store.getFlattedNodes(leafOnly);
    };
    const getCheckedNodes = (leafOnly) => {
      var _a;
      return (_a = getFlattedNodes(leafOnly)) == null ? void 0 : _a.filter((node) => node.checked !== false);
    };
    const clearCheckedNodes = () => {
      checkedNodes.value.forEach((node) => node.doCheck(false));
      calculateCheckedValue();
      menus.value = menus.value.slice(0, 1);
      expandingNode.value = null;
      emit("expand-change", []);
    };
    const calculateCheckedValue = () => {
      var _a;
      const { checkStrictly, multiple } = config.value;
      const oldNodes = checkedNodes.value;
      const newNodes = getCheckedNodes(!checkStrictly);
      const nodes = sortByOriginalOrder(oldNodes, newNodes);
      const values = nodes.map((node) => node.valueByOption);
      checkedNodes.value = nodes;
      checkedValue.value = multiple ? values : (_a = values[0]) != null ? _a : null;
    };
    const syncCheckedValue = (loaded = false, forced = false) => {
      const { modelValue } = props;
      const { lazy, multiple, checkStrictly } = config.value;
      const leafOnly = !checkStrictly;
      if (!initialLoaded.value || manualChecked || !forced && isEqual(modelValue, checkedValue.value))
        return;
      if (lazy && !loaded) {
        const values = unique(flattenDeep(castArray(modelValue)));
        const nodes = values.map((val) => store == null ? void 0 : store.getNodeByValue(val)).filter((node) => !!node && !node.loaded && !node.loading);
        if (nodes.length) {
          nodes.forEach((node) => {
            lazyLoad(node, () => syncCheckedValue(false, forced));
          });
        } else {
          syncCheckedValue(true, forced);
        }
      } else {
        const values = multiple ? castArray(modelValue) : [modelValue];
        const nodes = unique(values.map((val) => store == null ? void 0 : store.getNodeByValue(val, leafOnly)));
        syncMenuState(nodes, forced);
        checkedValue.value = cloneDeep(modelValue);
      }
    };
    const syncMenuState = (newCheckedNodes, reserveExpandingState = true) => {
      const { checkStrictly } = config.value;
      const oldNodes = checkedNodes.value;
      const newNodes = newCheckedNodes.filter((node) => !!node && (checkStrictly || node.isLeaf));
      const oldExpandingNode = store == null ? void 0 : store.getSameNode(expandingNode.value);
      const newExpandingNode = reserveExpandingState && oldExpandingNode || newNodes[0];
      if (newExpandingNode) {
        newExpandingNode.pathNodes.forEach((node) => expandNode(node, true));
      } else {
        expandingNode.value = null;
      }
      oldNodes.forEach((node) => node.doCheck(false));
      if (props.props.multiple) {
        reactive(newNodes).forEach((node) => node.doCheck(true));
      } else {
        newNodes.forEach((node) => node.doCheck(true));
      }
      checkedNodes.value = newNodes;
      nextTick(scrollToExpandingNode);
    };
    const scrollToExpandingNode = () => {
      if (!isClient)
        return;
      menuList.value.forEach((menu) => {
        const menuElement = menu == null ? void 0 : menu.$el;
        if (menuElement) {
          const container = menuElement.querySelector(`.${ns.namespace.value}-scrollbar__wrap`);
          const activeNode = menuElement.querySelector(`.${ns.b("node")}.${ns.is("active")}`) || menuElement.querySelector(`.${ns.b("node")}.in-active-path`);
          scrollIntoView(container, activeNode);
        }
      });
    };
    const handleKeyDown = (e) => {
      const target = e.target;
      const { code } = e;
      switch (code) {
        case EVENT_CODE.up:
        case EVENT_CODE.down: {
          e.preventDefault();
          const distance = code === EVENT_CODE.up ? -1 : 1;
          focusNode(getSibling(target, distance, `.${ns.b("node")}[tabindex="-1"]`));
          break;
        }
        case EVENT_CODE.left: {
          e.preventDefault();
          const preMenu = menuList.value[getMenuIndex(target) - 1];
          const expandedNode = preMenu == null ? void 0 : preMenu.$el.querySelector(`.${ns.b("node")}[aria-expanded="true"]`);
          focusNode(expandedNode);
          break;
        }
        case EVENT_CODE.right: {
          e.preventDefault();
          const nextMenu = menuList.value[getMenuIndex(target) + 1];
          const firstNode = nextMenu == null ? void 0 : nextMenu.$el.querySelector(`.${ns.b("node")}[tabindex="-1"]`);
          focusNode(firstNode);
          break;
        }
        case EVENT_CODE.enter:
          checkNode(target);
          break;
      }
    };
    provide(CASCADER_PANEL_INJECTION_KEY, reactive({
      config,
      expandingNode,
      checkedNodes,
      isHoverMenu,
      initialLoaded,
      renderLabelFn,
      lazyLoad,
      expandNode,
      handleCheckChange
    }));
    watch([config, () => props.options], initStore, {
      deep: true,
      immediate: true
    });
    watch(() => props.modelValue, () => {
      manualChecked = false;
      syncCheckedValue();
    }, {
      deep: true
    });
    watch(() => checkedValue.value, (val) => {
      if (!isEqual(val, props.modelValue)) {
        emit(UPDATE_MODEL_EVENT, val);
        emit(CHANGE_EVENT, val);
      }
    });
    onBeforeUpdate(() => menuList.value = []);
    onMounted(() => !isEmpty(props.modelValue) && syncCheckedValue());
    return {
      ns,
      menuList,
      menus,
      checkedNodes,
      handleKeyDown,
      handleCheckChange,
      getFlattedNodes,
      getCheckedNodes,
      clearCheckedNodes,
      calculateCheckedValue,
      scrollToExpandingNode
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_cascader_menu = resolveComponent("el-cascader-menu");
  return openBlock(), createElementBlock("div", {
    class: normalizeClass([_ctx.ns.b("panel"), _ctx.ns.is("bordered", _ctx.border)]),
    onKeydown: _cache[0] || (_cache[0] = (...args) => _ctx.handleKeyDown && _ctx.handleKeyDown(...args))
  }, [
    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.menus, (menu, index) => {
      return openBlock(), createBlock(_component_el_cascader_menu, {
        key: index,
        ref_for: true,
        ref: (item) => _ctx.menuList[index] = item,
        index,
        nodes: [...menu]
      }, null, 8, ["index", "nodes"]);
    }), 128))
  ], 34);
}
var CascaderPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/cascader-panel/src/index.vue"]]);

export { CascaderPanel as default };
//# sourceMappingURL=index.mjs.map
