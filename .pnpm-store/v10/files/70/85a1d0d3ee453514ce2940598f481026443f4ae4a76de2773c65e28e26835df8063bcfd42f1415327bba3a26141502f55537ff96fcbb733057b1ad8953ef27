import { unref } from 'vue';
import '../../../utils/index.mjs';
import { isArray } from '@vue/shared';

const isTriggerType = (trigger, type) => {
  if (isArray(trigger)) {
    return trigger.includes(type);
  }
  return trigger === type;
};
const whenTrigger = (trigger, type, handler) => {
  return (e) => {
    isTriggerType(unref(trigger), type) && handler(e);
  };
};

export { isTriggerType, whenTrigger };
//# sourceMappingURL=utils.mjs.map
