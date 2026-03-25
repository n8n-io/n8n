import { defineComponent, computed, ref, reactive, unref, watch, onBeforeUnmount, h, withModifiers } from 'vue';
import '../../../scrollbar/index.mjs';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import { HORIZONTAL, ScrollbarDirKey, SCROLLBAR_MIN_SIZE } from '../defaults.mjs';
import { virtualizedScrollbarProps } from '../props.mjs';
import { renderThumbStyle } from '../utils.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { BAR_MAP } from '../../../scrollbar/src/util.mjs';
import { cAF, rAF } from '../../../../utils/raf.mjs';

const ScrollBar = defineComponent({
  name: "ElVirtualScrollBar",
  props: virtualizedScrollbarProps,
  emits: ["scroll", "start-move", "stop-move"],
  setup(props, { emit }) {
    const GAP = computed(() => props.startGap + props.endGap);
    const nsVirtualScrollbar = useNamespace("virtual-scrollbar");
    const nsScrollbar = useNamespace("scrollbar");
    const trackRef = ref();
    const thumbRef = ref();
    let frameHandle = null;
    let onselectstartStore = null;
    const state = reactive({
      isDragging: false,
      traveled: 0
    });
    const bar = computed(() => BAR_MAP[props.layout]);
    const trackSize = computed(() => props.clientSize - unref(GAP));
    const trackStyle = computed(() => ({
      position: "absolute",
      width: `${HORIZONTAL === props.layout ? trackSize.value : props.scrollbarSize}px`,
      height: `${HORIZONTAL === props.layout ? props.scrollbarSize : trackSize.value}px`,
      [ScrollbarDirKey[props.layout]]: "2px",
      right: "2px",
      bottom: "2px",
      borderRadius: "4px"
    }));
    const thumbSize = computed(() => {
      const ratio = props.ratio;
      const clientSize = props.clientSize;
      if (ratio >= 100) {
        return Number.POSITIVE_INFINITY;
      }
      if (ratio >= 50) {
        return ratio * clientSize / 100;
      }
      const SCROLLBAR_MAX_SIZE = clientSize / 3;
      return Math.floor(Math.min(Math.max(ratio * clientSize, SCROLLBAR_MIN_SIZE), SCROLLBAR_MAX_SIZE));
    });
    const thumbStyle = computed(() => {
      if (!Number.isFinite(thumbSize.value)) {
        return {
          display: "none"
        };
      }
      const thumb = `${thumbSize.value}px`;
      const style = renderThumbStyle({
        bar: bar.value,
        size: thumb,
        move: state.traveled
      }, props.layout);
      return style;
    });
    const totalSteps = computed(() => Math.floor(props.clientSize - thumbSize.value - unref(GAP)));
    const attachEvents = () => {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      const thumbEl = unref(thumbRef);
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
      const thumbEl = unref(thumbRef);
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
      cAF(frameHandle);
      const offset = (trackRef.value.getBoundingClientRect()[bar.value.direction] - e[bar.value.client]) * -1;
      const thumbClickPosition = thumbRef.value[bar.value.offset] - prevPage;
      const distance = offset - thumbClickPosition;
      frameHandle = rAF(() => {
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
    watch(() => props.scrollFrom, (v) => {
      if (state.isDragging)
        return;
      state.traveled = Math.ceil(v * totalSteps.value);
    });
    onBeforeUnmount(() => {
      detachEvents();
    });
    return () => {
      return h("div", {
        role: "presentation",
        ref: trackRef,
        class: [
          nsVirtualScrollbar.b(),
          props.class,
          (props.alwaysOn || state.isDragging) && "always-on"
        ],
        style: trackStyle.value,
        onMousedown: withModifiers(clickTrackHandler, ["stop", "prevent"]),
        onTouchstartPrevent: onThumbMouseDown
      }, h("div", {
        ref: thumbRef,
        class: nsScrollbar.e("thumb"),
        style: thumbStyle.value,
        onMousedown: onThumbMouseDown
      }, []));
    };
  }
});

export { ScrollBar as default };
//# sourceMappingURL=scrollbar.mjs.map
