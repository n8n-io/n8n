import { i as isDev, c as createOnBeforeUpdateHook, a as createOnBeforeUnmountHook } from './shared/z-vue-scan.3fa3a39a.mjs';

const plugin = {
  install: (app, options) => {
    const { enable = isDev() } = options || {};
    if (!enable) {
      return;
    }
    app.mixin({
      mounted() {
        const instance = (() => {
          return this.$;
        })();
        if (!instance.__bu) {
          instance.__bu = createOnBeforeUpdateHook(instance, options);
        }
        if (!instance.__bum) {
          instance.__bum = createOnBeforeUnmountHook(instance);
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

export { plugin as default };
