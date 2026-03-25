'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var util = require('./util.js');
var thumb = require('./thumb2.js');
var bar = require('./bar.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "bar",
  props: bar.barProps,
  setup(__props, { expose }) {
    const props = __props;
    const moveX = vue.ref(0);
    const moveY = vue.ref(0);
    const handleScroll = (wrap) => {
      if (wrap) {
        const offsetHeight = wrap.offsetHeight - util.GAP;
        const offsetWidth = wrap.offsetWidth - util.GAP;
        moveY.value = wrap.scrollTop * 100 / offsetHeight * props.ratioY;
        moveX.value = wrap.scrollLeft * 100 / offsetWidth * props.ratioX;
      }
    };
    expose({
      handleScroll
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock(vue.Fragment, null, [
        vue.createVNode(thumb["default"], {
          move: moveX.value,
          ratio: _ctx.ratioX,
          size: _ctx.width,
          always: _ctx.always
        }, null, 8, ["move", "ratio", "size", "always"]),
        vue.createVNode(thumb["default"], {
          move: moveY.value,
          ratio: _ctx.ratioY,
          size: _ctx.height,
          vertical: "",
          always: _ctx.always
        }, null, 8, ["move", "ratio", "size", "always"])
      ], 64);
    };
  }
});
var Bar = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/scrollbar/src/bar.vue"]]);

exports["default"] = Bar;
//# sourceMappingURL=bar2.js.map
