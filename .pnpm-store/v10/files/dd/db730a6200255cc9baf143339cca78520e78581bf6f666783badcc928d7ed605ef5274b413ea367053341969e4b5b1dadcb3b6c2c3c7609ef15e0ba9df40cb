'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../scrollbar/index.js');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var defaults = require('../defaults.js');
var props = require('../props.js');
var utils = require('../utils.js');
var index = require('../../../../hooks/use-namespace/index.js');
var util = require('../../../scrollbar/src/util.js');
var raf = require('../../../../utils/raf.js');

const ScrollBar = vue.defineComponent({
  name: "ElVirtualScrollBar",
  props: props.virtualizedScrollbarProps,
  emits: ["scroll", "start-move", "stop-move"],
  setup(props, { emit }) {
    const GAP = vue.computed(() => props.startGap + props.endGap);
    const nsVirtualScrollbar = index.useNamespace("virtual-scrollbar");
    const nsScrollbar = index.useNamespace("scrollbar");
    const trackRef = vue.ref();
    const thumbRef = vue.ref();
    let frameHandle = null;
    let onselectstartStore = null;
    const state = vue.reactive({
      isDragging: false,
      traveled: 0
    });
    const bar = vue.computed(() => util.BAR_MAP[props.layout]);
    const trackSize = vue.computed(() => props.clientSize - vue.unref(GAP));
    const trackStyle = vue.computed(() => ({
      position: "absolute",
      width: `${defaults.HORIZONTAL === props.layout ? trackSize.value : props.scrollbarSize}px`,
      height: `${defaults.HORIZONTAL === props.layout ? props.scrollbarSize : trackSize.value}px`,
      [defaults.ScrollbarDirKey[props.layout]]: "2px",
      right: "2px",
      bottom: "2px",
      borderRadius: "4px"
    }));
    const thumbSize = vue.computed(() => {
      const ratio = props.ratio;
      const clientSize = props.clientSize;
      if (ratio >= 100) {
        return Number.POSITIVE_INFINITY;
      }
      if (ratio >= 50) {
        return ratio * clientSize / 100;
      }
      const SCROLLBAR_MAX_SIZE = clientSize / 3;
      return Math.floor(Math.min(Math.max(ratio * clientSize, defaults.SCROLLBAR_MIN_SIZE), SCROLLBAR_MAX_SIZE));
    });
    const thumbStyle = vue.computed(() => {
      if (!Number.isFinite(thumbSize.value)) {
        return {
          display: "none"
        };
      }
      const thumb = `${thumbSize.value}px`;
      const style = utils.renderThumbStyle({
        bar: bar.value,
        size: thumb,
        move: state.traveled
      }, props.layout);
      return style;
    });
    const totalSteps = vue.computed(() => Math.floor(props.clientSize - thumbSize.value - vue.unref(GAP)));
    const attachEvents = () => {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      const thumbEl = vue.unref(thumbRef);
      if (!thumbEl)
        return;
      onselectstartStore = document.onselectstart;
      document.onselectstart = () => false;
      thumbEl.addEventListener("touchmove", onMouseMove);
      thumbEl.addEventListener("touchend", onMouseUp);
    };
    const detachEvents = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.onselectstart = onselectstartStore;
      onselectstartStore = null;
      const thumbEl = vue.unref(thumbRef);
      if (!thumbEl)
        return;
      thumbEl.removeEventListener("touchmove", onMouseMove);
      thumbEl.removeEventListener("touchend", onMouseUp);
    };
    const onThumbMouseDown = (e) => {
      e.stopImmediatePropagation();
      if (e.ctrlKey || [1, 2].includes(e.button)) {
        return;
      }
      state.isDragging = true;
      state[bar.value.axis] = e.currentTarget[bar.value.offset] - (e[bar.value.client] - e.currentTarget.getBoundingClientRect()[bar.value.direction]);
      emit("start-move");
      attachEvents();
    };
    const onMouseUp = () => {
      state.isDragging = false;
      state[bar.value.axis] = 0;
      emit("stop-move");
      detachEvents();
    };
    const onMouseMove = (e) => {
      const { isDragging } = state;
      if (!isDragging)
        return;
      if (!thumbRef.value || !trackRef.value)
        return;
      const prevPage = state[bar.value.axis];
      if (!prevPage)
        return;
      raf.cAF(frameHandle);
      const offset = (trackRef.value.getBoundingClientRect()[bar.value.direction] - e[bar.value.client]) * -1;
      const thumbClickPosition = thumbRef.value[bar.value.offset] - prevPage;
      const distance = offset - thumbClickPosition;
      frameHandle = raf.rAF(() => {
        state.traveled = Math.max(props.startGap, Math.min(distance, totalSteps.value));
        emit("scroll", distance, totalSteps.value);
      });
    };
    const clickTrackHandler = (e) => {
      const offset = Math.abs(e.target.getBoundingClientRect()[bar.value.direction] - e[bar.value.client]);
      const thumbHalf = thumbRef.value[bar.value.offset] / 2;
      const distance = offset - thumbHalf;
      state.traveled = Math.max(0, Math.min(distance, totalSteps.value));
      emit("scroll", distance, totalSteps.value);
    };
    vue.watch(() => props.scrollFrom, (v) => {
      if (state.isDragging)
        return;
      state.traveled = Math.ceil(v * totalSteps.value);
    });
    vue.onBeforeUnmount(() => {
      detachEvents();
    });
    return () => {
      return vue.h("div", {
        role: "presentation",
        ref: trackRef,
        class: [
          nsVirtualScrollbar.b(),
          props.class,
          (props.alwaysOn || state.isDragging) && "always-on"
        ],
        style: trackStyle.value,
        onMousedown: vue.withModifiers(clickTrackHandler, ["stop", "prevent"]),
        onTouchstartPrevent: onThumbMouseDown
      }, vue.h("div", {
        ref: thumbRef,
        class: nsScrollbar.e("thumb"),
        style: thumbStyle.value,
        onMousedown: onThumbMouseDown
      }, []));
    };
  }
});

exports["default"] = ScrollBar;
//# sourceMappingURL=scrollbar.js.map
