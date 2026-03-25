import { defineComponent, inject, ref, computed, watch, toRaw, unref, createVNode, mergeProps } from 'vue';
import { get } from 'lodash-unified';
import '../../../utils/index.mjs';
import '../../virtual-list/index.mjs';
import '../../../hooks/index.mjs';
import '../../../constants/index.mjs';
import GroupItem from './group-item.mjs';
import OptionItem from './option-item.mjs';
import { useProps } from './useProps.mjs';
import { selectV2InjectionKey } from './token.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isUndefined } from '../../../utils/types.mjs';
import { isObject } from '@vue/shared';
import { EVENT_CODE } from '../../../constants/aria.mjs';
import FixedSizeList from '../../virtual-list/src/components/fixed-size-list.mjs';
import DynamicSizeList from '../../virtual-list/src/components/dynamic-size-list.mjs';

var ElSelectMenu = defineComponent({
  name: "ElSelectDropdown",
  props: {
    data: {
      type: Array,
      required: true
    },
    hoveringIndex: Number,
    width: Number
  },
  setup(props, {
    slots,
    expose
  }) {
    const select = inject(selectV2InjectionKey);
    const ns = useNamespace("select");
    const {
      getLabel,
      getValue,
      getDisabled
    } = useProps(select.props);
    const cachedHeights = ref([]);
    const listRef = ref();
    const size = computed(() => props.data.length);
    watch(() => size.value, () => {
      var _a, _b;
      (_b = (_a = select.popper.value).updatePopper) == null ? void 0 : _b.call(_a);
    });
    const isSized = computed(() => isUndefined(select.props.estimatedOptionHeight));
    const listProps = computed(() => {
      if (isSized.value) {
        return {
          itemSize: select.props.itemHeight
        };
      }
      return {
        estimatedSize: select.props.estimatedOptionHeight,
        itemSize: (idx) => cachedHeights.value[idx]
      };
    });
    const contains = (arr = [], target) => {
      const {
        props: {
          valueKey
        }
      } = select;
      if (!isObject(target)) {
        return arr.includes(target);
      }
      return arr && arr.some((item) => {
        return toRaw(get(item, valueKey)) === get(target, valueKey);
      });
    };
    const isEqual = (selected, target) => {
      if (!isObject(target)) {
        return selected === target;
      } else {
        const {
          valueKey
        } = select.props;
        return get(selected, valueKey) === get(target, valueKey);
      }
    };
    const isItemSelected = (modelValue, target) => {
      if (select.props.multiple) {
        return contains(modelValue, getValue(target));
      }
      return isEqual(modelValue, getValue(target));
    };
    const isItemDisabled = (modelValue, selected) => {
      const {
        disabled,
        multiple,
        multipleLimit
      } = select.props;
      return disabled || !selected && (multiple ? multipleLimit > 0 && modelValue.length >= multipleLimit : false);
    };
    const isItemHovering = (target) => props.hoveringIndex === target;
    const scrollToItem = (index) => {
      const list = listRef.value;
      if (list) {
        list.scrollToItem(index);
      }
    };
    const resetScrollTop = () => {
      const list = listRef.value;
      if (list) {
        list.resetScrollTop();
      }
    };
    expose({
      listRef,
      isSized,
      isItemDisabled,
      isItemHovering,
      isItemSelected,
      scrollToItem,
      resetScrollTop
    });
    const Item = (itemProps) => {
      const {
        index,
        data,
        style
      } = itemProps;
      const sized = unref(isSized);
      const {
        itemSize,
        estimatedSize
      } = unref(listProps);
      const {
        modelValue
      } = select.props;
      const {
        onSelect,
        onHover
      } = select;
      const item = data[index];
      if (item.type === "Group") {
        return createVNode(GroupItem, {
          "item": item,
          "style": style,
          "height": sized ? itemSize : estimatedSize
        }, null);
      }
      const isSelected = isItemSelected(modelValue, item);
      const isDisabled = isItemDisabled(modelValue, isSelected);
      const isHovering = isItemHovering(index);
      return createVNode(OptionItem, mergeProps(itemProps, {
        "selected": isSelected,
        "disabled": getDisabled(item) || isDisabled,
        "created": !!item.created,
        "hovering": isHovering,
        "item": item,
        "onSelect": onSelect,
        "onHover": onHover
      }), {
        default: (props2) => {
          var _a;
          return ((_a = slots.default) == null ? void 0 : _a.call(slots, props2)) || createVNode("span", null, [getLabel(item)]);
        }
      });
    };
    const {
      onKeyboardNavigate,
      onKeyboardSelect
    } = select;
    const onForward = () => {
      onKeyboardNavigate("forward");
    };
    const onBackward = () => {
      onKeyboardNavigate("backward");
    };
    const onEscOrTab = () => {
      select.expanded = false;
    };
    const onKeydown = (e) => {
      const {
        code
      } = e;
      const {
        tab,
        esc,
        down,
        up,
        enter
      } = EVENT_CODE;
      if (code !== tab) {
        e.preventDefault();
        e.stopPropagation();
      }
      switch (code) {
        case tab:
        case esc: {
          onEscOrTab();
          break;
        }
        case down: {
          onForward();
          break;
        }
        case up: {
          onBackward();
          break;
        }
        case enter: {
          onKeyboardSelect();
          break;
        }
      }
    };
    return () => {
      var _a;
      const {
        data,
        width
      } = props;
      const {
        height,
        multiple,
        scrollbarAlwaysOn
      } = select.props;
      if (data.length === 0) {
        return createVNode("div", {
          "class": ns.b("dropdown"),
          "style": {
            width: `${width}px`
          }
        }, [(_a = slots.empty) == null ? void 0 : _a.call(slots)]);
      }
      const List = unref(isSized) ? FixedSizeList : DynamicSizeList;
      return createVNode("div", {
        "class": [ns.b("dropdown"), ns.is("multiple", multiple)]
      }, [createVNode(List, mergeProps({
        "ref": listRef
      }, unref(listProps), {
        "className": ns.be("dropdown", "list"),
        "scrollbarAlwaysOn": scrollbarAlwaysOn,
        "data": data,
        "height": height,
        "width": width,
        "total": data.length,
        "onKeydown": onKeydown
      }), {
        default: (props2) => createVNode(Item, props2, null)
      })]);
    };
  }
});

export { ElSelectMenu as default };
//# sourceMappingURL=select-dropdown.mjs.map
