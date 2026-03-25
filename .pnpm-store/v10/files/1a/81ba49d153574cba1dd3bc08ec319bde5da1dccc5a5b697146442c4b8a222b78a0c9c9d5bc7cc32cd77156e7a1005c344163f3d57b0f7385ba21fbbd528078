import { defineComponent, useSlots, reactive, computed, toRefs, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, createVNode, isRef, withCtx, createTextVNode, toDisplayString, createBlock, createCommentVNode, withDirectives, Fragment, renderList, vShow, renderSlot } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { ElCheckbox, ElCheckboxGroup } from '../../checkbox/index.mjs';
import { ElInput } from '../../input/index.mjs';
import { Search } from '@element-plus/icons-vue';
import { transferPanelProps, transferPanelEmits } from './transfer-panel.mjs';
import './composables/index.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { usePropsAlias } from './composables/use-props-alias.mjs';
import { useCheck } from './composables/use-check.mjs';
import { isEmpty } from '../../../utils/types.mjs';

const __default__ = defineComponent({
  name: "ElTransferPanel"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: transferPanelProps,
  emits: transferPanelEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = useSlots();
    const OptionContent = ({ option }) => option;
    const { t } = useLocale();
    const ns = useNamespace("transfer");
    const panelState = reactive({
      checked: [],
      allChecked: false,
      query: "",
      checkChangeByUser: true
    });
    const propsAlias = usePropsAlias(props);
    const {
      filteredData,
      checkedSummary,
      isIndeterminate,
      handleAllCheckedChange
    } = useCheck(props, panelState, emit);
    const hasNoMatch = computed(() => !isEmpty(panelState.query) && isEmpty(filteredData.value));
    const hasFooter = computed(() => !isEmpty(slots.default()[0].children));
    const { checked, allChecked, query } = toRefs(panelState);
    expose({
      query
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(ns).b("panel"))
      }, [
        createElementVNode("p", {
          class: normalizeClass(unref(ns).be("panel", "header"))
        }, [
          createVNode(unref(ElCheckbox), {
            modelValue: unref(allChecked),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(allChecked) ? allChecked.value = $event : null),
            indeterminate: unref(isIndeterminate),
            "validate-event": false,
            onChange: unref(handleAllCheckedChange)
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.title) + " ", 1),
              createElementVNode("span", null, toDisplayString(unref(checkedSummary)), 1)
            ]),
            _: 1
          }, 8, ["modelValue", "indeterminate", "onChange"])
        ], 2),
        createElementVNode("div", {
          class: normalizeClass([unref(ns).be("panel", "body"), unref(ns).is("with-footer", unref(hasFooter))])
        }, [
          _ctx.filterable ? (openBlock(), createBlock(unref(ElInput), {
            key: 0,
            modelValue: unref(query),
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(query) ? query.value = $event : null),
            class: normalizeClass(unref(ns).be("panel", "filter")),
            size: "default",
            placeholder: _ctx.placeholder,
            "prefix-icon": unref(Search),
            clearable: "",
            "validate-event": false
          }, null, 8, ["modelValue", "class", "placeholder", "prefix-icon"])) : createCommentVNode("v-if", true),
          withDirectives(createVNode(unref(ElCheckboxGroup), {
            modelValue: unref(checked),
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(checked) ? checked.value = $event : null),
            "validate-event": false,
            class: normalizeClass([unref(ns).is("filterable", _ctx.filterable), unref(ns).be("panel", "list")])
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(filteredData), (item) => {
                return openBlock(), createBlock(unref(ElCheckbox), {
                  key: item[unref(propsAlias).key],
                  class: normalizeClass(unref(ns).be("panel", "item")),
                  label: item[unref(propsAlias).key],
                  disabled: item[unref(propsAlias).disabled],
                  "validate-event": false
                }, {
                  default: withCtx(() => {
                    var _a;
                    return [
                      createVNode(OptionContent, {
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
            [vShow, !unref(hasNoMatch) && !unref(isEmpty)(_ctx.data)]
          ]),
          withDirectives(createElementVNode("p", {
            class: normalizeClass(unref(ns).be("panel", "empty"))
          }, toDisplayString(unref(hasNoMatch) ? unref(t)("el.transfer.noMatch") : unref(t)("el.transfer.noData")), 3), [
            [vShow, unref(hasNoMatch) || unref(isEmpty)(_ctx.data)]
          ])
        ], 2),
        unref(hasFooter) ? (openBlock(), createElementBlock("p", {
          key: 0,
          class: normalizeClass(unref(ns).be("panel", "footer"))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 2)) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var TransferPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/transfer/src/transfer-panel.vue"]]);

export { TransferPanel as default };
//# sourceMappingURL=transfer-panel2.mjs.map
