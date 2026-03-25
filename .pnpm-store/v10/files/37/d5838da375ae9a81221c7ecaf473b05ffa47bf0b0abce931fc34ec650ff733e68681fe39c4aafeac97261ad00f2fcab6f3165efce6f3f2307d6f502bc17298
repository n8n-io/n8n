'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var useGlobalConfig = require('./hooks/use-global-config.js');
var configProviderProps = require('./config-provider-props.js');

const messageConfig = {};
const ConfigProvider = vue.defineComponent({
  name: "ElConfigProvider",
  props: configProviderProps.configProviderProps,
  setup(props, { slots }) {
    vue.watch(() => props.message, (val) => {
      Object.assign(messageConfig, val != null ? val : {});
    }, { immediate: true, deep: true });
    const config = useGlobalConfig.provideGlobalConfig(props);
    return () => vue.renderSlot(slots, "default", { config: config == null ? void 0 : config.value });
  }
});

exports["default"] = ConfigProvider;
exports.messageConfig = messageConfig;
//# sourceMappingURL=config-provider.js.map
