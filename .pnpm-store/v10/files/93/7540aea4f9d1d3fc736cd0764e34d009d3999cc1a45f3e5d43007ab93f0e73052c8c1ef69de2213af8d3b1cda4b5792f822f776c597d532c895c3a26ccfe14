'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var index$4 = require('../../collapse-transition/index.js');
var index$3 = require('../../tooltip/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var iconsVue = require('@element-plus/icons-vue');
var index$2 = require('../../icon/index.js');
var useMenu = require('./use-menu.js');
var useMenuCssVar = require('./use-menu-css-var.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var icon = require('../../../utils/vue/icon.js');
var index = require('../../../hooks/use-deprecated/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var error = require('../../../utils/error.js');
var shared = require('@vue/shared');

const subMenuProps = runtime.buildProps({
  index: {
    type: String,
    required: true
  },
  showTimeout: {
    type: Number,
    default: 300
  },
  hideTimeout: {
    type: Number,
    default: 300
  },
  popperClass: String,
  disabled: Boolean,
  popperAppendToBody: {
    type: Boolean,
    default: void 0
  },
  teleported: {
    type: Boolean,
    default: void 0
  },
  popperOffset: {
    type: Number,
    default: 6
  },
  expandCloseIcon: {
    type: icon.iconPropType
  },
  expandOpenIcon: {
    type: icon.iconPropType
  },
  collapseCloseIcon: {
    type: icon.iconPropType
  },
  collapseOpenIcon: {
    type: icon.iconPropType
  }
});
const COMPONENT_NAME = "ElSubMenu";
var SubMenu = vue.defineComponent({
  name: COMPONENT_NAME,
  props: subMenuProps,
  setup(props, { slots, expose }) {
    index.useDeprecated({
      from: "popper-append-to-body",
      replacement: "teleported",
      scope: COMPONENT_NAME,
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/menu.html#submenu-attributes"
    }, vue.computed(() => props.popperAppendToBody !== void 0));
    const instance = vue.getCurrentInstance();
    const { indexPath, parentMenu } = useMenu["default"](instance, vue.computed(() => props.index));
    const nsMenu = index$1.useNamespace("menu");
    const nsSubMenu = index$1.useNamespace("sub-menu");
    const rootMenu = vue.inject("rootMenu");
    if (!rootMenu)
      error.throwError(COMPONENT_NAME, "can not inject root menu");
    const subMenu = vue.inject(`subMenu:${parentMenu.value.uid}`);
    if (!subMenu)
      error.throwError(COMPONENT_NAME, "can not inject sub menu");
    const items = vue.ref({});
    const subMenus = vue.ref({});
    let timeout;
    const mouseInChild = vue.ref(false);
    const verticalTitleRef = vue.ref();
    const vPopper = vue.ref(null);
    const currentPlacement = vue.computed(() => mode.value === "horizontal" && isFirstLevel.value ? "bottom-start" : "right-start");
    const subMenuTitleIcon = vue.computed(() => {
      return mode.value === "horizontal" && isFirstLevel.value || mode.value === "vertical" && !rootMenu.props.collapse ? props.expandCloseIcon && props.expandOpenIcon ? opened.value ? props.expandOpenIcon : props.expandCloseIcon : iconsVue.ArrowDown : props.collapseCloseIcon && props.collapseOpenIcon ? opened.value ? props.collapseOpenIcon : props.collapseCloseIcon : iconsVue.ArrowRight;
    });
    const isFirstLevel = vue.computed(() => {
      return subMenu.level === 0;
    });
    const appendToBody = vue.computed(() => {
      var _a;
      const value = (_a = props.teleported) != null ? _a : props.popperAppendToBody;
      return value === void 0 ? isFirstLevel.value : value;
    });
    const menuTransitionName = vue.computed(() => rootMenu.props.collapse ? `${nsMenu.namespace.value}-zoom-in-left` : `${nsMenu.namespace.value}-zoom-in-top`);
    const fallbackPlacements = vue.computed(() => mode.value === "horizontal" && isFirstLevel.value ? [
      "bottom-start",
      "bottom-end",
      "top-start",
      "top-end",
      "right-start",
      "left-start"
    ] : [
      "right-start",
      "right",
      "right-end",
      "left-start",
      "bottom-start",
      "bottom-end",
      "top-start",
      "top-end"
    ]);
    const opened = vue.computed(() => rootMenu.openedMenus.includes(props.index));
    const active = vue.computed(() => {
      let isActive = false;
      Object.values(items.value).forEach((item2) => {
        if (item2.active) {
          isActive = true;
        }
      });
      Object.values(subMenus.value).forEach((subItem) => {
        if (subItem.active) {
          isActive = true;
        }
      });
      return isActive;
    });
    const mode = vue.computed(() => rootMenu.props.mode);
    const item = vue.reactive({
      index: props.index,
      indexPath,
      active
    });
    const ulStyle = useMenuCssVar.useMenuCssVar(rootMenu.props, subMenu.level + 1);
    const doDestroy = () => {
      var _a, _b, _c;
      return (_c = (_b = (_a = vPopper.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.popperInstanceRef) == null ? void 0 : _c.destroy();
    };
    const handleCollapseToggle = (value) => {
      if (!value) {
        doDestroy();
      }
    };
    const handleClick = () => {
      if (rootMenu.props.menuTrigger === "hover" && rootMenu.props.mode === "horizontal" || rootMenu.props.collapse && rootMenu.props.mode === "vertical" || props.disabled)
        return;
      rootMenu.handleSubMenuClick({
        index: props.index,
        indexPath: indexPath.value,
        active: active.value
      });
    };
    const handleMouseenter = (event, showTimeout = props.showTimeout) => {
      var _a;
      if (event.type === "focus") {
        return;
      }
      if (rootMenu.props.menuTrigger === "click" && rootMenu.props.mode === "horizontal" || !rootMenu.props.collapse && rootMenu.props.mode === "vertical" || props.disabled) {
        return;
      }
      subMenu.mouseInChild.value = true;
      timeout == null ? void 0 : timeout();
      ({ stop: timeout } = core.useTimeoutFn(() => {
        rootMenu.openMenu(props.index, indexPath.value);
      }, showTimeout));
      if (appendToBody.value) {
        (_a = parentMenu.value.vnode.el) == null ? void 0 : _a.dispatchEvent(new MouseEvent("mouseenter"));
      }
    };
    const handleMouseleave = (deepDispatch = false) => {
      var _a, _b;
      if (rootMenu.props.menuTrigger === "click" && rootMenu.props.mode === "horizontal" || !rootMenu.props.collapse && rootMenu.props.mode === "vertical") {
        return;
      }
      timeout == null ? void 0 : timeout();
      subMenu.mouseInChild.value = false;
      ({ stop: timeout } = core.useTimeoutFn(() => !mouseInChild.value && rootMenu.closeMenu(props.index, indexPath.value), props.hideTimeout));
      if (appendToBody.value && deepDispatch) {
        if (((_a = instance.parent) == null ? void 0 : _a.type.name) === "ElSubMenu") {
          (_b = subMenu.handleMouseleave) == null ? void 0 : _b.call(subMenu, true);
        }
      }
    };
    vue.watch(() => rootMenu.props.collapse, (value) => handleCollapseToggle(Boolean(value)));
    {
      const addSubMenu = (item2) => {
        subMenus.value[item2.index] = item2;
      };
      const removeSubMenu = (item2) => {
        delete subMenus.value[item2.index];
      };
      vue.provide(`subMenu:${instance.uid}`, {
        addSubMenu,
        removeSubMenu,
        handleMouseleave,
        mouseInChild,
        level: subMenu.level + 1
      });
    }
    expose({
      opened
    });
    vue.onMounted(() => {
      rootMenu.addSubMenu(item);
      subMenu.addSubMenu(item);
    });
    vue.onBeforeUnmount(() => {
      subMenu.removeSubMenu(item);
      rootMenu.removeSubMenu(item);
    });
    return () => {
      var _a;
      const titleTag = [
        (_a = slots.title) == null ? void 0 : _a.call(slots),
        vue.h(index$2.ElIcon, {
          class: nsSubMenu.e("icon-arrow"),
          style: {
            transform: opened.value ? props.expandCloseIcon && props.expandOpenIcon || props.collapseCloseIcon && props.collapseOpenIcon && rootMenu.props.collapse ? "none" : "rotateZ(180deg)" : "none"
          }
        }, {
          default: () => shared.isString(subMenuTitleIcon.value) ? vue.h(instance.appContext.components[subMenuTitleIcon.value]) : vue.h(subMenuTitleIcon.value)
        })
      ];
      const child = rootMenu.isMenuPopup ? vue.h(index$3.ElTooltip, {
        ref: vPopper,
        visible: opened.value,
        effect: "light",
        pure: true,
        offset: props.popperOffset,
        showArrow: false,
        persistent: true,
        popperClass: props.popperClass,
        placement: currentPlacement.value,
        teleported: appendToBody.value,
        fallbackPlacements: fallbackPlacements.value,
        transition: menuTransitionName.value,
        gpuAcceleration: false
      }, {
        content: () => {
          var _a2;
          return vue.h("div", {
            class: [
              nsMenu.m(mode.value),
              nsMenu.m("popup-container"),
              props.popperClass
            ],
            onMouseenter: (evt) => handleMouseenter(evt, 100),
            onMouseleave: () => handleMouseleave(true),
            onFocus: (evt) => handleMouseenter(evt, 100)
          }, [
            vue.h("ul", {
              class: [
                nsMenu.b(),
                nsMenu.m("popup"),
                nsMenu.m(`popup-${currentPlacement.value}`)
              ],
              style: ulStyle.value
            }, [(_a2 = slots.default) == null ? void 0 : _a2.call(slots)])
          ]);
        },
        default: () => vue.h("div", {
          class: nsSubMenu.e("title"),
          onClick: handleClick
        }, titleTag)
      }) : vue.h(vue.Fragment, {}, [
        vue.h("div", {
          class: nsSubMenu.e("title"),
          ref: verticalTitleRef,
          onClick: handleClick
        }, titleTag),
        vue.h(index$4["default"], {}, {
          default: () => {
            var _a2;
            return vue.withDirectives(vue.h("ul", {
              role: "menu",
              class: [nsMenu.b(), nsMenu.m("inline")],
              style: ulStyle.value
            }, [(_a2 = slots.default) == null ? void 0 : _a2.call(slots)]), [[vue.vShow, opened.value]]);
          }
        })
      ]);
      return vue.h("li", {
        class: [
          nsSubMenu.b(),
          nsSubMenu.is("active", active.value),
          nsSubMenu.is("opened", opened.value),
          nsSubMenu.is("disabled", props.disabled)
        ],
        role: "menuitem",
        ariaHaspopup: true,
        ariaExpanded: opened.value,
        onMouseenter: handleMouseenter,
        onMouseleave: () => handleMouseleave(true),
        onFocus: handleMouseenter
      }, [child]);
    };
  }
});

exports["default"] = SubMenu;
exports.subMenuProps = subMenuProps;
//# sourceMappingURL=sub-menu.js.map
