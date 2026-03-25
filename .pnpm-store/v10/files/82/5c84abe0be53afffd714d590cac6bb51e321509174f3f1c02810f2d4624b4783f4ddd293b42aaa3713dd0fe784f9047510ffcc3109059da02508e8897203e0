import { defineComponent, useSlots, reactive, ref, computed, watch, h, openBlock, createElementBlock, normalizeClass, unref, createVNode, withCtx, renderSlot, createElementVNode, toDisplayString, createCommentVNode } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { ElButton } from '../../button/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../form/index.mjs';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { transferProps, transferEmits } from './transfer.mjs';
import './composables/index.mjs';
import TransferPanel from './transfer-panel2.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useFormItem } from '../../form/src/hooks/use-form-item.mjs';
import { usePropsAlias } from './composables/use-props-alias.mjs';
import { useComputedData } from './composables/use-computed-data.mjs';
import { useCheckedChange } from './composables/use-checked-change.mjs';
import { useMove } from './composables/use-move.mjs';
import { debugWarn } from '../../../utils/error.mjs';
import { isEmpty, isUndefined } from '../../../utils/types.mjs';

const _hoisted_1 = { key: 0 };
const _hoisted_2 = { key: 0 };
const __default__ = defineComponent({
  name: "ElTransfer"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: transferProps,
  emits: transferEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = useSlots();
    const { t } = useLocale();
    const ns = useNamespace("transfer");
    const { formItem } = useFormItem();
    const checkedState = reactive({
      leftChecked: [],
      rightChecked: []
    });
    const propsAlias = usePropsAlias(props);
    const { sourceData, targetData } = useComputedData(props);
    const { onSourceCheckedChange, onTargetCheckedChange } = useCheckedChange(checkedState, emit);
    const { addToLeft, addToRight } = useMove(props, checkedState, emit);
    const leftPanel = ref();
    const rightPanel = ref();
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
    const hasButtonTexts = computed(() => props.buttonTexts.length === 2);
    const leftPanelTitle = computed(() => props.titles[0] || t("el.transfer.titles.0"));
    const rightPanelTitle = computed(() => props.titles[1] || t("el.transfer.titles.1"));
    const panelFilterPlaceholder = computed(() => props.filterPlaceholder || t("el.transfer.filterPlaceholder"));
    watch(() => props.modelValue, () => {
      var _a;
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "change").catch((err) => debugWarn(err));
      }
    });
    const optionRender = computed(() => (option) => {
      if (props.renderContent)
        return props.renderContent(h, option);
      if (slots.default)
        return slots.default({ option });
      return h("span", option[propsAlias.value.label] || option[propsAlias.value.key]);
    });
    expose({
      clearQuery,
      leftPanel,
      rightPanel
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(ns).b())
      }, [
        createVNode(TransferPanel, {
          ref_key: "leftPanel",
          ref: leftPanel,
          data: unref(sourceData),
          "option-render": unref(optionRender),
          placeholder: unref(panelFilterPlaceholder),
          title: unref(leftPanelTitle),
          filterable: _ctx.filterable,
          format: _ctx.format,
          "filter-method": _ctx.filterMethod,
          "default-checked": _ctx.leftDefaultChecked,
          props: props.props,
          onCheckedChange: unref(onSourceCheckedChange)
        }, {
          default: withCtx(() => [
            renderSlot(_ctx.$slots, "left-footer")
          ]),
          _: 3
        }, 8, ["data", "option-render", "placeholder", "title", "filterable", "format", "filter-method", "default-checked", "props", "onCheckedChange"]),
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("buttons"))
        }, [
          createVNode(unref(ElButton), {
            type: "primary",
            class: normalizeClass([unref(ns).e("button"), unref(ns).is("with-texts", unref(hasButtonTexts))]),
            disabled: unref(isEmpty)(checkedState.rightChecked),
            onClick: unref(addToLeft)
          }, {
            default: withCtx(() => [
              createVNode(unref(ElIcon), null, {
                default: withCtx(() => [
                  createVNode(unref(ArrowLeft))
                ]),
                _: 1
              }),
              !unref(isUndefined)(_ctx.buttonTexts[0]) ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(_ctx.buttonTexts[0]), 1)) : createCommentVNode("v-if", true)
            ]),
            _: 1
          }, 8, ["class", "disabled", "onClick"]),
          createVNode(unref(ElButton), {
            type: "primary",
            class: normalizeClass([unref(ns).e("button"), unref(ns).is("with-texts", unref(hasButtonTexts))]),
            disabled: unref(isEmpty)(checkedState.leftChecked),
            onClick: unref(addToRight)
          }, {
            default: withCtx(() => [
              !unref(isUndefined)(_ctx.buttonTexts[1]) ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(_ctx.buttonTexts[1]), 1)) : createCommentVNode("v-if", true),
              createVNode(unref(ElIcon), null, {
                default: withCtx(() => [
                  createVNode(unref(ArrowRight))
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["class", "disabled", "onClick"])
        ], 2),
        createVNode(TransferPanel, {
          ref_key: "rightPanel",
          ref: rightPanel,
          data: unref(targetData),
          "option-render": unref(optionRender),
          placeholder: unref(panelFilterPlaceholder),
          filterable: _ctx.filterable,
          format: _ctx.format,
          "filter-method": _ctx.filterMethod,
          title: unref(rightPanelTitle),
          "default-checked": _ctx.rightDefaultChecked,
          props: props.props,
          onCheckedChange: unref(onTargetCheckedChange)
        }, {
          default: withCtx(() => [
            renderSlot(_ctx.$slots, "right-footer")
          ]),
          _: 3
        }, 8, ["data", "option-render", "placeholder", "filterable", "format", "filter-method", "title", "default-checked", "props", "onCheckedChange"])
      ], 2);
    };
  }
});
var Transfer = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/transfer/src/transfer.vue"]]);

export { Transfer as default };
//# sourceMappingURL=transfer2.mjs.map
