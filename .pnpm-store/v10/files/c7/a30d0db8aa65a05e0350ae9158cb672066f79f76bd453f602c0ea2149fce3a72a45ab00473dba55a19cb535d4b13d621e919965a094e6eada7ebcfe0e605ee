'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var index$2 = require('../../checkbox/index.js');
var index$3 = require('../../input/index.js');
var iconsVue = require('@element-plus/icons-vue');
var transferPanel = require('./transfer-panel.js');
require('./composables/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var usePropsAlias = require('./composables/use-props-alias.js');
var useCheck = require('./composables/use-check.js');
var types = require('../../../utils/types.js');

const __default__ = vue.defineComponent({
  name: "ElTransferPanel"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: transferPanel.transferPanelProps,
  emits: transferPanel.transferPanelEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = vue.useSlots();
    const OptionContent = ({ option }) => option;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("transfer");
    const panelState = vue.reactive({
      checked: [],
      allChecked: false,
      query: "",
      checkChangeByUser: true
    });
    const propsAlias = usePropsAlias.usePropsAlias(props);
    const {
      filteredData,
      checkedSummary,
      isIndeterminate,
      handleAllCheckedChange
    } = useCheck.useCheck(props, panelState, emit);
    const hasNoMatch = vue.computed(() => !types.isEmpty(panelState.query) && types.isEmpty(filteredData.value));
    const hasFooter = vue.computed(() => !types.isEmpty(slots.default()[0].children));
    const { checked, allChecked, query } = vue.toRefs(panelState);
    expose({
      query
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b("panel"))
      }, [
        vue.createElementVNode("p", {
          class: vue.normalizeClass(vue.unref(ns).be("panel", "header"))
        }, [
          vue.createVNode(vue.unref(index$2.ElCheckbox), {
            modelValue: vue.unref(allChecked),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => vue.isRef(allChecked) ? allChecked.value = $event : null),
            indeterminate: vue.unref(isIndeterminate),
            "validate-event": false,
            onChange: vue.unref(handleAllCheckedChange)
          }, {
            default: vue.withCtx(() => [
              vue.createTextVNode(vue.toDisplayString(_ctx.title) + " ", 1),
              vue.createElementVNode("span", null, vue.toDisplayString(vue.unref(checkedSummary)), 1)
            ]),
            _: 1
          }, 8, ["modelValue", "indeterminate", "onChange"])
        ], 2),
        vue.createElementVNode("div", {
          class: vue.normalizeClass([vue.unref(ns).be("panel", "body"), vue.unref(ns).is("with-footer", vue.unref(hasFooter))])
        }, [
          _ctx.filterable ? (vue.openBlock(), vue.createBlock(vue.unref(index$3.ElInput), {
            key: 0,
            modelValue: vue.unref(query),
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => vue.isRef(query) ? query.value = $event : null),
            class: vue.normalizeClass(vue.unref(ns).be("panel", "filter")),
            size: "default",
            placeholder: _ctx.placeholder,
            "prefix-icon": vue.unref(iconsVue.Search),
            clearable: "",
            "validate-event": false
          }, null, 8, ["modelValue", "class", "placeholder", "prefix-icon"])) : vue.createCommentVNode("v-if", true),
          vue.withDirectives(vue.createVNode(vue.unref(index$2.ElCheckboxGroup), {
            modelValue: vue.unref(checked),
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => vue.isRef(checked) ? checked.value = $event : null),
            "validate-event": false,
            class: vue.normalizeClass([vue.unref(ns).is("filterable", _ctx.filterable), vue.unref(ns).be("panel", "list")])
          }, {
            default: vue.withCtx(() => [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(filteredData), (item) => {
                return vue.openBlock(), vue.createBlock(vue.unref(index$2.ElCheckbox), {
                  key: item[vue.unref(propsAlias).key],
                  class: vue.normalizeClass(vue.unref(ns).be("panel", "item")),
                  label: item[vue.unref(propsAlias).key],
                  disabled: item[vue.unref(propsAlias).disabled],
                  "validate-event": false
                }, {
                  default: vue.withCtx(() => {
                    var _a;
                    return [
                      vue.createVNode(OptionContent, {
                        option: (_a = _ctx.optionRender) == null ? void 0 : _a.call(_ctx, item)
                      }, null, 8, ["option"])
                    ];
                  }),
                  _: 2
                }, 1032, ["class", "label", "disabled"]);
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue", "class"]), [
            [vue.vShow, !vue.unref(hasNoMatch) && !vue.unref(types.isEmpty)(_ctx.data)]
          ]),
          vue.withDirectives(vue.createElementVNode("p", {
            class: vue.normalizeClass(vue.unref(ns).be("panel", "empty"))
          }, vue.toDisplayString(vue.unref(hasNoMatch) ? vue.unref(t)("el.transfer.noMatch") : vue.unref(t)("el.transfer.noData")), 3), [
            [vue.vShow, vue.unref(hasNoMatch) || vue.unref(types.isEmpty)(_ctx.data)]
          ])
        ], 2),
        vue.unref(hasFooter) ? (vue.openBlock(), vue.createElementBlock("p", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).be("panel", "footer"))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var TransferPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/transfer/src/transfer-panel.vue"]]);

exports["default"] = TransferPanel;
//# sourceMappingURL=transfer-panel2.js.map
