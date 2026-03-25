'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
var notification = require('./notification2.js');
var notification$1 = require('./notification.js');
var core = require('@vueuse/core');
var types = require('../../../utils/types.js');
var shared = require('@vue/shared');
var error = require('../../../utils/error.js');

const notifications = {
  "top-left": [],
  "top-right": [],
  "bottom-left": [],
  "bottom-right": []
};
const GAP_SIZE = 16;
let seed = 1;
const notify = function(options = {}, context = null) {
  if (!core.isClient)
    return { close: () => void 0 };
  if (typeof options === "string" || vue.isVNode(options)) {
    options = { message: options };
  }
  const position = options.position || "top-right";
  let verticalOffset = options.offset || 0;
  notifications[position].forEach(({ vm: vm2 }) => {
    var _a;
    verticalOffset += (((_a = vm2.el) == null ? void 0 : _a.offsetHeight) || 0) + GAP_SIZE;
  });
  verticalOffset += GAP_SIZE;
  const id = `notification_${seed++}`;
  const userOnClose = options.onClose;
  const props = {
    ...options,
    offset: verticalOffset,
    id,
    onClose: () => {
      close(id, position, userOnClose);
    }
  };
  let appendTo = document.body;
  if (types.isElement(options.appendTo)) {
    appendTo = options.appendTo;
  } else if (shared.isString(options.appendTo)) {
    appendTo = document.querySelector(options.appendTo);
  }
  if (!types.isElement(appendTo)) {
    error.debugWarn("ElNotification", "the appendTo option is not an HTMLElement. Falling back to document.body.");
    appendTo = document.body;
  }
  const container = document.createElement("div");
  const vm = vue.createVNode(notification["default"], props, vue.isVNode(props.message) ? {
    default: () => props.message
  } : null);
  vm.appContext = context != null ? context : notify._context;
  vm.props.onDestroy = () => {
    vue.render(null, container);
  };
  vue.render(vm, container);
  notifications[position].push({ vm });
  appendTo.appendChild(container.firstElementChild);
  return {
    close: () => {
      ;
      vm.component.exposed.visible.value = false;
    }
  };
};
notification$1.notificationTypes.forEach((type) => {
  notify[type] = (options = {}) => {
    if (typeof options === "string" || vue.isVNode(options)) {
      options = {
        message: options
      };
    }
    return notify({
      ...options,
      type
    });
  };
});
function close(id, position, userOnClose) {
  const orientedNotifications = notifications[position];
  const idx = orientedNotifications.findIndex(({ vm: vm2 }) => {
    var _a;
    return ((_a = vm2.component) == null ? void 0 : _a.props.id) === id;
  });
  if (idx === -1)
    return;
  const { vm } = orientedNotifications[idx];
  if (!vm)
    return;
  userOnClose == null ? void 0 : userOnClose(vm);
  const removedHeight = vm.el.offsetHeight;
  const verticalPos = position.split("-")[0];
  orientedNotifications.splice(idx, 1);
  const len = orientedNotifications.length;
  if (len < 1)
    return;
  for (let i = idx; i < len; i++) {
    const { el, component } = orientedNotifications[i].vm;
    const pos = Number.parseInt(el.style[verticalPos], 10) - removedHeight - GAP_SIZE;
    component.props.offset = pos;
  }
}
function closeAll() {
  for (const orientedNotifications of Object.values(notifications)) {
    orientedNotifications.forEach(({ vm }) => {
      ;
      vm.component.exposed.visible.value = false;
    });
  }
}
notify.closeAll = closeAll;
notify._context = null;

exports.close = close;
exports.closeAll = closeAll;
exports["default"] = notify;
//# sourceMappingURL=notify.js.map
