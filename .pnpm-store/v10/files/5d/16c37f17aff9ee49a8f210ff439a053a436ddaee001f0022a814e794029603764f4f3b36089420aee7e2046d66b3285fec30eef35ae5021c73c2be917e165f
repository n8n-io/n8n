'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../form/index.js');
var error = require('../../../utils/error.js');
var constants = require('./constants.js');
var uploadDragger = require('./upload-dragger.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');

const _hoisted_1 = ["onDrop", "onDragover"];
const COMPONENT_NAME = "ElUploadDrag";
const __default__ = vue.defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: uploadDragger.uploadDraggerProps,
  emits: uploadDragger.uploadDraggerEmits,
  setup(__props, { emit }) {
    const uploaderContext = vue.inject(constants.uploadContextKey);
    if (!uploaderContext) {
      error.throwError(COMPONENT_NAME, "usage: <el-upload><el-upload-dragger /></el-upload>");
    }
    const ns = index.useNamespace("upload");
    const dragover = vue.ref(false);
    const disabled = useFormCommonProps.useFormDisabled();
    const onDrop = (e) => {
      if (disabled.value)
        return;
      dragover.value = false;
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      const accept = uploaderContext.accept.value;
      if (!accept) {
        emit("file", files);
        return;
      }
      const filesFiltered = files.filter((file) => {
        const { type, name } = file;
        const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
        const baseType = type.replace(/\/.*$/, "");
        return accept.split(",").map((type2) => type2.trim()).filter((type2) => type2).some((acceptedType) => {
          if (acceptedType.startsWith(".")) {
            return extension === acceptedType;
          }
          if (/\/\*$/.test(acceptedType)) {
            return baseType === acceptedType.replace(/\/\*$/, "");
          }
          if (/^[^/]+\/[^/]+$/.test(acceptedType)) {
            return type === acceptedType;
          }
          return false;
        });
      });
      emit("file", filesFiltered);
    };
    const onDragover = () => {
      if (!disabled.value)
        dragover.value = true;
    };
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b("dragger"), vue.unref(ns).is("dragover", dragover.value)]),
        onDrop: vue.withModifiers(onDrop, ["prevent"]),
        onDragover: vue.withModifiers(onDragover, ["prevent"]),
        onDragleave: _cache[0] || (_cache[0] = vue.withModifiers(($event) => dragover.value = false, ["prevent"]))
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 42, _hoisted_1);
    };
  }
});
var UploadDragger = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/upload/src/upload-dragger.vue"]]);

exports["default"] = UploadDragger;
//# sourceMappingURL=upload-dragger2.js.map
