'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../form/index.js');
var constants = require('./constants.js');
var uploadList = require('./upload-list2.js');
var uploadContent = require('./upload-content2.js');
var useHandlers = require('./use-handlers.js');
var upload = require('./upload.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');

const __default__ = vue.defineComponent({
  name: "ElUpload"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: upload.uploadProps,
  setup(__props, { expose }) {
    const props = __props;
    const disabled = useFormCommonProps.useFormDisabled();
    const uploadRef = vue.shallowRef();
    const {
      abort,
      submit,
      clearFiles,
      uploadFiles,
      handleStart,
      handleError,
      handleRemove,
      handleSuccess,
      handleProgress,
      revokeFileObjectURL
    } = useHandlers.useHandlers(props, uploadRef);
    const isPictureCard = vue.computed(() => props.listType === "picture-card");
    const uploadContentProps = vue.computed(() => ({
      ...props,
      fileList: uploadFiles.value,
      onStart: handleStart,
      onProgress: handleProgress,
      onSuccess: handleSuccess,
      onError: handleError,
      onRemove: handleRemove
    }));
    vue.onBeforeUnmount(() => {
      uploadFiles.value.forEach(revokeFileObjectURL);
    });
    vue.provide(constants.uploadContextKey, {
      accept: vue.toRef(props, "accept")
    });
    expose({
      abort,
      submit,
      clearFiles,
      handleStart,
      handleRemove
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", null, [
        vue.unref(isPictureCard) && _ctx.showFileList ? (vue.openBlock(), vue.createBlock(uploadList["default"], {
          key: 0,
          disabled: vue.unref(disabled),
          "list-type": _ctx.listType,
          files: vue.unref(uploadFiles),
          "handle-preview": _ctx.onPreview,
          onRemove: vue.unref(handleRemove)
        }, vue.createSlots({
          append: vue.withCtx(() => [
            vue.createVNode(uploadContent["default"], vue.mergeProps({
              ref_key: "uploadRef",
              ref: uploadRef
            }, vue.unref(uploadContentProps)), {
              default: vue.withCtx(() => [
                _ctx.$slots.trigger ? vue.renderSlot(_ctx.$slots, "trigger", { key: 0 }) : vue.createCommentVNode("v-if", true),
                !_ctx.$slots.trigger && _ctx.$slots.default ? vue.renderSlot(_ctx.$slots, "default", { key: 1 }) : vue.createCommentVNode("v-if", true)
              ]),
              _: 3
            }, 16)
          ]),
          _: 2
        }, [
          _ctx.$slots.file ? {
            name: "default",
            fn: vue.withCtx(({ file }) => [
              vue.renderSlot(_ctx.$slots, "file", { file })
            ])
          } : void 0
        ]), 1032, ["disabled", "list-type", "files", "handle-preview", "onRemove"])) : vue.createCommentVNode("v-if", true),
        !vue.unref(isPictureCard) || vue.unref(isPictureCard) && !_ctx.showFileList ? (vue.openBlock(), vue.createBlock(uploadContent["default"], vue.mergeProps({
          key: 1,
          ref_key: "uploadRef",
          ref: uploadRef
        }, vue.unref(uploadContentProps)), {
          default: vue.withCtx(() => [
            _ctx.$slots.trigger ? vue.renderSlot(_ctx.$slots, "trigger", { key: 0 }) : vue.createCommentVNode("v-if", true),
            !_ctx.$slots.trigger && _ctx.$slots.default ? vue.renderSlot(_ctx.$slots, "default", { key: 1 }) : vue.createCommentVNode("v-if", true)
          ]),
          _: 3
        }, 16)) : vue.createCommentVNode("v-if", true),
        _ctx.$slots.trigger ? vue.renderSlot(_ctx.$slots, "default", { key: 2 }) : vue.createCommentVNode("v-if", true),
        vue.renderSlot(_ctx.$slots, "tip"),
        !vue.unref(isPictureCard) && _ctx.showFileList ? (vue.openBlock(), vue.createBlock(uploadList["default"], {
          key: 3,
          disabled: vue.unref(disabled),
          "list-type": _ctx.listType,
          files: vue.unref(uploadFiles),
          "handle-preview": _ctx.onPreview,
          onRemove: vue.unref(handleRemove)
        }, vue.createSlots({ _: 2 }, [
          _ctx.$slots.file ? {
            name: "default",
            fn: vue.withCtx(({ file }) => [
              vue.renderSlot(_ctx.$slots, "file", { file })
            ])
          } : void 0
        ]), 1032, ["disabled", "list-type", "files", "handle-preview", "onRemove"])) : vue.createCommentVNode("v-if", true)
      ]);
    };
  }
});
var Upload = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/upload/src/upload.vue"]]);

exports["default"] = Upload;
//# sourceMappingURL=upload2.js.map
