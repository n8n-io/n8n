'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../config-provider/index.js');
var style = require('../../../utils/dom/style.js');
var useGlobalConfig = require('../../config-provider/src/hooks/use-global-config.js');

function createLoadingComponent(options) {
  let afterLeaveTimer;
  const afterLeaveFlag = vue.ref(false);
  const data = vue.reactive({
    ...options,
    originalPosition: "",
    originalOverflow: "",
    visible: false
  });
  function setText(text) {
    data.text = text;
  }
  function destroySelf() {
    const target = data.parent;
    const ns = vm.ns;
    if (!target.vLoadingAddClassList) {
      let loadingNumber = target.getAttribute("loading-number");
      loadingNumber = Number.parseInt(loadingNumber) - 1;
      if (!loadingNumber) {
        style.removeClass(target, ns.bm("parent", "relative"));
        target.removeAttribute("loading-number");
      } else {
        target.setAttribute("loading-number", loadingNumber.toString());
      }
      style.removeClass(target, ns.bm("parent", "hidden"));
    }
    removeElLoadingChild();
    loadingInstance.unmount();
  }
  function removeElLoadingChild() {
    var _a, _b;
    (_b = (_a = vm.$el) == null ? void 0 : _a.parentNode) == null ? void 0 : _b.removeChild(vm.$el);
  }
  function close() {
    var _a;
    if (options.beforeClose && !options.beforeClose())
      return;
    afterLeaveFlag.value = true;
    clearTimeout(afterLeaveTimer);
    afterLeaveTimer = window.setTimeout(handleAfterLeave, 400);
    data.visible = false;
    (_a = options.closed) == null ? void 0 : _a.call(options);
  }
  function handleAfterLeave() {
    if (!afterLeaveFlag.value)
      return;
    const target = data.parent;
    afterLeaveFlag.value = false;
    target.vLoadingAddClassList = void 0;
    destroySelf();
  }
  const elLoadingComponent = vue.defineComponent({
    name: "ElLoading",
    setup(_, { expose }) {
      const { ns, zIndex } = useGlobalConfig.useGlobalComponentSettings("loading");
      expose({
        ns,
        zIndex
      });
      return () => {
        const svg = data.spinner || data.svg;
        const spinner = vue.h("svg", {
          class: "circular",
          viewBox: data.svgViewBox ? data.svgViewBox : "0 0 50 50",
          ...svg ? { innerHTML: svg } : {}
        }, [
          vue.h("circle", {
            class: "path",
            cx: "25",
            cy: "25",
            r: "20",
            fill: "none"
          })
        ]);
        const spinnerText = data.text ? vue.h("p", { class: ns.b("text") }, [data.text]) : void 0;
        return vue.h(vue.Transition, {
          name: ns.b("fade"),
          onAfterLeave: handleAfterLeave
        }, {
          default: vue.withCtx(() => [
            vue.withDirectives(vue.createVNode("div", {
              style: {
                backgroundColor: data.background || ""
              },
              class: [
                ns.b("mask"),
                data.customClass,
                data.fullscreen ? "is-fullscreen" : ""
              ]
            }, [
              vue.h("div", {
                class: ns.b("spinner")
              }, [spinner, spinnerText])
            ]), [[vue.vShow, data.visible]])
          ])
        });
      };
    }
  });
  const loadingInstance = vue.createApp(elLoadingComponent);
  const vm = loadingInstance.mount(document.createElement("div"));
  return {
    ...vue.toRefs(data),
    setText,
    removeElLoadingChild,
    close,
    handleAfterLeave,
    vm,
    get $el() {
      return vm.$el;
    }
  };
}

exports.createLoadingComponent = createLoadingComponent;
//# sourceMappingURL=loading.js.map
