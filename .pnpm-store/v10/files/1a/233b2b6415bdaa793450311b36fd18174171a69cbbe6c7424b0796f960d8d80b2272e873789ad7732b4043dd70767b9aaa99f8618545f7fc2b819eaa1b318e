'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var index$2 = require('../../button/index.js');
var index$3 = require('../../icon/index.js');
require('../../form/index.js');
var iconsVue = require('@element-plus/icons-vue');
var transfer = require('./transfer.js');
require('./composables/index.js');
var transferPanel = require('./transfer-panel2.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var usePropsAlias = require('./composables/use-props-alias.js');
var useComputedData = require('./composables/use-computed-data.js');
var useCheckedChange = require('./composables/use-checked-change.js');
var useMove = require('./composables/use-move.js');
var error = require('../../../utils/error.js');
var types = require('../../../utils/types.js');

const _hoisted_1 = { key: 0 };
const _hoisted_2 = { key: 0 };
const __default__ = vue.defineComponent({
  name: "ElTransfer"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: transfer.transferProps,
  emits: transfer.transferEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = vue.useSlots();
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("transfer");
    const { formItem } = useFormItem.useFormItem();
    const checkedState = vue.reactive({
      leftChecked: [],
      rightChecked: []
    });
    const propsAlias = usePropsAlias.usePropsAlias(props);
    const { sourceData, targetData } = useComputedData.useComputedData(props);
    const { onSourceCheckedChange, onTargetCheckedChange } = useCheckedChange.useCheckedChange(checkedState, emit);
    const { addToLeft, addToRight } = useMove.useMove(props, checkedState, emit);
    const leftPanel = vue.ref();
    const rightPanel = vue.ref();
    const clearQuery = (which) => {
      switch (which) {
        case "left":
          leftPanel.value.query = "";
          break;
        case "right":
          rightPanel.value.query = "";
          break;
      }
    };
    const hasButtonTexts = vue.computed(() => props.buttonTexts.length === 2);
    const leftPanelTitle = vue.computed(() => props.titles[0] || t("el.transfer.titles.0"));
    const rightPanelTitle = vue.computed(() => props.titles[1] || t("el.transfer.titles.1"));
    const panelFilterPlaceholder = vue.computed(() => props.filterPlaceholder || t("el.transfer.filterPlaceholder"));
    vue.watch(() => props.modelValue, () => {
      var _a;
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "change").catch((err) => error.debugWarn(err));
      }
    });
    const optionRender = vue.computed(() => (option) => {
      if (props.renderContent)
        return props.renderContent(vue.h, option);
      if (slots.default)
        return slots.default({ option });
      return vue.h("span", option[propsAlias.value.label] || option[propsAlias.value.key]);
    });
    expose({
      clearQuery,
      leftPanel,
      rightPanel
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        vue.createVNode(transferPanel["default"], {
          ref_key: "leftPanel",
          ref: leftPanel,
          data: vue.unref(sourceData),
          "option-render": vue.unref(optionRender),
          placeholder: vue.unref(panelFilterPlaceholder),
          title: vue.unref(leftPanelTitle),
          filterable: _ctx.filterable,
          format: _ctx.format,
          "filter-method": _ctx.filterMethod,
          "default-checked": _ctx.leftDefaultChecked,
          props: props.props,
          onCheckedChange: vue.unref(onSourceCheckedChange)
        }, {
          default: vue.withCtx(() => [
            vue.renderSlot(_ctx.$slots, "left-footer")
          ]),
          _: 3
        }, 8, ["data", "option-render", "placeholder", "title", "filterable", "format", "filter-method", "default-checked", "props", "onCheckedChange"]),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("buttons"))
        }, [
          vue.createVNode(vue.unref(index$2.ElButton), {
            type: "primary",
            class: vue.normalizeClass([vue.unref(ns).e("button"), vue.unref(ns).is("with-texts", vue.unref(hasButtonTexts))]),
            disabled: vue.unref(types.isEmpty)(checkedState.rightChecked),
            onClick: vue.unref(addToLeft)
          }, {
            default: vue.withCtx(() => [
              vue.createVNode(vue.unref(index$3.ElIcon), null, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(iconsVue.ArrowLeft))
                ]),
                _: 1
              }),
              !vue.unref(types.isUndefined)(_ctx.buttonTexts[0]) ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_1, vue.toDisplayString(_ctx.buttonTexts[0]), 1)) : vue.createCommentVNode("v-if", true)
            ]),
            _: 1
          }, 8, ["class", "disabled", "onClick"]),
          vue.createVNode(vue.unref(index$2.ElButton), {
            type: "primary",
            class: vue.normalizeClass([vue.unref(ns).e("button"), vue.unref(ns).is("with-texts", vue.unref(hasButtonTexts))]),
            disabled: vue.unref(types.isEmpty)(checkedState.leftChecked),
            onClick: vue.unref(addToRight)
          }, {
            default: vue.withCtx(() => [
              !vue.unref(types.isUndefined)(_ctx.buttonTexts[1]) ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, vue.toDisplayString(_ctx.buttonTexts[1]), 1)) : vue.createCommentVNode("v-if", true),
              vue.createVNode(vue.unref(index$3.ElIcon), null, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(iconsVue.ArrowRight))
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["class", "disabled", "onClick"])
        ], 2),
        vue.createVNode(transferPanel["default"], {
          ref_key: "rightPanel",
          ref: rightPanel,
          data: vue.unref(targetData),
          "option-render": vue.unref(optionRender),
          placeholder: vue.unref(panelFilterPlaceholder),
          filterable: _ctx.filterable,
          format: _ctx.format,
          "filter-method": _ctx.filterMethod,
          title: vue.unref(rightPanelTitle),
          "default-checked": _ctx.rightDefaultChecked,
          props: props.props,
          onCheckedChange: vue.unref(onTargetCheckedChange)
        }, {
          default: vue.withCtx(() => [
            vue.renderSlot(_ctx.$slots, "right-footer")
          ]),
          _: 3
        }, 8, ["data", "option-render", "placeholder", "filterable", "format", "filter-method", "title", "default-checked", "props", "onCheckedChange"])
      ], 2);
    };
  }
});
var Transfer = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/transfer/src/transfer.vue"]]);

exports["default"] = Transfer;
//# sourceMappingURL=transfer2.js.map
