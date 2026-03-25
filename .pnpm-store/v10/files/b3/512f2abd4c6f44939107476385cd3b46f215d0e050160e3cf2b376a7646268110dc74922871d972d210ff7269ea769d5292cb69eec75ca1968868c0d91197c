import { defineComponent, ref, computed, onMounted, openBlock, createBlock, Transition, unref, withCtx, withDirectives, createElementVNode, normalizeClass, normalizeStyle, resolveDynamicComponent, createCommentVNode, toDisplayString, renderSlot, createElementBlock, Fragment, vShow, withModifiers, createVNode } from 'vue';
import { useTimeoutFn, useEventListener } from '@vueuse/core';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../config-provider/index.mjs';
import { notificationProps, notificationEmits } from './notification.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useGlobalComponentSettings } from '../../config-provider/src/hooks/use-global-config.mjs';
import { CloseComponents, TypeComponentsMap } from '../../../utils/vue/icon.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';

const _hoisted_1 = ["id"];
const _hoisted_2 = ["textContent"];
const _hoisted_3 = { key: 0 };
const _hoisted_4 = ["innerHTML"];
const __default__ = defineComponent({
  name: "ElNotification"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: notificationProps,
  emits: notificationEmits,
  setup(__props, { expose }) {
    const props = __props;
    const { ns, zIndex } = useGlobalComponentSettings("notification");
    const { nextZIndex, currentZIndex } = zIndex;
    const { Close } = CloseComponents;
    const visible = ref(false);
    let timer = void 0;
    const typeClass = computed(() => {
      const type = props.type;
      return type && TypeComponentsMap[props.type] ? ns.m(type) : "";
    });
    const iconComponent = computed(() => {
      if (!props.type)
        return props.icon;
      return TypeComponentsMap[props.type] || props.icon;
    });
    const horizontalClass = computed(() => props.position.endsWith("right") ? "right" : "left");
    const verticalProperty = computed(() => props.position.startsWith("top") ? "top" : "bottom");
    const positionStyle = computed(() => {
      var _a;
      return {
        [verticalProperty.value]: `${props.offset}px`,
        zIndex: (_a = props.zIndex) != null ? _a : currentZIndex.value
      };
    });
    function startTimer() {
      if (props.duration > 0) {
        ;
        ({ stop: timer } = useTimeoutFn(() => {
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
      if (code === EVENT_CODE.delete || code === EVENT_CODE.backspace) {
        clearTimer();
      } else if (code === EVENT_CODE.esc) {
        if (visible.value) {
          close();
        }
      } else {
        startTimer();
      }
    }
    onMounted(() => {
      startTimer();
      nextZIndex();
      visible.value = true;
    });
    useEventListener(document, "keydown", onKeydown);
    expose({
      visible,
      close
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, {
        name: unref(ns).b("fade"),
        onBeforeLeave: _ctx.onClose,
        onAfterLeave: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("destroy")),
        persisted: ""
      }, {
        default: withCtx(() => [
          withDirectives(createElementVNode("div", {
            id: _ctx.id,
            class: normalizeClass([unref(ns).b(), _ctx.customClass, unref(horizontalClass)]),
            style: normalizeStyle(unref(positionStyle)),
            role: "alert",
            onMouseenter: clearTimer,
            onMouseleave: startTimer,
            onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick && _ctx.onClick(...args))
          }, [
            unref(iconComponent) ? (openBlock(), createBlock(unref(ElIcon), {
              key: 0,
              class: normalizeClass([unref(ns).e("icon"), unref(typeClass)])
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(unref(iconComponent))))
              ]),
              _: 1
            }, 8, ["class"])) : createCommentVNode("v-if", true),
            createElementVNode("div", {
              class: normalizeClass(unref(ns).e("group"))
            }, [
              createElementVNode("h2", {
                class: normalizeClass(unref(ns).e("title")),
                textContent: toDisplayString(_ctx.title)
              }, null, 10, _hoisted_2),
              withDirectives(createElementVNode("div", {
                class: normalizeClass(unref(ns).e("content")),
                style: normalizeStyle(!!_ctx.title ? void 0 : { margin: 0 })
              }, [
                renderSlot(_ctx.$slots, "default", {}, () => [
                  !_ctx.dangerouslyUseHTMLString ? (openBlock(), createElementBlock("p", _hoisted_3, toDisplayString(_ctx.message), 1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createCommentVNode(" Caution here, message could've been compromised, never use user's input as message "),
                    createElementVNode("p", { innerHTML: _ctx.message }, null, 8, _hoisted_4)
                  ], 2112))
                ])
              ], 6), [
                [vShow, _ctx.message]
              ]),
              _ctx.showClose ? (openBlock(), createBlock(unref(ElIcon), {
                key: 0,
                class: normalizeClass(unref(ns).e("closeBtn")),
                onClick: withModifiers(close, ["stop"])
              }, {
                default: withCtx(() => [
                  createVNode(unref(Close))
                ]),
                _: 1
              }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true)
            ], 2)
          ], 46, _hoisted_1), [
            [vShow, visible.value]
          ])
        ]),
        _: 3
      }, 8, ["name", "onBeforeLeave"]);
    };
  }
});
var NotificationConstructor = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/notification/src/notification.vue"]]);

export { NotificationConstructor as default };
//# sourceMappingURL=notification2.mjs.map
