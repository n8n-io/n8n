'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lodashUnified = require('lodash-unified');
require('../../../utils/index.js');
var error = require('../../../utils/error.js');
var shared = require('@vue/shared');

const SCOPE = "ElUpload";
class UploadAjaxError extends Error {
  constructor(message, status, method, url) {
    super(message);
    this.name = "UploadAjaxError";
    this.status = status;
    this.method = method;
    this.url = url;
  }
}
function getError(action, option, xhr) {
  let msg;
  if (xhr.response) {
    msg = `${xhr.response.error || xhr.response}`;
  } else if (xhr.responseText) {
    msg = `${xhr.responseText}`;
  } else {
    msg = `fail to ${option.method} ${action} ${xhr.status}`;
  }
  return new UploadAjaxError(msg, xhr.status, option.method, action);
}
function getBody(xhr) {
  const text = xhr.responseText || xhr.response;
  if (!text) {
    return text;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}
const ajaxUpload = (option) => {
  if (typeof XMLHttpRequest === "undefined")
    error.throwError(SCOPE, "XMLHttpRequest is undefined");
  const xhr = new XMLHttpRequest();
  const action = option.action;
  if (xhr.upload) {
    xhr.upload.addEventListener("progress", (evt) => {
      const progressEvt = evt;
      progressEvt.percent = evt.total > 0 ? evt.loaded / evt.total * 100 : 0;
      option.onProgress(progressEvt);
    });
  }
  const formData = new FormData();
  if (option.data) {
    for (const [key, value] of Object.entries(option.data)) {
      if (shared.isArray(value) && value.length)
        formData.append(key, ...value);
      else
        formData.append(key, value);
    }
  }
  formData.append(option.filename, option.file, option.file.name);
  xhr.addEventListener("error", () => {
    option.onError(getError(action, option, xhr));
  });
  xhr.addEventListener("load", () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      return option.onError(getError(action, option, xhr));
    }
    option.onSuccess(getBody(xhr));
  });
  xhr.open(option.method, action, true);
  if (option.withCredentials && "withCredentials" in xhr) {
    xhr.withCredentials = true;
  }
  const headers = option.headers || {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (lodashUnified.isNil(value))
        continue;
      xhr.setRequestHeader(key, String(value));
    }
  }
  xhr.send(formData);
  return xhr;
};

exports.UploadAjaxError = UploadAjaxError;
exports.ajaxUpload = ajaxUpload;
//# sourceMappingURL=ajax.js.map
