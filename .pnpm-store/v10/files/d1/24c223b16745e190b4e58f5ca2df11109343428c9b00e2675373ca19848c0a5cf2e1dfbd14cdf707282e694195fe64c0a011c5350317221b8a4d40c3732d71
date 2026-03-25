'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../utils/index.js');
require('../../../constants/index.js');
var index = require('../../badge/index.js');
require('../../config-provider/index.js');
var index$1 = require('../../icon/index.js');
var message = require('./message.js');
var instance = require('./instance.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var icon = require('../../../utils/vue/icon.js');
var useGlobalConfig = require('../../config-provider/src/hooks/use-global-config.js');
var aria = require('../../../constants/aria.js');

const _hoisted_1 = ["id"];
const _hoisted_2 = ["innerHTML"];
const __default__ = vue.defineComponent({
  name: "ElMessage"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: message.messageProps,
  emits: message.messageEmits,
  setup(__props, { expose }) {
    const props = __props;
    const { Close } = icon.TypeComponents;
    const { ns, zIndex } = useGlobalConfig.useGlobalComponentSettings("message");
    const { currentZIndex, nextZIndex } = zIndex;
    const messageRef = vue.ref();
    const visible = vue.ref(false);
    const height = vue.ref(0);
    let stopTimer = void 0;
    const badgeType = vue.computed(() => props.type ? props.type === "error" ? "danger" : props.type : "info");
    const typeClass = vue.computed(() => {
      const type = props.type;
      return { [ns.bm("icon", type)]: type && icon.TypeComponentsMap[type] };
    });
    const iconComponent = vue.computed(() => props.icon || icon.TypeComponentsMap[props.type] || "");
    const lastOffset = vue.computed(() => instance.getLastOffset(props.id));
    const offset = vue.computed(() => instance.getOffsetOrSpace(props.id, props.offset) + lastOffset.value);
    const bottom = vue.computed(() => height.value + offset.value);
    const customStyle = vue.computed(() => ({
      top: `${offset.value}px`,
      zIndex: currentZIndex.value
    }));
    function startTimer() {
      if (props.duration === 0)
        return;
      ({ stop: stopTimer } = core.useTimeoutFn(() => {
        close();
      }, props.duration));
    }
    function clearTimer() {
      stopTimer == null ? void 0 : stopTimer();
    }
    function close() {
      visible.value = false;
    }
    function keydown({ code }) {
      if (code === aria.EVENT_CODE.esc) {
        close();
      }
    }
    vue.onMounted(() => {
      startTimer();
      nextZIndex();
      visible.value = true;
    });
    vue.watch(() => props.repeatNum, () => {
      clearTimer();
      startTimer();
    });
    core.useEventListener(document, "keydown", keydown);
    core.useResizeObserver(messageRef, () => {
      height.value = messageRef.value.getBoundingClientRect().height;
    });
    expose({
      visible,
      bottom,
      close
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Transition, {
        name: vue.unref(ns).b("fade"),
        onBeforeLeave: _ctx.onClose,
        onAfterLeave: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("destroy")),
        persisted: ""
      }, {
        default: vue.withCtx(() => [
          vue.withDirectives(vue.createElementVNode("div", {
            id: _ctx.id,
            ref_key: "messageRef",
            ref: messageRef,
            class: vue.normalizeClass([
              vue.unref(ns).b(),
              { [vue.unref(ns).m(_ctx.type)]: _ctx.type && !_ctx.icon },
              vue.unref(ns).is("center", _ctx.center),
              vue.unref(ns).is("closable", _ctx.showClose),
              _ctx.customClass
            ]),
            style: vue.normalizeStyle(vue.unref(customStyle)),
            role: "alert",
            onMouseenter: clearTimer,
            onMouseleave: startTimer
          }, [
            _ctx.repeatNum > 1 ? (vue.openBlock(), vue.createBlock(vue.unref(index.ElBadge), {
              key: 0,
              value: _ctx.repeatNum,
              type: vue.unref(badgeType),
              class: vue.normalizeClass(vue.unref(ns).e("badge"))
            }, null, 8, ["value", "type", "class"])) : vue.createCommentVNode("v-if", true),
            vue.unref(iconComponent) ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
              key: 1,
              class: vue.normalizeClass([vue.unref(ns).e("icon"), vue.unref(typeClass)])
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(iconComponent))))
              ]),
              _: 1
            }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
            vue.renderSlot(_ctx.$slots, "default", {}, () => [
              !_ctx.dangerouslyUseHTMLString ? (vue.openBlock(), vue.createElementBlock("p", {
                key: 0,
                class: vue.normalizeClass(vue.unref(ns).e("content"))
              }, vue.toDisplayString(_ctx.message), 3)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
                vue.createCommentVNode(" Caution here, message could've been compromised, never use user's input as message "),
                vue.createElementVNode("p", {
                  class: vue.normalizeClass(vue.unref(ns).e("content")),
                  innerHTML: _ctx.message
                }, null, 10, _hoisted_2)
              ], 2112))
            ]),
            _ctx.showClose ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
              key: 2,
              class: vue.normalizeClass(vue.unref(ns).e("closeBtn")),
              onClick: vue.withModifiers(close, ["stop"])
            }, {
              default: vue.withCtx(() => [
                vue.createVNode(vue.unref(Close))
              ]),
              _: 1
            }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true)
          ], 46, _hoisted_1), [
            [vue.vShow, visible.value]
          ])
        ]),
        _: 3
      }, 8, ["name", "onBeforeLeave"]);
    };
  }
});
var MessageConstructor = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/message/src/message.vue"]]);

exports["default"] = MessageConstructor;
//# sourceMappingURL=message2.js.map
