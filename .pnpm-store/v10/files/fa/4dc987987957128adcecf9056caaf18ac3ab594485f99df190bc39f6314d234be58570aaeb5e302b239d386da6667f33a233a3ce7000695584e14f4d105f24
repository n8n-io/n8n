'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var draggable = require('../utils/draggable.js');
var position = require('../../../../utils/dom/position.js');
var index = require('../../../../hooks/use-namespace/index.js');
var style = require('../../../../utils/dom/style.js');

const useAlphaSlider = (props) => {
  const instance = vue.getCurrentInstance();
  const thumb = vue.shallowRef();
  const bar = vue.shallowRef();
  function handleClick(event) {
    const target = event.target;
    if (target !== thumb.value) {
      handleDrag(event);
    }
  }
  function handleDrag(event) {
    if (!bar.value || !thumb.value)
      return;
    const el = instance.vnode.el;
    const rect = el.getBoundingClientRect();
    const { clientX, clientY } = position.getClientXY(event);
    if (!props.vertical) {
      let left = clientX - rect.left;
      left = Math.max(thumb.value.offsetWidth / 2, left);
      left = Math.min(left, rect.width - thumb.value.offsetWidth / 2);
      props.color.set("alpha", Math.round((left - thumb.value.offsetWidth / 2) / (rect.width - thumb.value.offsetWidth) * 100));
    } else {
      let top = clientY - rect.top;
      top = Math.max(thumb.value.offsetHeight / 2, top);
      top = Math.min(top, rect.height - thumb.value.offsetHeight / 2);
      props.color.set("alpha", Math.round((top - thumb.value.offsetHeight / 2) / (rect.height - thumb.value.offsetHeight) * 100));
    }
  }
  return {
    thumb,
    bar,
    handleDrag,
    handleClick
  };
};
const useAlphaSliderDOM = (props, {
  bar,
  thumb,
  handleDrag
}) => {
  const instance = vue.getCurrentInstance();
  const ns = index.useNamespace("color-alpha-slider");
  const thumbLeft = vue.ref(0);
  const thumbTop = vue.ref(0);
  const background = vue.ref();
  function getThumbLeft() {
    if (!thumb.value)
      return 0;
    if (props.vertical)
      return 0;
    const el = instance.vnode.el;
    const alpha = props.color.get("alpha");
    if (!el)
      return 0;
    return Math.round(alpha * (el.offsetWidth - thumb.value.offsetWidth / 2) / 100);
  }
  function getThumbTop() {
    if (!thumb.value)
      return 0;
    const el = instance.vnode.el;
    if (!props.vertical)
      return 0;
    const alpha = props.color.get("alpha");
    if (!el)
      return 0;
    return Math.round(alpha * (el.offsetHeight - thumb.value.offsetHeight / 2) / 100);
  }
  function getBackground() {
    if (props.color && props.color.value) {
      const { r, g, b } = props.color.toRgb();
      return `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0) 0%, rgba(${r}, ${g}, ${b}, 1) 100%)`;
    }
    return "";
  }
  function update() {
    thumbLeft.value = getThumbLeft();
    thumbTop.value = getThumbTop();
    background.value = getBackground();
  }
  vue.onMounted(() => {
    if (!bar.value || !thumb.value)
      return;
    const dragConfig = {
      drag: (event) => {
        handleDrag(event);
      },
      end: (event) => {
        handleDrag(event);
      }
    };
    draggable.draggable(bar.value, dragConfig);
    draggable.draggable(thumb.value, dragConfig);
    update();
  });
  vue.watch(() => props.color.get("alpha"), () => update());
  vue.watch(() => props.color.value, () => update());
  const rootKls = vue.computed(() => [ns.b(), ns.is("vertical", props.vertical)]);
  const barKls = vue.computed(() => ns.e("bar"));
  const thumbKls = vue.computed(() => ns.e("thumb"));
  const barStyle = vue.computed(() => ({ background: background.value }));
  const thumbStyle = vue.computed(() => ({
    left: style.addUnit(thumbLeft.value),
    top: style.addUnit(thumbTop.value)
  }));
  return { rootKls, barKls, barStyle, thumbKls, thumbStyle, update };
};

exports.useAlphaSlider = useAlphaSlider;
exports.useAlphaSliderDOM = useAlphaSliderDOM;
//# sourceMappingURL=use-alpha-slider.js.map
