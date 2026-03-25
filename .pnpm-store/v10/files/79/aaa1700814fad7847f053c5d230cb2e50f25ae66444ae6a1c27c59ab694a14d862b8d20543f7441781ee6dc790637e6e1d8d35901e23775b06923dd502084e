'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@vue/shared');
require('../../../utils/index.js');
var ajax = require('./ajax.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');

const uploadListTypes = ["text", "picture", "picture-card"];
let fileId = 1;
const genFileId = () => Date.now() + fileId++;
const uploadBaseProps = runtime.buildProps({
  action: {
    type: String,
    default: "#"
  },
  headers: {
    type: runtime.definePropType(Object)
  },
  method: {
    type: String,
    default: "post"
  },
  data: {
    type: runtime.definePropType([Object, Function, Promise]),
    default: () => typescript.mutable({})
  },
  multiple: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: "file"
  },
  drag: {
    type: Boolean,
    default: false
  },
  withCredentials: Boolean,
  showFileList: {
    type: Boolean,
    default: true
  },
  accept: {
    type: String,
    default: ""
  },
  fileList: {
    type: runtime.definePropType(Array),
    default: () => typescript.mutable([])
  },
  autoUpload: {
    type: Boolean,
    default: true
  },
  listType: {
    type: String,
    values: uploadListTypes,
    default: "text"
  },
  httpRequest: {
    type: runtime.definePropType(Function),
    default: ajax.ajaxUpload
  },
  disabled: Boolean,
  limit: Number
});
const uploadProps = runtime.buildProps({
  ...uploadBaseProps,
  beforeUpload: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  beforeRemove: {
    type: runtime.definePropType(Function)
  },
  onRemove: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onChange: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onPreview: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onSuccess: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onProgress: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onError: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  },
  onExceed: {
    type: runtime.definePropType(Function),
    default: shared.NOOP
  }
});

exports.genFileId = genFileId;
exports.uploadBaseProps = uploadBaseProps;
exports.uploadListTypes = uploadListTypes;
exports.uploadProps = uploadProps;
//# sourceMappingURL=upload.js.map
