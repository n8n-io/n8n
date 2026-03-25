'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

function useMenu(instance, currentIndex) {
  const indexPath = vue.computed(() => {
    let parent = instance.parent;
    const path = [currentIndex.value];
    while (parent.type.name !== "ElMenu") {
      if (parent.props.index) {
        path.unshift(parent.props.index);
      }
      parent = parent.parent;
    }
    return path;
  });
  const parentMenu = vue.computed(() => {
    let parent = instance.parent;
    while (parent && !["ElMenu", "ElSubMenu"].includes(parent.type.name)) {
      parent = parent.parent;
    }
    return parent;
  });
  return {
    parentMenu,
    indexPath
  };
}

exports["default"] = useMenu;
//# sourceMappingURL=use-menu.js.map
