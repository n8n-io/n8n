'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var descriptionsCell = require('./descriptions-cell.js');
var token = require('./token.js');
var descriptionsRow = require('./descriptions-row.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const _hoisted_1 = { key: 1 };
const __default__ = vue.defineComponent({
  name: "ElDescriptionsRow"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: descriptionsRow.descriptionsRowProps,
  setup(__props) {
    const descriptions = vue.inject(token.descriptionsKey, {});
    return (_ctx, _cache) => {
      return vue.unref(descriptions).direction === "vertical" ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
        vue.createElementVNode("tr", null, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.row, (cell, _index) => {
            return vue.openBlock(), vue.createBlock(vue.unref(descriptionsCell["default"]), {
              key: `tr1-${_index}`,
              cell,
              tag: "th",
              type: "label"
            }, null, 8, ["cell"]);
          }), 128))
        ]),
        vue.createElementVNode("tr", null, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.row, (cell, _index) => {
            return vue.openBlock(), vue.createBlock(vue.unref(descriptionsCell["default"]), {
              key: `tr2-${_index}`,
              cell,
              tag: "td",
              type: "content"
            }, null, 8, ["cell"]);
          }), 128))
        ])
      ], 64)) : (vue.openBlock(), vue.createElementBlock("tr", _hoisted_1, [
        (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.row, (cell, _index) => {
          return vue.openBlock(), vue.createElementBlock(vue.Fragment, {
            key: `tr3-${_index}`
          }, [
            vue.unref(descriptions).border ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
              vue.createVNode(vue.unref(descriptionsCell["default"]), {
                cell,
                tag: "td",
                type: "label"
              }, null, 8, ["cell"]),
              vue.createVNode(vue.unref(descriptionsCell["default"]), {
                cell,
                tag: "td",
                type: "content"
              }, null, 8, ["cell"])
            ], 64)) : (vue.openBlock(), vue.createBlock(vue.unref(descriptionsCell["default"]), {
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
var ElDescriptionsRow = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/descriptions/src/descriptions-row.vue"]]);

exports["default"] = ElDescriptionsRow;
//# sourceMappingURL=descriptions-row2.js.map
