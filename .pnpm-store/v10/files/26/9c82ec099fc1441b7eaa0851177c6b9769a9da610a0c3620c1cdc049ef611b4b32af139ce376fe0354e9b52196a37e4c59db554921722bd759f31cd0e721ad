'use strict';

const utils = require('./shared/z-vue-scan.e44c49f3.cjs');

const plugin = {
  install: (app, options) => {
    const { enable = utils.isDev() } = options || {};
    if (!enable) {
      return;
    }
    app.mixin({
      mounted() {
        const instance = (() => {
          return this.$;
        })();
        if (!instance.__bu) {
          instance.__bu = utils.createOnBeforeUpdateHook(instance, options);
        }
        if (!instance.__bum) {
          instance.__bum = utils.createOnBeforeUnmountHook(instance);
        }
        instance.__vue_scan_injected__ = true;
      },
      beforeUpdate() {
        const instance = (() => {
          return this.$;
        })();
        instance.__bu?.();
      },
      beforeUnmount() {
        const instance = (() => {
          return this.$;
        })();
        instance.__bum?.();
      }
    });
  }
};

module.exports = plugin;
