import '../../../utils/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { keysOf } from '../../../utils/objects.mjs';
import { TypeComponentsMap } from '../../../utils/vue/icon.mjs';

const alertEffects = ["light", "dark"];
const alertProps = buildProps({
  title: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    values: keysOf(TypeComponentsMap),
    default: "info"
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeText: {
    type: String,
    default: ""
  },
  showIcon: Boolean,
  center: Boolean,
  effect: {
    type: String,
    values: alertEffects,
    default: "light"
  }
});
const alertEmits = {
  close: (evt) => evt instanceof MouseEvent
};

export { alertEffects, alertEmits, alertProps };
//# sourceMappingURL=alert.mjs.map
