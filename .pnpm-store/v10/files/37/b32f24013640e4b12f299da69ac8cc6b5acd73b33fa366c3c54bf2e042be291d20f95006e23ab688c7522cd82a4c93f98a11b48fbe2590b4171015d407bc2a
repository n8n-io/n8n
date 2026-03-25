'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var carouselItem = require('./carousel-item.js');
var useCarouselItem = require('./use-carousel-item.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const COMPONENT_NAME = "ElCarouselItem";
const __default__ = vue.defineComponent({
  name: "ElCarouselItem"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: carouselItem.carouselItemProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("carousel");
    const {
      carouselItemRef,
      active,
      animating,
      hover,
      inStage,
      isVertical,
      translate,
      isCardType,
      scale,
      ready,
      handleItemClick
    } = useCarouselItem.useCarouselItem(props, COMPONENT_NAME);
    const itemStyle = vue.computed(() => {
      const translateType = `translate${vue.unref(isVertical) ? "Y" : "X"}`;
      const _translate = `${translateType}(${vue.unref(translate)}px)`;
      const _scale = `scale(${vue.unref(scale)})`;
      const transform = [_translate, _scale].join(" ");
      return {
        transform
      };
    });
    return (_ctx, _cache) => {
      return vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "carouselItemRef",
        ref: carouselItemRef,
        class: vue.normalizeClass([
          vue.unref(ns).e("item"),
          vue.unref(ns).is("active", vue.unref(active)),
          vue.unref(ns).is("in-stage", vue.unref(inStage)),
          vue.unref(ns).is("hover", vue.unref(hover)),
          vue.unref(ns).is("animating", vue.unref(animating)),
          {
            [vue.unref(ns).em("item", "card")]: vue.unref(isCardType),
            [vue.unref(ns).em("item", "card-vertical")]: vue.unref(isCardType) && vue.unref(isVertical)
          }
        ]),
        style: vue.normalizeStyle(vue.unref(itemStyle)),
        onClick: _cache[0] || (_cache[0] = (...args) => vue.unref(handleItemClick) && vue.unref(handleItemClick)(...args))
      }, [
        vue.unref(isCardType) ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("mask"))
        }, null, 2)), [
          [vue.vShow, !vue.unref(active)]
        ]) : vue.createCommentVNode("v-if", true),
        vue.renderSlot(_ctx.$slots, "default")
      ], 6)), [
        [vue.vShow, vue.unref(ready)]
      ]);
    };
  }
});
var CarouselItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/carousel/src/carousel-item.vue"]]);

exports["default"] = CarouselItem;
//# sourceMappingURL=carousel-item2.js.map
