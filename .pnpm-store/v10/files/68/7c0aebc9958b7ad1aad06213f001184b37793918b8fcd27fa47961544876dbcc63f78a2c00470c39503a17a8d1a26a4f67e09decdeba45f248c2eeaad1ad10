'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../constants/index.js');
var index$3 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var tabNav = require('./tab-nav.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');
var event = require('../../../constants/event.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-ordered-children/index.js');
var index$2 = require('../../../hooks/use-deprecated/index.js');
var aria = require('../../../constants/aria.js');

const tabsProps = runtime.buildProps({
  type: {
    type: String,
    values: ["card", "border-card", ""],
    default: ""
  },
  activeName: {
    type: [String, Number]
  },
  closable: Boolean,
  addable: Boolean,
  modelValue: {
    type: [String, Number]
  },
  editable: Boolean,
  tabPosition: {
    type: String,
    values: ["top", "right", "bottom", "left"],
    default: "top"
  },
  beforeLeave: {
    type: runtime.definePropType(Function),
    default: () => true
  },
  stretch: Boolean
});
const isPaneName = (value) => shared.isString(value) || types.isNumber(value);
const tabsEmits = {
  [event.UPDATE_MODEL_EVENT]: (name) => isPaneName(name),
  tabClick: (pane, ev) => ev instanceof Event,
  tabChange: (name) => isPaneName(name),
  edit: (paneName, action) => ["remove", "add"].includes(action),
  tabRemove: (name) => isPaneName(name),
  tabAdd: () => true
};
const Tabs = vue.defineComponent({
  name: "ElTabs",
  props: tabsProps,
  emits: tabsEmits,
  setup(props, {
    emit,
    slots,
    expose
  }) {
    var _a, _b;
    const ns = index.useNamespace("tabs");
    const {
      children: panes,
      addChild: registerPane,
      removeChild: unregisterPane
    } = index$1.useOrderedChildren(vue.getCurrentInstance(), "ElTabPane");
    const nav$ = vue.ref();
    const currentName = vue.ref((_b = (_a = props.modelValue) != null ? _a : props.activeName) != null ? _b : "0");
    const setCurrentName = async (value, trigger = false) => {
      var _a2, _b2, _c;
      if (currentName.value === value || types.isUndefined(value))
        return;
      try {
        const canLeave = await ((_a2 = props.beforeLeave) == null ? void 0 : _a2.call(props, value, currentName.value));
        if (canLeave !== false) {
          currentName.value = value;
          if (trigger) {
            emit(event.UPDATE_MODEL_EVENT, value);
            emit("tabChange", value);
          }
          (_c = (_b2 = nav$.value) == null ? void 0 : _b2.removeFocus) == null ? void 0 : _c.call(_b2);
        }
      } catch (e) {
      }
    };
    const handleTabClick = (tab, tabName, event) => {
      if (tab.props.disabled)
        return;
      setCurrentName(tabName, true);
      emit("tabClick", tab, event);
    };
    const handleTabRemove = (pane, ev) => {
      if (pane.props.disabled || types.isUndefined(pane.props.name))
        return;
      ev.stopPropagation();
      emit("edit", pane.props.name, "remove");
      emit("tabRemove", pane.props.name);
    };
    const handleTabAdd = () => {
      emit("edit", void 0, "add");
      emit("tabAdd");
    };
    index$2.useDeprecated({
      from: '"activeName"',
      replacement: '"model-value" or "v-model"',
      scope: "ElTabs",
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/tabs.html#attributes",
      type: "Attribute"
    }, vue.computed(() => !!props.activeName));
    vue.watch(() => props.activeName, (modelValue) => setCurrentName(modelValue));
    vue.watch(() => props.modelValue, (modelValue) => setCurrentName(modelValue));
    vue.watch(currentName, async () => {
      var _a2;
      await vue.nextTick();
      (_a2 = nav$.value) == null ? void 0 : _a2.scrollToActiveTab();
    });
    vue.provide(constants.tabsRootContextKey, {
      props,
      currentName,
      registerPane,
      unregisterPane
    });
    expose({
      currentName
    });
    return () => {
      const addSlot = slots.addIcon;
      const newButton = props.editable || props.addable ? vue.createVNode("span", {
        "class": ns.e("new-tab"),
        "tabindex": "0",
        "onClick": handleTabAdd,
        "onKeydown": (ev) => {
          if (ev.code === aria.EVENT_CODE.enter)
            handleTabAdd();
        }
      }, [addSlot ? vue.renderSlot(slots, "addIcon") : vue.createVNode(index$3.ElIcon, {
        "class": ns.is("icon-plus")
      }, {
        default: () => [vue.createVNode(iconsVue.Plus, null, null)]
      })]) : null;
      const header = vue.createVNode("div", {
        "class": [ns.e("header"), ns.is(props.tabPosition)]
      }, [newButton, vue.createVNode(tabNav["default"], {
        "ref": nav$,
        "currentName": currentName.value,
        "editable": props.editable,
        "type": props.type,
        "panes": panes.value,
        "stretch": props.stretch,
        "onTabClick": handleTabClick,
        "onTabRemove": handleTabRemove
      }, null)]);
      const panels = vue.createVNode("div", {
        "class": ns.e("content")
      }, [vue.renderSlot(slots, "default")]);
      return vue.createVNode("div", {
        "class": [ns.b(), ns.m(props.tabPosition), {
          [ns.m("card")]: props.type === "card",
          [ns.m("border-card")]: props.type === "border-card"
        }]
      }, [...props.tabPosition !== "bottom" ? [header, panels] : [panels, header]]);
    };
  }
});

exports["default"] = Tabs;
exports.tabsEmits = tabsEmits;
exports.tabsProps = tabsProps;
//# sourceMappingURL=tabs.js.map
