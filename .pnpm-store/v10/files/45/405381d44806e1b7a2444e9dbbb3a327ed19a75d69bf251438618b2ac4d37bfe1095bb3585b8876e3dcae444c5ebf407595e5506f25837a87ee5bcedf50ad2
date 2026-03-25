import { nextTick } from 'vue';
import '../../../utils/index.mjs';
import { createLoadingComponent } from './loading.mjs';
import { isClient } from '@vueuse/core';
import { isString } from '@vue/shared';
import { getStyle, addClass, removeClass } from '../../../utils/dom/style.mjs';

let fullscreenInstance = void 0;
const Loading = function(options = {}) {
  if (!isClient)
    return void 0;
  const resolved = resolveOptions(options);
  if (resolved.fullscreen && fullscreenInstance) {
    return fullscreenInstance;
  }
  const instance = createLoadingComponent({
    ...resolved,
    closed: () => {
      var _a;
      (_a = resolved.closed) == null ? void 0 : _a.call(resolved);
      if (resolved.fullscreen)
        fullscreenInstance = void 0;
    }
  });
  addStyle(resolved, resolved.parent, instance);
  addClassList(resolved, resolved.parent, instance);
  resolved.parent.vLoadingAddClassList = () => addClassList(resolved, resolved.parent, instance);
  let loadingNumber = resolved.parent.getAttribute("loading-number");
  if (!loadingNumber) {
    loadingNumber = "1";
  } else {
    loadingNumber = `${Number.parseInt(loadingNumber) + 1}`;
  }
  resolved.parent.setAttribute("loading-number", loadingNumber);
  resolved.parent.appendChild(instance.$el);
  nextTick(() => instance.visible.value = resolved.visible);
  if (resolved.fullscreen) {
    fullscreenInstance = instance;
  }
  return instance;
};
const resolveOptions = (options) => {
  var _a, _b, _c, _d;
  let target;
  if (isString(options.target)) {
    target = (_a = document.querySelector(options.target)) != null ? _a : document.body;
  } else {
    target = options.target || document.body;
  }
  return {
    parent: target === document.body || options.body ? document.body : target,
    background: options.background || "",
    svg: options.svg || "",
    svgViewBox: options.svgViewBox || "",
    spinner: options.spinner || false,
    text: options.text || "",
    fullscreen: target === document.body && ((_b = options.fullscreen) != null ? _b : true),
    lock: (_c = options.lock) != null ? _c : false,
    customClass: options.customClass || "",
    visible: (_d = options.visible) != null ? _d : true,
    target
  };
};
const addStyle = async (options, parent, instance) => {
  const { nextZIndex } = instance.vm.zIndex || instance.vm._.exposed.zIndex;
  const maskStyle = {};
  if (options.fullscreen) {
    instance.originalPosition.value = getStyle(document.body, "position");
    instance.originalOverflow.value = getStyle(document.body, "overflow");
    maskStyle.zIndex = nextZIndex();
  } else if (options.parent === document.body) {
    instance.originalPosition.value = getStyle(document.body, "position");
    await nextTick();
    for (const property of ["top", "left"]) {
      const scroll = property === "top" ? "scrollTop" : "scrollLeft";
      maskStyle[property] = `${options.target.getBoundingClientRect()[property] + document.body[scroll] + document.documentElement[scroll] - Number.parseInt(getStyle(document.body, `margin-${property}`), 10)}px`;
    }
    for (const property of ["height", "width"]) {
      maskStyle[property] = `${options.target.getBoundingClientRect()[property]}px`;
    }
  } else {
    instance.originalPosition.value = getStyle(parent, "position");
  }
  for (const [key, value] of Object.entries(maskStyle)) {
    instance.$el.style[key] = value;
  }
};
const addClassList = (options, parent, instance) => {
  const ns = instance.vm.ns || instance.vm._.exposed.ns;
  if (!["absolute", "fixed", "sticky"].includes(instance.originalPosition.value)) {
    addClass(parent, ns.bm("parent", "relative"));
  } else {
    removeClass(parent, ns.bm("parent", "relative"));
  }
  if (options.fullscreen && options.lock) {
    addClass(parent, ns.bm("parent", "hidden"));
  } else {
    removeClass(parent, ns.bm("parent", "hidden"));
  }
};

export { Loading };
//# sourceMappingURL=service.mjs.map
