import { defineComponent, computed, unref, withDirectives, openBlock, createElementBlock, normalizeClass, normalizeStyle, vShow, createCommentVNode, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import { carouselItemProps } from './carousel-item.mjs';
import { useCarouselItem } from './use-carousel-item.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const COMPONENT_NAME = "ElCarouselItem";
const __default__ = defineComponent({
  name: "ElCarouselItem"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: carouselItemProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("carousel");
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
    } = useCarouselItem(props, COMPONENT_NAME);
    const itemStyle = computed(() => {
      const translateType = `translate${unref(isVertical) ? "Y" : "X"}`;
      const _translate = `${translateType}(${unref(translate)}px)`;
      const _scale = `scale(${unref(scale)})`;
      const transform = [_translate, _scale].join(" ");
      return {
        transform
      };
    });
    return (_ctx, _cache) => {
      return withDirectives((openBlock(), createElementBlock("div", {
        ref_key: "carouselItemRef",
        ref: carouselItemRef,
        class: normalizeClass([
          unref(ns).e("item"),
          unref(ns).is("active", unref(active)),
          unref(ns).is("in-stage", unref(inStage)),
          unref(ns).is("hover", unref(hover)),
          unref(ns).is("animating", unref(animating)),
          {
            [unref(ns).em("item", "card")]: unref(isCardType),
            [unref(ns).em("item", "card-vertical")]: unref(isCardType) && unref(isVertical)
          }
        ]),
        style: normalizeStyle(unref(itemStyle)),
        onClick: _cache[0] || (_cache[0] = (...args) => unref(handleItemClick) && unref(handleItemClick)(...args))
      }, [
        unref(isCardType) ? withDirectives((openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(ns).e("mask"))
        }, null, 2)), [
          [vShow, !unref(active)]
        ]) : createCommentVNode("v-if", true),
        renderSlot(_ctx.$slots, "default")
      ], 6)), [
        [vShow, unref(ready)]
      ]);
    };
  }
});
var CarouselItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/carousel/src/carousel-item.vue"]]);

export { CarouselItem as default };
//# sourceMappingURL=carousel-item2.mjs.map
