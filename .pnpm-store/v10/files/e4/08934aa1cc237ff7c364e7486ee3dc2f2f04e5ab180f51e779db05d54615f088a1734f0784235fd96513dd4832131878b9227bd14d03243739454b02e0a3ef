'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$2 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
var index$3 = require('../../progress/index.js');
require('../../form/index.js');
var uploadList = require('./upload-list.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');

const _hoisted_1 = ["onKeydown"];
const _hoisted_2 = ["src"];
const _hoisted_3 = ["onClick"];
const _hoisted_4 = ["title"];
const _hoisted_5 = ["onClick"];
const _hoisted_6 = ["onClick"];
const __default__ = vue.defineComponent({
  name: "ElUploadList"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: uploadList.uploadListProps,
  emits: uploadList.uploadListEmits,
  setup(__props, { emit }) {
    const props = __props;
    const { t } = index.useLocale();
    const nsUpload = index$1.useNamespace("upload");
    const nsIcon = index$1.useNamespace("icon");
    const nsList = index$1.useNamespace("list");
    const disabled = useFormCommonProps.useFormDisabled();
    const focusing = vue.ref(false);
    const containerKls = vue.computed(() => [
      nsUpload.b("list"),
      nsUpload.bm("list", props.listType),
      nsUpload.is("disabled", props.disabled)
    ]);
    const handleRemove = (file) => {
      emit("remove", file);
    };
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.TransitionGroup, {
        tag: "ul",
        class: vue.normalizeClass(vue.unref(containerKls)),
        name: vue.unref(nsList).b()
      }, {
        default: vue.withCtx(() => [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.files, (file) => {
            return vue.openBlock(), vue.createElementBlock("li", {
              key: file.uid || file.name,
              class: vue.normalizeClass([
                vue.unref(nsUpload).be("list", "item"),
                vue.unref(nsUpload).is(file.status),
                { focusing: focusing.value }
              ]),
              tabindex: "0",
              onKeydown: vue.withKeys(($event) => !vue.unref(disabled) && handleRemove(file), ["delete"]),
              onFocus: _cache[0] || (_cache[0] = ($event) => focusing.value = true),
              onBlur: _cache[1] || (_cache[1] = ($event) => focusing.value = false),
              onClick: _cache[2] || (_cache[2] = ($event) => focusing.value = false)
            }, [
              vue.renderSlot(_ctx.$slots, "default", { file }, () => [
                _ctx.listType === "picture" || file.status !== "uploading" && _ctx.listType === "picture-card" ? (vue.openBlock(), vue.createElementBlock("img", {
                  key: 0,
                  class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-thumbnail")),
                  src: file.url,
                  alt: ""
                }, null, 10, _hoisted_2)) : vue.createCommentVNode("v-if", true),
                file.status === "uploading" || _ctx.listType !== "picture-card" ? (vue.openBlock(), vue.createElementBlock("div", {
                  key: 1,
                  class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-info"))
                }, [
                  vue.createElementVNode("a", {
                    class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-name")),
                    onClick: vue.withModifiers(($event) => _ctx.handlePreview(file), ["prevent"])
                  }, [
                    vue.createVNode(vue.unref(index$2.ElIcon), {
                      class: vue.normalizeClass(vue.unref(nsIcon).m("document"))
                    }, {
                      default: vue.withCtx(() => [
                        vue.createVNode(vue.unref(iconsVue.Document))
                      ]),
                      _: 1
                    }, 8, ["class"]),
                    vue.createElementVNode("span", {
                      class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-file-name")),
                      title: file.name
                    }, vue.toDisplayString(file.name), 11, _hoisted_4)
                  ], 10, _hoisted_3),
                  file.status === "uploading" ? (vue.openBlock(), vue.createBlock(vue.unref(index$3.ElProgress), {
                    key: 0,
                    type: _ctx.listType === "picture-card" ? "circle" : "line",
                    "stroke-width": _ctx.listType === "picture-card" ? 6 : 2,
                    percentage: Number(file.percentage),
                    style: vue.normalizeStyle(_ctx.listType === "picture-card" ? "" : "margin-top: 0.5rem")
                  }, null, 8, ["type", "stroke-width", "percentage", "style"])) : vue.createCommentVNode("v-if", true)
                ], 2)) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("label", {
                  class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-status-label"))
                }, [
                  _ctx.listType === "text" ? (vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), {
                    key: 0,
                    class: vue.normalizeClass([vue.unref(nsIcon).m("upload-success"), vue.unref(nsIcon).m("circle-check")])
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.CircleCheck))
                    ]),
                    _: 1
                  }, 8, ["class"])) : ["picture-card", "picture"].includes(_ctx.listType) ? (vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), {
                    key: 1,
                    class: vue.normalizeClass([vue.unref(nsIcon).m("upload-success"), vue.unref(nsIcon).m("check")])
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.Check))
                    ]),
                    _: 1
                  }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
                ], 2),
                !vue.unref(disabled) ? (vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), {
                  key: 2,
                  class: vue.normalizeClass(vue.unref(nsIcon).m("close")),
                  onClick: ($event) => handleRemove(file)
                }, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(iconsVue.Close))
                  ]),
                  _: 2
                }, 1032, ["class", "onClick"])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" Due to close btn only appears when li gets focused disappears after li gets blurred, thus keyboard navigation can never reach close btn"),
                vue.createCommentVNode(" This is a bug which needs to be fixed "),
                vue.createCommentVNode(" TODO: Fix the incorrect navigation interaction "),
                !vue.unref(disabled) ? (vue.openBlock(), vue.createElementBlock("i", {
                  key: 3,
                  class: vue.normalizeClass(vue.unref(nsIcon).m("close-tip"))
                }, vue.toDisplayString(vue.unref(t)("el.upload.deleteTip")), 3)) : vue.createCommentVNode("v-if", true),
                _ctx.listType === "picture-card" ? (vue.openBlock(), vue.createElementBlock("span", {
                  key: 4,
                  class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-actions"))
                }, [
                  vue.createElementVNode("span", {
                    class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-preview")),
                    onClick: ($event) => _ctx.handlePreview(file)
                  }, [
                    vue.createVNode(vue.unref(index$2.ElIcon), {
                      class: vue.normalizeClass(vue.unref(nsIcon).m("zoom-in"))
                    }, {
                      default: vue.withCtx(() => [
                        vue.createVNode(vue.unref(iconsVue.ZoomIn))
                      ]),
                      _: 1
                    }, 8, ["class"])
                  ], 10, _hoisted_5),
                  !vue.unref(disabled) ? (vue.openBlock(), vue.createElementBlock("span", {
                    key: 0,
                    class: vue.normalizeClass(vue.unref(nsUpload).be("list", "item-delete")),
                    onClick: ($event) => handleRemove(file)
                  }, [
                    vue.createVNode(vue.unref(index$2.ElIcon), {
                      class: vue.normalizeClass(vue.unref(nsIcon).m("delete"))
                    }, {
                      default: vue.withCtx(() => [
                        vue.createVNode(vue.unref(iconsVue.Delete))
                      ]),
                      _: 1
                    }, 8, ["class"])
                  ], 10, _hoisted_6)) : vue.createCommentVNode("v-if", true)
                ], 2)) : vue.createCommentVNode("v-if", true)
              ])
            ], 42, _hoisted_1);
          }), 128)),
          vue.renderSlot(_ctx.$slots, "append")
        ]),
        _: 3
      }, 8, ["class", "name"]);
    };
  }
});
var UploadList = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/upload/src/upload-list.vue"]]);

exports["default"] = UploadList;
//# sourceMappingURL=upload-list2.js.map
