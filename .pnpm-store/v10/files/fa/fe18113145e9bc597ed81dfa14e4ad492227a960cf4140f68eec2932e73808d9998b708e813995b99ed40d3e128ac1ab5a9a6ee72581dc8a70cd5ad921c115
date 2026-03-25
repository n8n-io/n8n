'use strict';

const kit = require('@nuxt/kit');
const constant = require('reka-ui/constant');

const index = kit.defineNuxtModule({
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
  setup({ prefix, components }) {
    if (components === false) {
      return;
    }
    let groupName;
    for (groupName in constant.components) {
      if (components === true || components[groupName]) {
        for (const component of constant.components[groupName]) {
          kit.addComponent({
            name: `${prefix}${component}`,
            export: component,
            filePath: "reka-ui"
          });
        }
      }
    }
  }
});

module.exports = index;
