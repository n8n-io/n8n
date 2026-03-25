'use strict';

const constant = require('reka-ui/constant');

function index(options = {}) {
  const { prefix = "" } = options;
  return {
    type: "component",
    resolve: (name) => {
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const componentName = name.substring(prefix.length);
        let groupName;
        for (groupName in constant.components) {
          const groupComponents = constant.components[groupName];
          if (groupComponents.includes(componentName)) {
            return {
              name: componentName,
              from: "reka-ui"
            };
          }
        }
      }
    }
  };
}

module.exports = index;
