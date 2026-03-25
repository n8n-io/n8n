'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var lodashUnified = require('lodash-unified');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var menuBar = require('./utils/menu-bar.js');
var menuCollapseTransition = require('./menu-collapse-transition.js');
var subMenu = require('./sub-menu.js');
var useMenuCssVar = require('./use-menu-css-var.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');
var shared = require('@vue/shared');
var index = require('../../../hooks/use-namespace/index.js');
var vnode = require('../../../utils/vue/vnode.js');

const menuProps = runtime.buildProps({
  mode: {
    type: String,
    values: ["horizontal", "vertical"],
    default: "vertical"
  },
  defaultActive: {
    type: String,
    default: ""
  },
  defaultOpeneds: {
    type: runtime.definePropType(Array),
    default: () => typescript.mutable([])
  },
  uniqueOpened: Boolean,
  router: Boolean,
  menuTrigger: {
    type: String,
    values: ["hover", "click"],
    default: "hover"
  },
  collapse: Boolean,
  backgroundColor: String,
  textColor: String,
  activeTextColor: String,
  collapseTransition: {
    type: Boolean,
    default: true
  },
  ellipsis: {
    type: Boolean,
    default: true
  },
  popperEffect: {
    type: String,
    values: ["dark", "light"],
    default: "dark"
  }
});
const checkIndexPath = (indexPath) => Array.isArray(indexPath) && indexPath.every((path) => shared.isString(path));
const menuEmits = {
  close: (index, indexPath) => shared.isString(index) && checkIndexPath(indexPath),
  open: (index, indexPath) => shared.isString(index) && checkIndexPath(indexPath),
  select: (index, indexPath, item, routerResult) => shared.isString(index) && checkIndexPath(indexPath) && shared.isObject(item) && (routerResult === void 0 || routerResult instanceof Promise)
};
var Menu = vue.defineComponent({
  name: "ElMenu",
  props: menuProps,
  emits: menuEmits,
  setup(props, { emit, slots, expose }) {
    const instance = vue.getCurrentInstance();
    const router = instance.appContext.config.globalProperties.$router;
    const menu = vue.ref();
    const nsMenu = index.useNamespace("menu");
    const nsSubMenu = index.useNamespace("sub-menu");
    const sliceIndex = vue.ref(-1);
    const openedMenus = vue.ref(props.defaultOpeneds && !props.collapse ? props.defaultOpeneds.slice(0) : []);
    const activeIndex = vue.ref(props.defaultActive);
    const items = vue.ref({});
    const subMenus = vue.ref({});
    const isMenuPopup = vue.computed(() => {
      return props.mode === "horizontal" || props.mode === "vertical" && props.collapse;
    });
    const initMenu = () => {
      const activeItem = activeIndex.value && items.value[activeIndex.value];
      if (!activeItem || props.mode === "horizontal" || props.collapse)
        return;
      const indexPath = activeItem.indexPath;
      indexPath.forEach((index) => {
        const subMenu = subMenus.value[index];
        subMenu && openMenu(index, subMenu.indexPath);
      });
    };
    const openMenu = (index, indexPath) => {
      if (openedMenus.value.includes(index))
        return;
      if (props.uniqueOpened) {
        openedMenus.value = openedMenus.value.filter((index2) => indexPath.includes(index2));
      }
      openedMenus.value.push(index);
      emit("open", index, indexPath);
    };
    const close = (index) => {
      const i = openedMenus.value.indexOf(index);
      if (i !== -1) {
        openedMenus.value.splice(i, 1);
      }
    };
    const closeMenu = (index, indexPath) => {
      close(index);
      emit("close", index, indexPath);
    };
    const handleSubMenuClick = ({
      index,
      indexPath
    }) => {
      const isOpened = openedMenus.value.includes(index);
      if (isOpened) {
        closeMenu(index, indexPath);
      } else {
        openMenu(index, indexPath);
      }
    };
    const handleMenuItemClick = (menuItem) => {
      if (props.mode === "horizontal" || props.collapse) {
        openedMenus.value = [];
      }
      const { index, indexPath } = menuItem;
      if (lodashUnified.isNil(index) || lodashUnified.isNil(indexPath))
        return;
      if (props.router && router) {
        const route = menuItem.route || index;
        const routerResult = router.push(route).then((res) => {
          if (!res)
            activeIndex.value = index;
          return res;
        });
        emit("select", index, indexPath, { index, indexPath, route }, routerResult);
      } else {
        activeIndex.value = index;
        emit("select", index, indexPath, { index, indexPath });
      }
    };
    const updateActiveIndex = (val) => {
      const itemsInData = items.value;
      const item = itemsInData[val] || activeIndex.value && itemsInData[activeIndex.value] || itemsInData[props.defaultActive];
      if (item) {
        activeIndex.value = item.index;
      } else {
        activeIndex.value = val;
      }
    };
    const calcSliceIndex = () => {
      var _a, _b;
      if (!menu.value)
        return -1;
      const items2 = Array.from((_b = (_a = menu.value) == null ? void 0 : _a.childNodes) != null ? _b : []).filter((item) => item.nodeName !== "#comment" && (item.nodeName !== "#text" || item.nodeValue));
      const moreItemWidth = 64;
      const paddingLeft = Number.parseInt(getComputedStyle(menu.value).paddingLeft, 10);
      const paddingRight = Number.parseInt(getComputedStyle(menu.value).paddingRight, 10);
      const menuWidth = menu.value.clientWidth - paddingLeft - paddingRight;
      let calcWidth = 0;
      let sliceIndex2 = 0;
      items2.forEach((item, index) => {
        calcWidth += item.offsetWidth || 0;
        if (calcWidth <= menuWidth - moreItemWidth) {
          sliceIndex2 = index + 1;
        }
      });
      return sliceIndex2 === items2.length ? -1 : sliceIndex2;
    };
    const debounce = (fn, wait = 33.34) => {
      let timmer;
      return () => {
        timmer && clearTimeout(timmer);
        timmer = setTimeout(() => {
          fn();
        }, wait);
      };
    };
    let isFirstTimeRender = true;
    const handleResize = () => {
      const callback = () => {
        sliceIndex.value = -1;
        vue.nextTick(() => {
          sliceIndex.value = calcSliceIndex();
        });
      };
      isFirstTimeRender ? callback() : debounce(callback)();
      isFirstTimeRender = false;
    };
    vue.watch(() => props.defaultActive, (currentActive) => {
      if (!items.value[currentActive]) {
        activeIndex.value = "";
      }
      updateActiveIndex(currentActive);
    });
    vue.watch(() => props.collapse, (value) => {
      if (value)
        openedMenus.value = [];
    });
    vue.watch(items.value, initMenu);
    let resizeStopper;
    vue.watchEffect(() => {
      if (props.mode === "horizontal" && props.ellipsis)
        resizeStopper = core.useResizeObserver(menu, handleResize).stop;
      else
        resizeStopper == null ? void 0 : resizeStopper();
    });
    {
      const addSubMenu = (item) => {
        subMenus.value[item.index] = item;
      };
      const removeSubMenu = (item) => {
        delete subMenus.value[item.index];
      };
      const addMenuItem = (item) => {
        items.value[item.index] = item;
      };
      const removeMenuItem = (item) => {
        delete items.value[item.index];
      };
      vue.provide("rootMenu", vue.reactive({
        props,
        openedMenus,
        items,
        subMenus,
        activeIndex,
        isMenuPopup,
        addMenuItem,
        removeMenuItem,
        addSubMenu,
        removeSubMenu,
        openMenu,
        closeMenu,
        handleMenuItemClick,
        handleSubMenuClick
      }));
      vue.provide(`subMenu:${instance.uid}`, {
        addSubMenu,
        removeSubMenu,
        mouseInChild: vue.ref(false),
        level: 0
      });
    }
    vue.onMounted(() => {
      if (props.mode === "horizontal") {
        new menuBar["default"](instance.vnode.el, nsMenu.namespace.value);
      }
    });
    {
      const open = (index) => {
        const { indexPath } = subMenus.value[index];
        indexPath.forEach((i) => openMenu(i, indexPath));
      };
      expose({
        open,
        close,
        handleResize
      });
    }
    return () => {
      var _a, _b;
      let slot = (_b = (_a = slots.default) == null ? void 0 : _a.call(slots)) != null ? _b : [];
      const vShowMore = [];
      if (props.mode === "horizontal" && menu.value) {
        const originalSlot = vnode.flattedChildren(slot);
        const slotDefault = sliceIndex.value === -1 ? originalSlot : originalSlot.slice(0, sliceIndex.value);
        const slotMore = sliceIndex.value === -1 ? [] : originalSlot.slice(sliceIndex.value);
        if ((slotMore == null ? void 0 : slotMore.length) && props.ellipsis) {
          slot = slotDefault;
          vShowMore.push(vue.h(subMenu["default"], {
            index: "sub-menu-more",
            class: nsSubMenu.e("hide-arrow")
          }, {
            title: () => vue.h(index$1.ElIcon, {
              class: nsSubMenu.e("icon-more")
            }, { default: () => vue.h(iconsVue.More) }),
            default: () => slotMore
          }));
        }
      }
      const ulStyle = useMenuCssVar.useMenuCssVar(props, 0);
      const vMenu = vue.h("ul", {
        key: String(props.collapse),
        role: "menubar",
        ref: menu,
        style: ulStyle.value,
        class: {
          [nsMenu.b()]: true,
          [nsMenu.m(props.mode)]: true,
          [nsMenu.m("collapse")]: props.collapse
        }
      }, [...slot, ...vShowMore]);
      if (props.collapseTransition && props.mode === "vertical") {
        return vue.h(menuCollapseTransition["default"], () => vMenu);
      }
      return vMenu;
    };
  }
});

exports["default"] = Menu;
exports.menuEmits = menuEmits;
exports.menuProps = menuProps;
//# sourceMappingURL=menu.js.map
