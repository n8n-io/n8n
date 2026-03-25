import { defineComponent, computed, unref, openBlock, createElementBlock, normalizeClass, withModifiers, createElementVNode, normalizeStyle, createBlock, Transition, withCtx, withDirectives, createVNode, vShow, createCommentVNode, renderSlot, Fragment, renderList, toDisplayString } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import '../../../hooks/index.mjs';
import { carouselProps, carouselEmits } from './carousel.mjs';
import { useCarousel } from './use-carousel.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["onMouseenter", "onClick"];
const _hoisted_2 = { key: 0 };
const COMPONENT_NAME = "ElCarousel";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: carouselProps,
  emits: carouselEmits,
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
    } = useCarousel(props, emit, COMPONENT_NAME);
    const ns = useNamespace("carousel");
    const carouselClasses = computed(() => {
      const classes = [ns.b(), ns.m(props.direction)];
      if (unref(isCardType)) {
        classes.push(ns.m("card"));
      }
      return classes;
    });
    const indicatorsClasses = computed(() => {
      const classes = [ns.e("indicators"), ns.em("indicators", props.direction)];
      if (unref(hasLabel)) {
        classes.push(ns.em("indicators", "labels"));
      }
      if (props.indicatorPosition === "outside") {
        classes.push(ns.em("indicators", "outside"));
      }
      if (unref(isVertical)) {
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
      return openBlock(), createElementBlock("div", {
        ref_key: "root",
        ref: root,
        class: normalizeClass(unref(carouselClasses)),
        onMouseenter: _cache[6] || (_cache[6] = withModifiers((...args) => unref(handleMouseEnter) && unref(handleMouseEnter)(...args), ["stop"])),
        onMouseleave: _cache[7] || (_cache[7] = withModifiers((...args) => unref(handleMouseLeave) && unref(handleMouseLeave)(...args), ["stop"]))
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("container")),
          style: normalizeStyle(unref(containerStyle))
        }, [
          unref(arrowDisplay) ? (openBlock(), createBlock(Transition, {
            key: 0,
            name: "carousel-arrow-left",
            persisted: ""
          }, {
            default: withCtx(() => [
              withDirectives(createElementVNode("button", {
                type: "button",
                class: normalizeClass([unref(ns).e("arrow"), unref(ns).em("arrow", "left")]),
                onMouseenter: _cache[0] || (_cache[0] = ($event) => unref(handleButtonEnter)("left")),
                onMouseleave: _cache[1] || (_cache[1] = (...args) => unref(handleButtonLeave) && unref(handleButtonLeave)(...args)),
                onClick: _cache[2] || (_cache[2] = withModifiers(($event) => unref(throttledArrowClick)(unref(activeIndex) - 1), ["stop"]))
              }, [
                createVNode(unref(ElIcon), null, {
                  default: withCtx(() => [
                    createVNode(unref(ArrowLeft))
                  ]),
                  _: 1
                })
              ], 34), [
                [
                  vShow,
                  (_ctx.arrow === "always" || unref(hover)) && (props.loop || unref(activeIndex) > 0)
                ]
              ])
            ]),
            _: 1
          })) : createCommentVNode("v-if", true),
          unref(arrowDisplay) ? (openBlock(), createBlock(Transition, {
            key: 1,
            name: "carousel-arrow-right",
            persisted: ""
          }, {
            default: withCtx(() => [
              withDirectives(createElementVNode("button", {
                type: "button",
                class: normalizeClass([unref(ns).e("arrow"), unref(ns).em("arrow", "right")]),
                onMouseenter: _cache[3] || (_cache[3] = ($event) => unref(handleButtonEnter)("right")),
                onMouseleave: _cache[4] || (_cache[4] = (...args) => unref(handleButtonLeave) && unref(handleButtonLeave)(...args)),
                onClick: _cache[5] || (_cache[5] = withModifiers(($event) => unref(throttledArrowClick)(unref(activeIndex) + 1), ["stop"]))
              }, [
                createVNode(unref(ElIcon), null, {
                  default: withCtx(() => [
                    createVNode(unref(ArrowRight))
                  ]),
                  _: 1
                })
              ], 34), [
                [
                  vShow,
                  (_ctx.arrow === "always" || unref(hover)) && (props.loop || unref(activeIndex) < unref(items).length - 1)
                ]
              ])
            ]),
            _: 1
          })) : createCommentVNode("v-if", true),
          createVNode(unref(PlaceholderItem)),
          renderSlot(_ctx.$slots, "default")
        ], 6),
        _ctx.indicatorPosition !== "none" ? (openBlock(), createElementBlock("ul", {
          key: 0,
          class: normalizeClass(unref(indicatorsClasses))
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(items), (item, index) => {
            return withDirectives((openBlock(), createElementBlock("li", {
              key: index,
              class: normalizeClass([
                unref(ns).e("indicator"),
                unref(ns).em("indicator", _ctx.direction),
                unref(ns).is("active", index === unref(activeIndex))
              ]),
              onMouseenter: ($event) => unref(throttledIndicatorHover)(index),
              onClick: withModifiers(($event) => unref(handleIndicatorClick)(index), ["stop"])
            }, [
              createElementVNode("button", {
                class: normalizeClass(unref(ns).e("button"))
              }, [
                unref(hasLabel) ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(item.props.label), 1)) : createCommentVNode("v-if", true)
              ], 2)
            ], 42, _hoisted_1)), [
              [vShow, unref(isTwoLengthShow)(index)]
            ]);
          }), 128))
        ], 2)) : createCommentVNode("v-if", true)
      ], 34);
    };
  }
});
var Carousel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/carousel/src/carousel.vue"]]);

export { Carousel as default };
//# sourceMappingURL=carousel2.mjs.map
