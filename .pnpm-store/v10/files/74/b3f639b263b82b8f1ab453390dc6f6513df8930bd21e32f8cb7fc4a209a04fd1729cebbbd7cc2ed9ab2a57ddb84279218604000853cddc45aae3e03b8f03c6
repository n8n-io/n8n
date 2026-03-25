'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
var lodashUnified = require('lodash-unified');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../form/index.js');
var uploadDragger = require('./upload-dragger2.js');
var uploadContent = require('./upload-content.js');
var upload = require('./upload.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var objects = require('../../../utils/objects.js');

const _hoisted_1 = ["onKeydown"];
const _hoisted_2 = ["name", "multiple", "accept"];
const __default__ = vue.defineComponent({
  name: "ElUploadContent",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: uploadContent.uploadContentProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("upload");
    const disabled = useFormCommonProps.useFormDisabled();
    const requests = vue.shallowRef({});
    const inputRef = vue.shallowRef();
    const uploadFiles = (files) => {
      if (files.length === 0)
        return;
      const { autoUpload, limit, fileList, multiple, onStart, onExceed } = props;
      if (limit && fileList.length + files.length > limit) {
        onExceed(files, fileList);
        return;
      }
      if (!multiple) {
        files = files.slice(0, 1);
      }
      for (const file of files) {
        const rawFile = file;
        rawFile.uid = upload.genFileId();
        onStart(rawFile);
        if (autoUpload)
          upload$1(rawFile);
      }
    };
    const upload$1 = async (rawFile) => {
      inputRef.value.value = "";
      if (!props.beforeUpload) {
        return doUpload(rawFile);
      }
      let hookResult;
      let beforeData = {};
      try {
        const originData = props.data;
        const beforeUploadPromise = props.beforeUpload(rawFile);
        beforeData = shared.isPlainObject(props.data) ? lodashUnified.cloneDeep(props.data) : props.data;
        hookResult = await beforeUploadPromise;
        if (shared.isPlainObject(props.data) && lodashUnified.isEqual(originData, beforeData)) {
          beforeData = lodashUnified.cloneDeep(props.data);
        }
      } catch (e) {
        hookResult = false;
      }
      if (hookResult === false) {
        props.onRemove(rawFile);
        return;
      }
      let file = rawFile;
      if (hookResult instanceof Blob) {
        if (hookResult instanceof File) {
          file = hookResult;
        } else {
          file = new File([hookResult], rawFile.name, {
            type: rawFile.type
          });
        }
      }
      doUpload(Object.assign(file, {
        uid: rawFile.uid
      }), beforeData);
    };
    const resolveData = async (data, rawFile) => {
      if (shared.isFunction(data)) {
        return data(rawFile);
      }
      return data;
    };
    const doUpload = async (rawFile, beforeData) => {
      const {
        headers,
        data,
        method,
        withCredentials,
        name: filename,
        action,
        onProgress,
        onSuccess,
        onError,
        httpRequest
      } = props;
      try {
        beforeData = await resolveData(beforeData != null ? beforeData : data, rawFile);
      } catch (e) {
        props.onRemove(rawFile);
        return;
      }
      const { uid } = rawFile;
      const options = {
        headers: headers || {},
        withCredentials,
        file: rawFile,
        data: beforeData,
        method,
        filename,
        action,
        onProgress: (evt) => {
          onProgress(evt, rawFile);
        },
        onSuccess: (res) => {
          onSuccess(res, rawFile);
          delete requests.value[uid];
        },
        onError: (err) => {
          onError(err, rawFile);
          delete requests.value[uid];
        }
      };
      const request = httpRequest(options);
      requests.value[uid] = request;
      if (request instanceof Promise) {
        request.then(options.onSuccess, options.onError);
      }
    };
    const handleChange = (e) => {
      const files = e.target.files;
      if (!files)
        return;
      uploadFiles(Array.from(files));
    };
    const handleClick = () => {
      if (!disabled.value) {
        inputRef.value.value = "";
        inputRef.value.click();
      }
    };
    const handleKeydown = () => {
      handleClick();
    };
    const abort = (file) => {
      const _reqs = objects.entriesOf(requests.value).filter(file ? ([uid]) => String(file.uid) === uid : () => true);
      _reqs.forEach(([uid, req]) => {
        if (req instanceof XMLHttpRequest)
          req.abort();
        delete requests.value[uid];
      });
    };
    expose({
      abort,
      upload: upload$1
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b(), vue.unref(ns).m(_ctx.listType), vue.unref(ns).is("drag", _ctx.drag)]),
        tabindex: "0",
        onClick: handleClick,
        onKeydown: vue.withKeys(vue.withModifiers(handleKeydown, ["self"]), ["enter", "space"])
      }, [
        _ctx.drag ? (vue.openBlock(), vue.createBlock(uploadDragger["default"], {
          key: 0,
          disabled: vue.unref(disabled),
          onFile: uploadFiles
        }, {
          default: vue.withCtx(() => [
            vue.renderSlot(_ctx.$slots, "default")
          ]),
          _: 3
        }, 8, ["disabled"])) : vue.renderSlot(_ctx.$slots, "default", { key: 1 }),
        vue.createElementVNode("input", {
          ref_key: "inputRef",
          ref: inputRef,
          class: vue.normalizeClass(vue.unref(ns).e("input")),
          name: _ctx.name,
          multiple: _ctx.multiple,
          accept: _ctx.accept,
          type: "file",
          onChange: handleChange,
          onClick: _cache[0] || (_cache[0] = vue.withModifiers(() => {
          }, ["stop"]))
        }, null, 42, _hoisted_2)
      ], 42, _hoisted_1);
    };
  }
});
var UploadContent = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/upload/src/upload-content.vue"]]);

exports["default"] = UploadContent;
//# sourceMappingURL=upload-content2.js.map
