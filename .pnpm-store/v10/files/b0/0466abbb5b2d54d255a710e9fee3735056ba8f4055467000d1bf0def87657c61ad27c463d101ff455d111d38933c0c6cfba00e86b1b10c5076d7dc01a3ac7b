'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
require('../../../utils/index.js');
require('../../../constants/index.js');
var item = require('./item.js');
var useSpace = require('./use-space.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var types = require('../../../utils/types.js');
var size = require('../../../constants/size.js');
var vnode = require('../../../utils/vue/vnode.js');

const spaceProps = runtime.buildProps({
  direction: {
    type: String,
    values: ["horizontal", "vertical"],
    default: "horizontal"
  },
  class: {
    type: runtime.definePropType([
      String,
      Object,
      Array
    ]),
    default: ""
  },
  style: {
    type: runtime.definePropType([String, Array, Object]),
    default: ""
  },
  alignment: {
    type: runtime.definePropType(String),
    default: "center"
  },
  prefixCls: {
    type: String
  },
  spacer: {
    type: runtime.definePropType([Object, String, Number, Array]),
    default: null,
    validator: (val) => vue.isVNode(val) || types.isNumber(val) || shared.isString(val)
  },
  wrap: Boolean,
  fill: Boolean,
  fillRatio: {
    type: Number,
    default: 100
  },
  size: {
    type: [String, Array, Number],
    values: size.componentSizes,
    validator: (val) => {
      return types.isNumber(val) || shared.isArray(val) && val.length === 2 && val.every(types.isNumber);
    }
  }
});
const Space = vue.defineComponent({
  name: "ElSpace",
  props: spaceProps,
  setup(props, { slots }) {
    const { classes, containerStyle, itemStyle } = useSpace.useSpace(props);
    function extractChildren(children, parentKey = "", extractedChildren = []) {
      const { prefixCls } = props;
      children.forEach((child, loopKey) => {
        if (vnode.isFragment(child)) {
          if (shared.isArray(child.children)) {
            child.children.forEach((nested, key) => {
              if (vnode.isFragment(nested) && shared.isArray(nested.children)) {
                extractChildren(nested.children, `${parentKey + key}-`, extractedChildren);
              } else {
                extractedChildren.push(vue.createVNode(item["default"], {
                  style: itemStyle.value,
                  prefixCls,
                  key: `nested-${parentKey + key}`
                }, {
                  default: () => [nested]
                }, vnode.PatchFlags.PROPS | vnode.PatchFlags.STYLE, ["style", "prefixCls"]));
              }
            });
          }
        } else if (vnode.isValidElementNode(child)) {
          extractedChildren.push(vue.createVNode(item["default"], {
            style: itemStyle.value,
            prefixCls,
            key: `LoopKey${parentKey + loopKey}`
          }, {
            default: () => [child]
          }, vnode.PatchFlags.PROPS | vnode.PatchFlags.STYLE, ["style", "prefixCls"]));
        }
      });
      return extractedChildren;
    }
    return () => {
      var _a;
      const { spacer, direction } = props;
      const children = vue.renderSlot(slots, "default", { key: 0 }, () => []);
      if (((_a = children.children) != null ? _a : []).length === 0)
        return null;
      if (shared.isArray(children.children)) {
        let extractedChildren = extractChildren(children.children);
        if (spacer) {
          const len = extractedChildren.length - 1;
          extractedChildren = extractedChildren.reduce((acc, child, idx) => {
            const children2 = [...acc, child];
            if (idx !== len) {
              children2.push(vue.createVNode("span", {
                style: [
                  itemStyle.value,
                  direction === "vertical" ? "width: 100%" : null
                ],
                key: idx
              }, [
                vue.isVNode(spacer) ? spacer : vue.createTextVNode(spacer, vnode.PatchFlags.TEXT)
              ], vnode.PatchFlags.STYLE));
            }
            return children2;
          }, []);
        }
        return vue.createVNode("div", {
          class: classes.value,
          style: containerStyle.value
        }, extractedChildren, vnode.PatchFlags.STYLE | vnode.PatchFlags.CLASS);
      }
      return children.children;
    };
  }
});

exports["default"] = Space;
exports.spaceProps = spaceProps;
//# sourceMappingURL=space.js.map
