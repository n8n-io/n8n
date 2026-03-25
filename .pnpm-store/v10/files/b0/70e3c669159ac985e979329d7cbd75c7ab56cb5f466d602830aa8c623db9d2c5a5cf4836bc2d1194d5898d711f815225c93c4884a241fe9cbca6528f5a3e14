'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
require('../../utils/index.js');
var core = require('@vueuse/core');
var globalNode = require('../../utils/vue/global-node.js');

const useTeleport = (contentRenderer, appendToBody) => {
  const isTeleportVisible = vue.ref(false);
  if (!core.isClient) {
    return {
      isTeleportVisible,
      showTeleport: shared.NOOP,
      hideTeleport: shared.NOOP,
      renderTeleport: shared.NOOP
    };
  }
  let $el = null;
  const showTeleport = () => {
    isTeleportVisible.value = true;
    if ($el !== null)
      return;
    $el = globalNode.createGlobalNode();
  };
  const hideTeleport = () => {
    isTeleportVisible.value = false;
    if ($el !== null) {
      globalNode.removeGlobalNode($el);
      $el = null;
    }
  };
  const renderTeleport = () => {
    return appendToBody.value !== true ? contentRenderer() : isTeleportVisible.value ? [vue.h(vue.Teleport, { to: $el }, contentRenderer())] : void 0;
  };
  vue.onUnmounted(hideTeleport);
  return {
    isTeleportVisible,
    showTeleport,
    hideTeleport,
    renderTeleport
  };
};

exports.useTeleport = useTeleport;
//# sourceMappingURL=index.js.map
