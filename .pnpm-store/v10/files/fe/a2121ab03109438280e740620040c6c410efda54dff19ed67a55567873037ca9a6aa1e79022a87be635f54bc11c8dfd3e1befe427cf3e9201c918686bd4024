import { isVNode, defineComponent, createVNode, renderSlot, createTextVNode } from 'vue';
import { isString, isArray } from '@vue/shared';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import SpaceItem from './item.mjs';
import { useSpace } from './use-space.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { isNumber } from '../../../utils/types.mjs';
import { componentSizes } from '../../../constants/size.mjs';
import { isFragment, PatchFlags, isValidElementNode } from '../../../utils/vue/vnode.mjs';

const spaceProps = buildProps({
  direction: {
    type: String,
    values: ["horizontal", "vertical"],
    default: "horizontal"
  },
  class: {
    type: definePropType([
      String,
      Object,
      Array
    ]),
    default: ""
  },
  style: {
    type: definePropType([String, Array, Object]),
    default: ""
  },
  alignment: {
    type: definePropType(String),
    default: "center"
  },
  prefixCls: {
    type: String
  },
  spacer: {
    type: definePropType([Object, String, Number, Array]),
    default: null,
    validator: (val) => isVNode(val) || isNumber(val) || isString(val)
  },
  wrap: Boolean,
  fill: Boolean,
  fillRatio: {
    type: Number,
    default: 100
  },
  size: {
    type: [String, Array, Number],
    values: componentSizes,
    validator: (val) => {
      return isNumber(val) || isArray(val) && val.length === 2 && val.every(isNumber);
    }
  }
});
const Space = defineComponent({
  name: "ElSpace",
  props: spaceProps,
  setup(props, { slots }) {
    const { classes, containerStyle, itemStyle } = useSpace(props);
    function extractChildren(children, parentKey = "", extractedChildren = []) {
      const { prefixCls } = props;
      children.forEach((child, loopKey) => {
        if (isFragment(child)) {
          if (isArray(child.children)) {
            child.children.forEach((nested, key) => {
              if (isFragment(nested) && isArray(nested.children)) {
                extractChildren(nested.children, `${parentKey + key}-`, extractedChildren);
              } else {
                extractedChildren.push(createVNode(SpaceItem, {
                  style: itemStyle.value,
                  prefixCls,
                  key: `nested-${parentKey + key}`
                }, {
                  default: () => [nested]
                }, PatchFlags.PROPS | PatchFlags.STYLE, ["style", "prefixCls"]));
              }
            });
          }
        } else if (isValidElementNode(child)) {
          extractedChildren.push(createVNode(SpaceItem, {
            style: itemStyle.value,
            prefixCls,
            key: `LoopKey${parentKey + loopKey}`
          }, {
            default: () => [child]
          }, PatchFlags.PROPS | PatchFlags.STYLE, ["style", "prefixCls"]));
        }
      });
      return extractedChildren;
    }
    return () => {
      var _a;
      const { spacer, direction } = props;
      const children = renderSlot(slots, "default", { key: 0 }, () => []);
      if (((_a = children.children) != null ? _a : []).length === 0)
        return null;
      if (isArray(children.children)) {
        let extractedChildren = extractChildren(children.children);
        if (spacer) {
          const len = extractedChildren.length - 1;
          extractedChildren = extractedChildren.reduce((acc, child, idx) => {
            const children2 = [...acc, child];
            if (idx !== len) {
              children2.push(createVNode("span", {
                style: [
                  itemStyle.value,
                  direction === "vertical" ? "width: 100%" : null
                ],
                key: idx
              }, [
                isVNode(spacer) ? spacer : createTextVNode(spacer, PatchFlags.TEXT)
              ], PatchFlags.STYLE));
            }
            return children2;
          }, []);
        }
        return createVNode("div", {
          class: classes.value,
          style: containerStyle.value
        }, extractedChildren, PatchFlags.STYLE | PatchFlags.CLASS);
      }
      return children.children;
    };
  }
});

export { Space as default, spaceProps };
//# sourceMappingURL=space.mjs.map
