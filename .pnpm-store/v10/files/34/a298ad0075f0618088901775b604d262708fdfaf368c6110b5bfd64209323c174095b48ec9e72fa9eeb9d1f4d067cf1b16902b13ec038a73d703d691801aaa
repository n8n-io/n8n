import { shallowRef, ref, onMounted } from 'vue';
import { useThrottleFn, useEventListener } from '@vueuse/core';
import '../../../utils/index.mjs';
import { throwError } from '../../../utils/error.mjs';

const useBackTop = (props, emit, componentName) => {
  const el = shallowRef();
  const container = shallowRef();
  const visible = ref(false);
  const handleScroll = () => {
    if (el.value)
      visible.value = el.value.scrollTop >= props.visibilityHeight;
  };
  const handleClick = (event) => {
    var _a;
    (_a = el.value) == null ? void 0 : _a.scrollTo({ top: 0, behavior: "smooth" });
    emit("click", event);
  };
  const handleScrollThrottled = useThrottleFn(handleScroll, 300, true);
  useEventListener(container, "scroll", handleScrollThrottled);
  onMounted(() => {
    var _a;
    container.value = document;
    el.value = document.documentElement;
    if (props.target) {
      el.value = (_a = document.querySelector(props.target)) != null ? _a : void 0;
      if (!el.value) {
        throwError(componentName, `target does not exist: ${props.target}`);
      }
      container.value = el.value;
    }
    handleScroll();
  });
  return {
    visible,
    handleClick
  };
};

export { useBackTop };
//# sourceMappingURL=use-backtop.mjs.map
