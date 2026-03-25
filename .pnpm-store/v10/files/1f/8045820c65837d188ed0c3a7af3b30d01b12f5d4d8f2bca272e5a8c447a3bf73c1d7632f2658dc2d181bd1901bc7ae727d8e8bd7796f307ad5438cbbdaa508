import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';

const notificationTypes = [
  "success",
  "info",
  "warning",
  "error"
];
const notificationProps = buildProps({
  customClass: {
    type: String,
    default: ""
  },
  dangerouslyUseHTMLString: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 4500
  },
  icon: {
    type: iconPropType
  },
  id: {
    type: String,
    default: ""
  },
  message: {
    type: definePropType([String, Object]),
    default: ""
  },
  offset: {
    type: Number,
    default: 0
  },
  onClick: {
    type: definePropType(Function),
    default: () => void 0
  },
  onClose: {
    type: definePropType(Function),
    required: true
  },
  position: {
    type: String,
    values: ["top-right", "top-left", "bottom-right", "bottom-left"],
    default: "top-right"
  },
  showClose: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    values: [...notificationTypes, ""],
    default: ""
  },
  zIndex: Number
});
const notificationEmits = {
  destroy: () => true
};

export { notificationEmits, notificationProps, notificationTypes };
//# sourceMappingURL=notification.mjs.map
