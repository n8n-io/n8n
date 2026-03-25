'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../config-provider/index.js');
var message$2 = require('./message2.js');
var message$1 = require('./message.js');
var instance = require('./instance.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');
var error = require('../../../utils/error.js');
var core = require('@vueuse/core');
var configProvider = require('../../config-provider/src/config-provider.js');

let seed = 1;
const normalizeOptions = (params) => {
  const options = !params || shared.isString(params) || vue.isVNode(params) || shared.isFunction(params) ? { message: params } : params;
  const normalized = {
    ...message$1.messageDefaults,
    ...options
  };
  if (!normalized.appendTo) {
    normalized.appendTo = document.body;
  } else if (shared.isString(normalized.appendTo)) {
    let appendTo = document.querySelector(normalized.appendTo);
    if (!types.isElement(appendTo)) {
      error.debugWarn("ElMessage", "the appendTo option is not an HTMLElement. Falling back to document.body.");
      appendTo = document.body;
    }
    normalized.appendTo = appendTo;
  }
  return normalized;
};
const closeMessage = (instance$1) => {
  const idx = instance.instances.indexOf(instance$1);
  if (idx === -1)
    return;
  instance.instances.splice(idx, 1);
  const { handler } = instance$1;
  handler.close();
};
const createMessage = ({ appendTo, ...options }, context) => {
  const id = `message_${seed++}`;
  const userOnClose = options.onClose;
  const container = document.createElement("div");
  const props = {
    ...options,
    id,
    onClose: () => {
      userOnClose == null ? void 0 : userOnClose();
      closeMessage(instance);
    },
    onDestroy: () => {
      vue.render(null, container);
    }
  };
  const vnode = vue.createVNode(message$2["default"], props, shared.isFunction(props.message) || vue.isVNode(props.message) ? {
    default: shared.isFunction(props.message) ? props.message : () => props.message
  } : null);
  vnode.appContext = context || message._context;
  vue.render(vnode, container);
  appendTo.appendChild(container.firstElementChild);
  const vm = vnode.component;
  const handler = {
    close: () => {
      vm.exposed.visible.value = false;
    }
  };
  const instance = {
    id,
    vnode,
    vm,
    handler,
    props: vnode.component.props
  };
  return instance;
};
const message = (options = {}, context) => {
  if (!core.isClient)
    return { close: () => void 0 };
  if (types.isNumber(configProvider.messageConfig.max) && instance.instances.length >= configProvider.messageConfig.max) {
    return { close: () => void 0 };
  }
  const normalized = normalizeOptions(options);
  if (normalized.grouping && instance.instances.length) {
    const instance2 = instance.instances.find(({ vnode: vm }) => {
      var _a;
      return ((_a = vm.props) == null ? void 0 : _a.message) === normalized.message;
    });
    if (instance2) {
      instance2.props.repeatNum += 1;
      instance2.props.type = normalized.type;
      return instance2.handler;
    }
  }
  const instance$1 = createMessage(normalized, context);
  instance.instances.push(instance$1);
  return instance$1.handler;
};
message$1.messageTypes.forEach((type) => {
  message[type] = (options = {}, appContext) => {
    const normalized = normalizeOptions(options);
    return message({ ...normalized, type }, appContext);
  };
});
function closeAll(type) {
  for (const instance$1 of instance.instances) {
    if (!type || type === instance$1.props.type) {
      instance$1.handler.close();
    }
  }
}
message.closeAll = closeAll;
message._context = null;

exports.closeAll = closeAll;
exports["default"] = message;
//# sourceMappingURL=method.js.map
