'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
var carousel = require('./carousel.js');
var useCarousel = require('./use-carousel.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["onMouseenter", "onClick"];
const _hoisted_2 = { key: 0 };
const COMPONENT_NAME = "ElCarousel";
const __default__ = vue.defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: carousel.carouselProps,
  emits: carousel.carouselEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const {
      root,
      activeIndex,
      arrowDisplay,
      hasLabel,
      hover,
      isCardType,
      items,
      isVertical,
      containerStyle,
      handleButtonEnter,
      handleButtonLeave,
      handleIndicatorClick,
      handleMouseEnter,
      handleMouseLeave,
      setActiveItem,
      prev,
      next,
      PlaceholderItem,
      isTwoLengthShow,
      throttledArrowClick,
      throttledIndicatorHover
    } = useCarousel.useCarousel(props, emit, COMPONENT_NAME);
    const ns = index.useNamespace("carousel");
    const carouselClasses = vue.computed(() => {
      const classes = [ns.b(), ns.m(props.direction)];
      if (vue.unref(isCardType)) {
        classes.push(ns.m("card"));
      }
      return classes;
    });
    const indicatorsClasses = vue.computed(() => {
      const classes = [ns.e("indicators"), ns.em("indicators", props.direction)];
      if (vue.unref(hasLabel)) {
        classes.push(ns.em("indicators", "labels"));
      }
      if (props.indicatorPosition === "outside") {
        classes.push(ns.em("indicators", "outside"));
      }
      if (vue.unref(isVertical)) {
        classes.push(ns.em("indicators", "right"));
      }
      return classes;
    });
    expose({
      setActiveItem,
      prev,
      next
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "root",
        ref: root,
        class: vue.normalizeClass(vue.unref(carouselClasses)),
        onMouseenter: _cache[6] || (_cache[6] = vue.withModifiers((...args) => vue.unref(handleMouseEnter) && vue.unref(handleMouseEnter)(...args), ["stop"])),
        onMouseleave: _cache[7] || (_cache[7] = vue.withModifiers((...args) => vue.unref(handleMouseLeave) && vue.unref(handleMouseLeave)(...args), ["stop"]))
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("container")),
          style: vue.normalizeStyle(vue.unref(containerStyle))
        }, [
          vue.unref(arrowDisplay) ? (vue.openBlock(), vue.createBlock(vue.Transition, {
            key: 0,
            name: "carousel-arrow-left",
            persisted: ""
          }, {
            default: vue.withCtx(() => [
              vue.withDirectives(vue.createElementVNode("button", {
                type: "button",
                class: vue.normalizeClass([vue.unref(ns).e("arrow"), vue.unref(ns).em("arrow", "left")]),
                onMouseenter: _cache[0] || (_cache[0] = ($event) => vue.unref(handleButtonEnter)("left")),
                onMouseleave: _cache[1] || (_cache[1] = (...args) => vue.unref(handleButtonLeave) && vue.unref(handleButtonLeave)(...args)),
                onClick: _cache[2] || (_cache[2] = vue.withModifiers(($event) => vue.unref(throttledArrowClick)(vue.unref(activeIndex) - 1), ["stop"]))
              }, [
                vue.createVNode(vue.unref(index$1.ElIcon), null, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(iconsVue.ArrowLeft))
                  ]),
                  _: 1
                })
              ], 34), [
                [
                  vue.vShow,
                  (_ctx.arrow === "always" || vue.unref(hover)) && (props.loop || vue.unref(activeIndex) > 0)
                ]
              ])
            ]),
            _: 1
          })) : vue.createCommentVNode("v-if", true),
          vue.unref(arrowDisplay) ? (vue.openBlock(), vue.createBlock(vue.Transition, {
            key: 1,
            name: "carousel-arrow-right",
            persisted: ""
          }, {
            default: vue.withCtx(() => [
              vue.withDirectives(vue.createElementVNode("button", {
                type: "button",
                class: vue.normalizeClass([vue.unref(ns).e("arrow"), vue.unref(ns).em("arrow", "right")]),
                onMouseenter: _cache[3] || (_cache[3] = ($event) => vue.unref(handleButtonEnter)("right")),
                onMouseleave: _cache[4] || (_cache[4] = (...args) => vue.unref(handleButtonLeave) && vue.unref(handleButtonLeave)(...args)),
                onClick: _cache[5] || (_cache[5] = vue.withModifiers(($event) => vue.unref(throttledArrowClick)(vue.unref(activeIndex) + 1), ["stop"]))
              }, [
                vue.createVNode(vue.unref(index$1.ElIcon), null, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(iconsVue.ArrowRight))
                  ]),
                  _: 1
                })
              ], 34), [
                [
                  vue.vShow,
                  (_ctx.arrow === "always" || vue.unref(hover)) && (props.loop || vue.unref(activeIndex) < vue.unref(items).length - 1)
                ]
              ])
            ]),
            _: 1
          })) : vue.createCommentVNode("v-if", true),
          vue.createVNode(vue.unref(PlaceholderItem)),
          vue.renderSlot(_ctx.$slots, "default")
        ], 6),
        _ctx.indicatorPosition !== "none" ? (vue.openBlock(), vue.createElementBlock("ul", {
          key: 0,
          class: vue.normalizeClass(vue.unref(indicatorsClasses))
        }, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(items), (item, index) => {
            return vue.withDirectives((vue.openBlock(), vue.createElementBlock("li", {
              key: index,
              class: vue.normalizeClass([
                vue.unref(ns).e("indicator"),
                vue.unref(ns).em("indicator", _ctx.direction),
                vue.unref(ns).is("active", index === vue.unref(activeIndex))
              ]),
              onMouseenter: ($event) => vue.unref(throttledIndicatorHover)(index),
              onClick: vue.withModifiers(($event) => vue.unref(handleIndicatorClick)(index), ["stop"])
            }, [
              vue.createElementVNode("button", {
                class: vue.normalizeClass(vue.unref(ns).e("button"))
              }, [
                vue.unref(hasLabel) ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, vue.toDisplayString(item.props.label), 1)) : vue.createCommentVNode("v-if", true)
              ], 2)
            ], 42, _hoisted_1)), [
              [vue.vShow, vue.unref(isTwoLengthShow)(index)]
            ]);
          }), 128))
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 34);
    };
  }
});
var Carousel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/carousel/src/carousel.vue"]]);

exports["default"] = Carousel;
//# sourceMappingURL=carousel2.js.map
