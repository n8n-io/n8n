import { defineComponent, computed, h } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isString } from '@vue/shared';

const sliderMarkerProps = buildProps({
  mark: {
    type: definePropType([String, Object]),
    default: void 0
  }
});
var SliderMarker = defineComponent({
  name: "ElSliderMarker",
  props: sliderMarkerProps,
  setup(props) {
    const ns = useNamespace("slider");
    const label = computed(() => {
      return isString(props.mark) ? props.mark : props.mark.label;
    });
    const style = computed(() => isString(props.mark) ? void 0 : props.mark.style);
    return () => h("div", {
      class: ns.e("marks-text"),
      style: style.value
    }, label.value);
  }
});

export { SliderMarker as default, sliderMarkerProps };
//# sourceMappingURL=marker.mjs.map
