import { defineNuxtModule, addComponent } from '@nuxt/kit';
import { components } from 'reka-ui/constant';

const index = defineNuxtModule({
  meta: {
    name: "@reka-ui/nuxt",
    configKey: "reka",
    compatibility: {
      nuxt: ">=3.0.0"
    }
  },
  defaults: {
    prefix: "",
    components: true
  },
  setup({ prefix, components: components$1 }) {
    if (components$1 === false) {
      return;
    }
    let groupName;
    for (groupName in components) {
      if (components$1 === true || components$1[groupName]) {
        for (const component of components[groupName]) {
          addComponent({
            name: `${prefix}${component}`,
            export: component,
            filePath: "reka-ui"
          });
        }
      }
    }
  }
});

export { index as default };
