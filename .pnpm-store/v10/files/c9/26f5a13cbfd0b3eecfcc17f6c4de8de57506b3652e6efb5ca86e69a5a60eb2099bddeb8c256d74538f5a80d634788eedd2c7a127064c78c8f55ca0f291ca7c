import { defineComponent, inject, unref, openBlock, createElementBlock, Fragment, createElementVNode, renderList, createBlock, createVNode } from 'vue';
import ElDescriptionsCell from './descriptions-cell.mjs';
import { descriptionsKey } from './token.mjs';
import { descriptionsRowProps } from './descriptions-row.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const _hoisted_1 = { key: 1 };
const __default__ = defineComponent({
  name: "ElDescriptionsRow"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: descriptionsRowProps,
  setup(__props) {
    const descriptions = inject(descriptionsKey, {});
    return (_ctx, _cache) => {
      return unref(descriptions).direction === "vertical" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
        createElementVNode("tr", null, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.row, (cell, _index) => {
            return openBlock(), createBlock(unref(ElDescriptionsCell), {
              key: `tr1-${_index}`,
              cell,
              tag: "th",
              type: "label"
            }, null, 8, ["cell"]);
          }), 128))
        ]),
        createElementVNode("tr", null, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.row, (cell, _index) => {
            return openBlock(), createBlock(unref(ElDescriptionsCell), {
              key: `tr2-${_index}`,
              cell,
              tag: "td",
              type: "content"
            }, null, 8, ["cell"]);
          }), 128))
        ])
      ], 64)) : (openBlock(), createElementBlock("tr", _hoisted_1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.row, (cell, _index) => {
          return openBlock(), createElementBlock(Fragment, {
            key: `tr3-${_index}`
          }, [
            unref(descriptions).border ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createVNode(unref(ElDescriptionsCell), {
                cell,
                tag: "td",
                type: "label"
              }, null, 8, ["cell"]),
              createVNode(unref(ElDescriptionsCell), {
                cell,
                tag: "td",
                type: "content"
              }, null, 8, ["cell"])
            ], 64)) : (openBlock(), createBlock(unref(ElDescriptionsCell), {
              key: 1,
              cell,
              tag: "td",
              type: "both"
            }, null, 8, ["cell"]))
          ], 64);
        }), 128))
      ]));
    };
  }
});
var ElDescriptionsRow = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/descriptions/src/descriptions-row.vue"]]);

export { ElDescriptionsRow as default };
//# sourceMappingURL=descriptions-row2.mjs.map
