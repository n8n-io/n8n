import { defineComponent, watch, renderSlot } from 'vue';
import { provideGlobalConfig } from './hooks/use-global-config.mjs';
import { configProviderProps } from './config-provider-props.mjs';

const messageConfig = {};
const ConfigProvider = defineComponent({
  name: "ElConfigProvider",
  props: configProviderProps,
  setup(props, { slots }) {
    watch(() => props.message, (val) => {
      Object.assign(messageConfig, val != null ? val : {});
    }, { immediate: true, deep: true });
    const config = provideGlobalConfig(props);
    return () => renderSlot(slots, "default", { config: config == null ? void 0 : config.value });
  }
});

export { ConfigProvider as default, messageConfig };
//# sourceMappingURL=config-provider.mjs.map
