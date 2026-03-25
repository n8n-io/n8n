import { components } from 'reka-ui/constant';

function index(options = {}) {
  const { prefix = "" } = options;
  return {
    type: "component",
    resolve: (name) => {
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const componentName = name.substring(prefix.length);
        let groupName;
        for (groupName in components) {
          const groupComponents = components[groupName];
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

export { index as default };
