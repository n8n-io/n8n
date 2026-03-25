import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const tooltipV2Strategies = ["absolute", "fixed"];
const tooltipV2Placements = [
  "top-start",
  "top-end",
  "top",
  "bottom-start",
  "bottom-end",
  "bottom",
  "left-start",
  "left-end",
  "left",
  "right-start",
  "right-end",
  "right"
];
const tooltipV2ContentProps = buildProps({
  ariaLabel: String,
  arrowPadding: {
    type: definePropType(Number),
    default: 5
  },
  effect: {
    type: String,
    default: ""
  },
  contentClass: String,
  placement: {
    type: definePropType(String),
    values: tooltipV2Placements,
    default: "bottom"
  },
  reference: {
    type: definePropType(Object),
    default: null
  },
  offset: {
    type: Number,
    default: 8
  },
  strategy: {
    type: definePropType(String),
    values: tooltipV2Strategies,
    default: "absolute"
  },
  showArrow: {
    type: Boolean,
    default: false
  }
});

export { tooltipV2ContentProps };
//# sourceMappingURL=content.mjs.map
