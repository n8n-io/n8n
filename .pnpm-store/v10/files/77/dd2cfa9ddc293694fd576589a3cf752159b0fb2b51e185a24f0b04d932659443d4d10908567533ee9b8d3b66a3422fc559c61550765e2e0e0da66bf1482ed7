import { nextTick } from 'vue';
import { isFunction } from '@vue/shared';
import { throttle } from 'lodash-unified';
import '../../../utils/index.mjs';
import { getOffsetTopDistance } from '../../../utils/dom/position.mjs';
import { throwError } from '../../../utils/error.mjs';
import { getScrollContainer } from '../../../utils/dom/scroll.mjs';

const SCOPE = "ElInfiniteScroll";
const CHECK_INTERVAL = 50;
const DEFAULT_DELAY = 200;
const DEFAULT_DISTANCE = 0;
const attributes = {
  delay: {
    type: Number,
    default: DEFAULT_DELAY
  },
  distance: {
    type: Number,
    default: DEFAULT_DISTANCE
  },
  disabled: {
    type: Boolean,
    default: false
  },
  immediate: {
    type: Boolean,
    default: true
  }
};
const getScrollOptions = (el, instance) => {
  return Object.entries(attributes).reduce((acm, [name, option]) => {
    var _a, _b;
    const { type, default: defaultValue } = option;
    const attrVal = el.getAttribute(`infinite-scroll-${name}`);
    let value = (_b = (_a = instance[attrVal]) != null ? _a : attrVal) != null ? _b : defaultValue;
    value = value === "false" ? false : value;
    value = type(value);
    acm[name] = Number.isNaN(value) ? defaultValue : value;
    return acm;
  }, {});
};
const destroyObserver = (el) => {
  const { observer } = el[SCOPE];
  if (observer) {
    observer.disconnect();
    delete el[SCOPE].observer;
  }
};
const handleScroll = (el, cb) => {
  const { container, containerEl, instance, observer, lastScrollTop } = el[SCOPE];
  const { disabled, distance } = getScrollOptions(el, instance);
  const { clientHeight, scrollHeight, scrollTop } = containerEl;
  const delta = scrollTop - lastScrollTop;
  el[SCOPE].lastScrollTop = scrollTop;
  if (observer || disabled || delta < 0)
    return;
  let shouldTrigger = false;
  if (container === el) {
    shouldTrigger = scrollHeight - (clientHeight + scrollTop) <= distance;
  } else {
    const { clientTop, scrollHeight: height } = el;
    const offsetTop = getOffsetTopDistance(el, containerEl);
    shouldTrigger = scrollTop + clientHeight >= offsetTop + clientTop + height - distance;
  }
  if (shouldTrigger) {
    cb.call(instance);
  }
};
function checkFull(el, cb) {
  const { containerEl, instance } = el[SCOPE];
  const { disabled } = getScrollOptions(el, instance);
  if (disabled || containerEl.clientHeight === 0)
    return;
  if (containerEl.scrollHeight <= containerEl.clientHeight) {
    cb.call(instance);
  } else {
    destroyObserver(el);
  }
}
const InfiniteScroll = {
  async mounted(el, binding) {
    const { instance, value: cb } = binding;
    if (!isFunction(cb)) {
      throwError(SCOPE, "'v-infinite-scroll' binding value must be a function");
    }
    await nextTick();
    const { delay, immediate } = getScrollOptions(el, instance);
    const container = getScrollContainer(el, true);
    const containerEl = container === window ? document.documentElement : container;
    const onScroll = throttle(handleScroll.bind(null, el, cb), delay);
    if (!container)
      return;
    el[SCOPE] = {
      instance,
      container,
      containerEl,
      delay,
      cb,
      onScroll,
      lastScrollTop: containerEl.scrollTop
    };
    if (immediate) {
      const observer = new MutationObserver(throttle(checkFull.bind(null, el, cb), CHECK_INTERVAL));
      el[SCOPE].observer = observer;
      observer.observe(el, { childList: true, subtree: true });
      checkFull(el, cb);
    }
    container.addEventListener("scroll", onScroll);
  },
  unmounted(el) {
    const { container, onScroll } = el[SCOPE];
    container == null ? void 0 : container.removeEventListener("scroll", onScroll);
    destroyObserver(el);
  },
  async updated(el) {
    if (!el[SCOPE]) {
      await nextTick();
    } else {
      const { containerEl, cb, observer } = el[SCOPE];
      if (containerEl.clientHeight && observer) {
        checkFull(el, cb);
      }
    }
  }
};

export { CHECK_INTERVAL, DEFAULT_DELAY, DEFAULT_DISTANCE, SCOPE, InfiniteScroll as default };
//# sourceMappingURL=index.mjs.map
