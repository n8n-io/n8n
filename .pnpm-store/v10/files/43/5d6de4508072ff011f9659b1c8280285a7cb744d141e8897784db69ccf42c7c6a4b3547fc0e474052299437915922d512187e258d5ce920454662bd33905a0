'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../form/index.js');
require('../../../utils/index.js');
var text = require('./text.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index = require('../../../hooks/use-namespace/index.js');
var types = require('../../../utils/types.js');

const __default__ = vue.defineComponent({
  name: "ElText"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: text.textProps,
  setup(__props) {
    const props = __props;
    const textSize = useFormCommonProps.useFormSize();
    const ns = index.useNamespace("text");
    const textKls = vue.computed(() => [
      ns.b(),
      ns.m(props.type),
      ns.m(textSize.value),
      ns.is("truncated", props.truncated),
      ns.is("line-clamp", !types.isUndefined(props.lineClamp))
    ]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.tag), {
        class: vue.normalizeClass(vue.unref(textKls)),
        style: vue.normalizeStyle({ "-webkit-line-clamp": _ctx.lineClamp })
      }, {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["class", "style"]);
    };
  }
});
var Text = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/text/src/text.vue"]]);

exports["default"] = Text;
//# sourceMappingURL=text2.js.map
