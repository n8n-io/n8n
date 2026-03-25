'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
require('../../../../utils/index.js');
var index = require('../../../../hooks/use-z-index/index.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');
var types = require('../../../../utils/types.js');

const usePopperContentDOM = (props, {
  attributes,
  styles,
  role
}) => {
  const { nextZIndex } = index.useZIndex();
  const ns = index$1.useNamespace("popper");
  const contentAttrs = vue.computed(() => vue.unref(attributes).popper);
  const contentZIndex = vue.ref(types.isNumber(props.zIndex) ? props.zIndex : nextZIndex());
  const contentClass = vue.computed(() => [
    ns.b(),
    ns.is("pure", props.pure),
    ns.is(props.effect),
    props.popperClass
  ]);
  const contentStyle = vue.computed(() => {
    return [
      { zIndex: vue.unref(contentZIndex) },
      vue.unref(styles).popper,
      props.popperStyle || {}
    ];
  });
  const ariaModal = vue.computed(() => role.value === "dialog" ? "false" : void 0);
  const arrowStyle = vue.computed(() => vue.unref(styles).arrow || {});
  const updateZIndex = () => {
    contentZIndex.value = types.isNumber(props.zIndex) ? props.zIndex : nextZIndex();
  };
  return {
    ariaModal,
    arrowStyle,
    contentAttrs,
    contentClass,
    contentStyle,
    contentZIndex,
    updateZIndex
  };
};

exports.usePopperContentDOM = usePopperContentDOM;
//# sourceMappingURL=use-content-dom.js.map
