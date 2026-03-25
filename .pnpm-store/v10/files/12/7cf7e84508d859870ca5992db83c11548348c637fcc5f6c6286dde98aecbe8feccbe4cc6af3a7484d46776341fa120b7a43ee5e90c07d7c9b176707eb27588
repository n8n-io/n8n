'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../utils/index.js');
require('../../../constants/index.js');
var index = require('../../icon/index.js');
require('../../config-provider/index.js');
var notification = require('./notification.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useGlobalConfig = require('../../config-provider/src/hooks/use-global-config.js');
var icon = require('../../../utils/vue/icon.js');
var aria = require('../../../constants/aria.js');

const _hoisted_1 = ["id"];
const _hoisted_2 = ["textContent"];
const _hoisted_3 = { key: 0 };
const _hoisted_4 = ["innerHTML"];
const __default__ = vue.defineComponent({
  name: "ElNotification"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: notification.notificationProps,
  emits: notification.notificationEmits,
  setup(__props, { expose }) {
    const props = __props;
    const { ns, zIndex } = useGlobalConfig.useGlobalComponentSettings("notification");
    const { nextZIndex, currentZIndex } = zIndex;
    const { Close } = icon.CloseComponents;
    const visible = vue.ref(false);
    let timer = void 0;
    const typeClass = vue.computed(() => {
      const type = props.type;
      return type && icon.TypeComponentsMap[props.type] ? ns.m(type) : "";
    });
    const iconComponent = vue.computed(() => {
      if (!props.type)
        return props.icon;
      return icon.TypeComponentsMap[props.type] || props.icon;
    });
    const horizontalClass = vue.computed(() => props.position.endsWith("right") ? "right" : "left");
    const verticalProperty = vue.computed(() => props.position.startsWith("top") ? "top" : "bottom");
    const positionStyle = vue.computed(() => {
      var _a;
      return {
        [verticalProperty.value]: `${props.offset}px`,
        zIndex: (_a = props.zIndex) != null ? _a : currentZIndex.value
      };
    });
    function startTimer() {
      if (props.duration > 0) {
        ;
        ({ stop: timer } = core.useTimeoutFn(() => {
          if (visible.value)
            close();
        }, props.duration));
      }
    }
    function clearTimer() {
      timer == null ? void 0 : timer();
    }
    function close() {
      visible.value = false;
    }
    function onKeydown({ code }) {
      if (code === aria.EVENT_CODE.delete || code === aria.EVENT_CODE.backspace) {
        clearTimer();
      } else if (code === aria.EVENT_CODE.esc) {
        if (visible.value) {
          close();
        }
      } else {
        startTimer();
      }
    }
    vue.onMounted(() => {
      startTimer();
      nextZIndex();
      visible.value = true;
    });
    core.useEventListener(document, "keydown", onKeydown);
    expose({
      visible,
      close
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Transition, {
        name: vue.unref(ns).b("fade"),
        onBeforeLeave: _ctx.onClose,
        onAfterLeave: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("destroy")),
        persisted: ""
      }, {
        default: vue.withCtx(() => [
          vue.withDirectives(vue.createElementVNode("div", {
            id: _ctx.id,
            class: vue.normalizeClass([vue.unref(ns).b(), _ctx.customClass, vue.unref(horizontalClass)]),
            style: vue.normalizeStyle(vue.unref(positionStyle)),
            role: "alert",
            onMouseenter: clearTimer,
            onMouseleave: startTimer,
            onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick && _ctx.onClick(...args))
          }, [
            vue.unref(iconComponent) ? (vue.openBlock(), vue.createBlock(vue.unref(index.ElIcon), {
              key: 0,
              class: vue.normalizeClass([vue.unref(ns).e("icon"), vue.unref(typeClass)])
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(iconComponent))))
              ]),
              _: 1
            }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("group"))
            }, [
              vue.createElementVNode("h2", {
                class: vue.normalizeClass(vue.unref(ns).e("title")),
                textContent: vue.toDisplayString(_ctx.title)
              }, null, 10, _hoisted_2),
              vue.withDirectives(vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(ns).e("content")),
                style: vue.normalizeStyle(!!_ctx.title ? void 0 : { margin: 0 })
              }, [
                vue.renderSlot(_ctx.$slots, "default", {}, () => [
                  !_ctx.dangerouslyUseHTMLString ? (vue.openBlock(), vue.createElementBlock("p", _hoisted_3, vue.toDisplayString(_ctx.message), 1)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
                    vue.createCommentVNode(" Caution here, message could've been compromised, never use user's input as message "),
                    vue.createElementVNode("p", { innerHTML: _ctx.message }, null, 8, _hoisted_4)
                  ], 2112))
                ])
              ], 6), [
                [vue.vShow, _ctx.message]
              ]),
              _ctx.showClose ? (vue.openBlock(), vue.createBlock(vue.unref(index.ElIcon), {
                key: 0,
                class: vue.normalizeClass(vue.unref(ns).e("closeBtn")),
                onClick: vue.withModifiers(close, ["stop"])
              }, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(Close))
                ]),
                _: 1
              }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true)
            ], 2)
          ], 46, _hoisted_1), [
            [vue.vShow, visible.value]
          ])
        ]),
        _: 3
      }, 8, ["name", "onBeforeLeave"]);
    };
  }
});
var NotificationConstructor = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/notification/src/notification.vue"]]);

exports["default"] = NotificationConstructor;
//# sourceMappingURL=notification2.js.map
