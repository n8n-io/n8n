'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var arrow = require('./arrow.js');
var content = require('./content.js');
var root = require('./root.js');
var tooltip = require('./tooltip.js');
var trigger = require('./trigger.js');
var root$1 = require('./root2.js');
var arrow$1 = require('./arrow2.js');
var content$1 = require('./content2.js');
var trigger$1 = require('./trigger2.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const __default__ = vue.defineComponent({
  name: "ElTooltipV2"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: tooltip.tooltipV2Props,
  setup(__props) {
    const props = __props;
    const refedProps = vue.toRefs(props);
    const arrowProps = vue.reactive(lodashUnified.pick(refedProps, Object.keys(arrow.tooltipV2ArrowProps)));
    const contentProps = vue.reactive(lodashUnified.pick(refedProps, Object.keys(content.tooltipV2ContentProps)));
    const rootProps = vue.reactive(lodashUnified.pick(refedProps, Object.keys(root.tooltipV2RootProps)));
    const triggerProps = vue.reactive(lodashUnified.pick(refedProps, Object.keys(trigger.tooltipV2TriggerProps)));
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(root$1["default"], vue.normalizeProps(vue.guardReactiveProps(rootProps)), {
        default: vue.withCtx(({ open }) => [
          vue.createVNode(trigger$1["default"], vue.mergeProps(triggerProps, { nowrap: "" }), {
            default: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "trigger")
            ]),
            _: 3
          }, 16),
          (vue.openBlock(), vue.createBlock(vue.Teleport, {
            to: _ctx.to,
            disabled: !_ctx.teleported
          }, [
            _ctx.fullTransition ? (vue.openBlock(), vue.createBlock(vue.Transition, vue.normalizeProps(vue.mergeProps({ key: 0 }, _ctx.transitionProps)), {
              default: vue.withCtx(() => [
                _ctx.alwaysOn || open ? (vue.openBlock(), vue.createBlock(content$1["default"], vue.normalizeProps(vue.mergeProps({ key: 0 }, contentProps)), {
                  arrow: vue.withCtx(({ style, side }) => [
                    _ctx.showArrow ? (vue.openBlock(), vue.createBlock(arrow$1["default"], vue.mergeProps({ key: 0 }, arrowProps, {
                      style,
                      side
                    }), null, 16, ["style", "side"])) : vue.createCommentVNode("v-if", true)
                  ]),
                  default: vue.withCtx(() => [
                    vue.renderSlot(_ctx.$slots, "default")
                  ]),
                  _: 3
                }, 16)) : vue.createCommentVNode("v-if", true)
              ]),
              _: 2
            }, 1040)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
              _ctx.alwaysOn || open ? (vue.openBlock(), vue.createBlock(content$1["default"], vue.normalizeProps(vue.mergeProps({ key: 0 }, contentProps)), {
                arrow: vue.withCtx(({ style, side }) => [
                  _ctx.showArrow ? (vue.openBlock(), vue.createBlock(arrow$1["default"], vue.mergeProps({ key: 0 }, arrowProps, {
                    style,
                    side
                  }), null, 16, ["style", "side"])) : vue.createCommentVNode("v-if", true)
                ]),
                default: vue.withCtx(() => [
                  vue.renderSlot(_ctx.$slots, "default")
                ]),
                _: 3
              }, 16)) : vue.createCommentVNode("v-if", true)
            ], 64))
          ], 8, ["to", "disabled"]))
        ]),
        _: 3
      }, 16);
    };
  }
});
var TooltipV2 = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/tooltip.vue"]]);

exports["default"] = TooltipV2;
//# sourceMappingURL=tooltip2.js.map
