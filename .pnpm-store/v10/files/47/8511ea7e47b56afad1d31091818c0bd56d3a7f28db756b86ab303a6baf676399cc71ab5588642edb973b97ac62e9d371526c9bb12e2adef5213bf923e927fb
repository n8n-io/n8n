import { ref, isRef } from 'vue';
import { isObject, isString, hyphenate } from '@vue/shared';
import { Loading } from './service.mjs';

const INSTANCE_KEY = Symbol("ElLoading");
const createInstance = (el, binding) => {
  var _a, _b, _c, _d;
  const vm = binding.instance;
  const getBindingProp = (key) => isObject(binding.value) ? binding.value[key] : void 0;
  const resolveExpression = (key) => {
    const data = isString(key) && (vm == null ? void 0 : vm[key]) || key;
    if (data)
      return ref(data);
    else
      return data;
  };
  const getProp = (name) => resolveExpression(getBindingProp(name) || el.getAttribute(`element-loading-${hyphenate(name)}`));
  const fullscreen = (_a = getBindingProp("fullscreen")) != null ? _a : binding.modifiers.fullscreen;
  const options = {
    text: getProp("text"),
    svg: getProp("svg"),
    svgViewBox: getProp("svgViewBox"),
    spinner: getProp("spinner"),
    background: getProp("background"),
    customClass: getProp("customClass"),
    fullscreen,
    target: (_b = getBindingProp("target")) != null ? _b : fullscreen ? void 0 : el,
    body: (_c = getBindingProp("body")) != null ? _c : binding.modifiers.body,
    lock: (_d = getBindingProp("lock")) != null ? _d : binding.modifiers.lock
  };
  el[INSTANCE_KEY] = {
    options,
    instance: Loading(options)
  };
};
const updateOptions = (newOptions, originalOptions) => {
  for (const key of Object.keys(originalOptions)) {
    if (isRef(originalOptions[key]))
      originalOptions[key].value = newOptions[key];
  }
};
const vLoading = {
  mounted(el, binding) {
    if (binding.value) {
      createInstance(el, binding);
    }
  },
  updated(el, binding) {
    const instance = el[INSTANCE_KEY];
    if (binding.oldValue !== binding.value) {
      if (binding.value && !binding.oldValue) {
        createInstance(el, binding);
      } else if (binding.value && binding.oldValue) {
        if (isObject(binding.value))
          updateOptions(binding.value, instance.options);
      } else {
        instance == null ? void 0 : instance.instance.close();
      }
    }
  },
  unmounted(el) {
    var _a;
    (_a = el[INSTANCE_KEY]) == null ? void 0 : _a.instance.close();
  }
};

export { vLoading };
//# sourceMappingURL=directive.mjs.map
