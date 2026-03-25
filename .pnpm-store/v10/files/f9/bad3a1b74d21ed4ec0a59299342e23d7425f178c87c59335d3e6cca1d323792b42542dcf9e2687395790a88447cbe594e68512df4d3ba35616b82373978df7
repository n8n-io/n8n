'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var menu = require('./menu.js');
var store = require('./store.js');
var node = require('./node.js');
var config = require('./config.js');
var utils = require('./utils.js');
var types$1 = require('./types.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var event = require('../../../constants/event.js');
var index = require('../../../hooks/use-namespace/index.js');
var types = require('../../../utils/types.js');
var arrays = require('../../../utils/arrays.js');
var core = require('@vueuse/core');
var scroll = require('../../../utils/dom/scroll.js');
var aria = require('../../../constants/aria.js');
var aria$1 = require('../../../utils/dom/aria.js');

const _sfc_main = vue.defineComponent({
  name: "ElCascaderPanel",
  components: {
    ElCascaderMenu: menu["default"]
  },
  props: {
    ...config.CommonProps,
    border: {
      type: Boolean,
      default: true
    },
    renderLabel: Function
  },
  emits: [event.UPDATE_MODEL_EVENT, event.CHANGE_EVENT, "close", "expand-change"],
  setup(props, { emit, slots }) {
    let manualChecked = false;
    const ns = index.useNamespace("cascader");
    const config$1 = config.useCascaderConfig(props);
    let store$1 = null;
    const initialLoaded = vue.ref(true);
    const menuList = vue.ref([]);
    const checkedValue = vue.ref(null);
    const menus = vue.ref([]);
    const expandingNode = vue.ref(null);
    const checkedNodes = vue.ref([]);
    const isHoverMenu = vue.computed(() => config$1.value.expandTrigger === "hover");
    const renderLabelFn = vue.computed(() => props.renderLabel || slots.default);
    const initStore = () => {
      const { options } = props;
      const cfg = config$1.value;
      manualChecked = false;
      store$1 = new store["default"](options, cfg);
      menus.value = [store$1.getNodes()];
      if (cfg.lazy && types.isEmpty(props.options)) {
        initialLoaded.value = false;
        lazyLoad(void 0, (list) => {
          if (list) {
            store$1 = new store["default"](list, cfg);
            menus.value = [store$1.getNodes()];
          }
          initialLoaded.value = true;
          syncCheckedValue(false, true);
        });
      } else {
        syncCheckedValue(false, true);
      }
    };
    const lazyLoad = (node$1, cb) => {
      const cfg = config$1.value;
      node$1 = node$1 || new node["default"]({}, cfg, void 0, true);
      node$1.loading = true;
      const resolve = (dataList) => {
        const _node = node$1;
        const parent = _node.root ? null : _node;
        dataList && (store$1 == null ? void 0 : store$1.appendNodes(dataList, parent));
        _node.loading = false;
        _node.loaded = true;
        _node.childrenData = _node.childrenData || [];
        cb && cb(dataList);
      };
      cfg.lazyLoad(node$1, resolve);
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
      const { checkStrictly, multiple } = config$1.value;
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
      return store$1 == null ? void 0 : store$1.getFlattedNodes(leafOnly);
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
      const { checkStrictly, multiple } = config$1.value;
      const oldNodes = checkedNodes.value;
      const newNodes = getCheckedNodes(!checkStrictly);
      const nodes = utils.sortByOriginalOrder(oldNodes, newNodes);
      const values = nodes.map((node) => node.valueByOption);
      checkedNodes.value = nodes;
      checkedValue.value = multiple ? values : (_a = values[0]) != null ? _a : null;
    };
    const syncCheckedValue = (loaded = false, forced = false) => {
      const { modelValue } = props;
      const { lazy, multiple, checkStrictly } = config$1.value;
      const leafOnly = !checkStrictly;
      if (!initialLoaded.value || manualChecked || !forced && lodashUnified.isEqual(modelValue, checkedValue.value))
        return;
      if (lazy && !loaded) {
        const values = arrays.unique(lodashUnified.flattenDeep(arrays.castArray(modelValue)));
        const nodes = values.map((val) => store$1 == null ? void 0 : store$1.getNodeByValue(val)).filter((node) => !!node && !node.loaded && !node.loading);
        if (nodes.length) {
          nodes.forEach((node) => {
            lazyLoad(node, () => syncCheckedValue(false, forced));
          });
        } else {
          syncCheckedValue(true, forced);
        }
      } else {
        const values = multiple ? arrays.castArray(modelValue) : [modelValue];
        const nodes = arrays.unique(values.map((val) => store$1 == null ? void 0 : store$1.getNodeByValue(val, leafOnly)));
        syncMenuState(nodes, forced);
        checkedValue.value = lodashUnified.cloneDeep(modelValue);
      }
    };
    const syncMenuState = (newCheckedNodes, reserveExpandingState = true) => {
      const { checkStrictly } = config$1.value;
      const oldNodes = checkedNodes.value;
      const newNodes = newCheckedNodes.filter((node) => !!node && (checkStrictly || node.isLeaf));
      const oldExpandingNode = store$1 == null ? void 0 : store$1.getSameNode(expandingNode.value);
      const newExpandingNode = reserveExpandingState && oldExpandingNode || newNodes[0];
      if (newExpandingNode) {
        newExpandingNode.pathNodes.forEach((node) => expandNode(node, true));
      } else {
        expandingNode.value = null;
      }
      oldNodes.forEach((node) => node.doCheck(false));
      if (props.props.multiple) {
        vue.reactive(newNodes).forEach((node) => node.doCheck(true));
      } else {
        newNodes.forEach((node) => node.doCheck(true));
      }
      checkedNodes.value = newNodes;
      vue.nextTick(scrollToExpandingNode);
    };
    const scrollToExpandingNode = () => {
      if (!core.isClient)
        return;
      menuList.value.forEach((menu) => {
        const menuElement = menu == null ? void 0 : menu.$el;
        if (menuElement) {
          const container = menuElement.querySelector(`.${ns.namespace.value}-scrollbar__wrap`);
          const activeNode = menuElement.querySelector(`.${ns.b("node")}.${ns.is("active")}`) || menuElement.querySelector(`.${ns.b("node")}.in-active-path`);
          scroll.scrollIntoView(container, activeNode);
        }
      });
    };
    const handleKeyDown = (e) => {
      const target = e.target;
      const { code } = e;
      switch (code) {
        case aria.EVENT_CODE.up:
        case aria.EVENT_CODE.down: {
          e.preventDefault();
          const distance = code === aria.EVENT_CODE.up ? -1 : 1;
          aria$1.focusNode(aria$1.getSibling(target, distance, `.${ns.b("node")}[tabindex="-1"]`));
          break;
        }
        case aria.EVENT_CODE.left: {
          e.preventDefault();
          const preMenu = menuList.value[utils.getMenuIndex(target) - 1];
          const expandedNode = preMenu == null ? void 0 : preMenu.$el.querySelector(`.${ns.b("node")}[aria-expanded="true"]`);
          aria$1.focusNode(expandedNode);
          break;
        }
        case aria.EVENT_CODE.right: {
          e.preventDefault();
          const nextMenu = menuList.value[utils.getMenuIndex(target) + 1];
          const firstNode = nextMenu == null ? void 0 : nextMenu.$el.querySelector(`.${ns.b("node")}[tabindex="-1"]`);
          aria$1.focusNode(firstNode);
          break;
        }
        case aria.EVENT_CODE.enter:
          utils.checkNode(target);
          break;
      }
    };
    vue.provide(types$1.CASCADER_PANEL_INJECTION_KEY, vue.reactive({
      config: config$1,
      expandingNode,
      checkedNodes,
      isHoverMenu,
      initialLoaded,
      renderLabelFn,
      lazyLoad,
      expandNode,
      handleCheckChange
    }));
    vue.watch([config$1, () => props.options], initStore, {
      deep: true,
      immediate: true
    });
    vue.watch(() => props.modelValue, () => {
      manualChecked = false;
      syncCheckedValue();
    }, {
      deep: true
    });
    vue.watch(() => checkedValue.value, (val) => {
      if (!lodashUnified.isEqual(val, props.modelValue)) {
        emit(event.UPDATE_MODEL_EVENT, val);
        emit(event.CHANGE_EVENT, val);
      }
    });
    vue.onBeforeUpdate(() => menuList.value = []);
    vue.onMounted(() => !types.isEmpty(props.modelValue) && syncCheckedValue());
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
  const _component_el_cascader_menu = vue.resolveComponent("el-cascader-menu");
  return vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass([_ctx.ns.b("panel"), _ctx.ns.is("bordered", _ctx.border)]),
    onKeydown: _cache[0] || (_cache[0] = (...args) => _ctx.handleKeyDown && _ctx.handleKeyDown(...args))
  }, [
    (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.menus, (menu, index) => {
      return vue.openBlock(), vue.createBlock(_component_el_cascader_menu, {
        key: index,
        ref_for: true,
        ref: (item) => _ctx.menuList[index] = item,
        index,
        nodes: [...menu]
      }, null, 8, ["index", "nodes"]);
    }), 128))
  ], 34);
}
var CascaderPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/cascader-panel/src/index.vue"]]);

exports["default"] = CascaderPanel;
//# sourceMappingURL=index.js.map
