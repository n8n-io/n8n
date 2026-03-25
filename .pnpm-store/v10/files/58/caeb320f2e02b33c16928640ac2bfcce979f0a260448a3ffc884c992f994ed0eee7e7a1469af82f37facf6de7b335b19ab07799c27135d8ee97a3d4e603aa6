import { defineComponent, inject, withDirectives, h } from 'vue';
import { isNil } from 'lodash-unified';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { descriptionsKey } from './token.mjs';
import { getNormalizedProps } from '../../../utils/vue/vnode.mjs';
import { addUnit } from '../../../utils/dom/style.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

var ElDescriptionsCell = defineComponent({
  name: "ElDescriptionsCell",
  props: {
    cell: {
      type: Object
    },
    tag: {
      type: String,
      default: "td"
    },
    type: {
      type: String
    }
  },
  setup() {
    const descriptions = inject(descriptionsKey, {});
    return {
      descriptions
    };
  },
  render() {
    var _a, _b, _c, _d, _e, _f, _g;
    const item = getNormalizedProps(this.cell);
    const directives = (((_a = this.cell) == null ? void 0 : _a.dirs) || []).map((dire) => {
      const { dir, arg, modifiers, value } = dire;
      return [dir, value, arg, modifiers];
    });
    const { border, direction } = this.descriptions;
    const isVertical = direction === "vertical";
    const label = ((_d = (_c = (_b = this.cell) == null ? void 0 : _b.children) == null ? void 0 : _c.label) == null ? void 0 : _d.call(_c)) || item.label;
    const content = (_g = (_f = (_e = this.cell) == null ? void 0 : _e.children) == null ? void 0 : _f.default) == null ? void 0 : _g.call(_f);
    const span = item.span;
    const align = item.align ? `is-${item.align}` : "";
    const labelAlign = item.labelAlign ? `is-${item.labelAlign}` : align;
    const className = item.className;
    const labelClassName = item.labelClassName;
    const style = {
      width: addUnit(item.width),
      minWidth: addUnit(item.minWidth)
    };
    const ns = useNamespace("descriptions");
    switch (this.type) {
      case "label":
        return withDirectives(h(this.tag, {
          style,
          class: [
            ns.e("cell"),
            ns.e("label"),
            ns.is("bordered-label", border),
            ns.is("vertical-label", isVertical),
            labelAlign,
            labelClassName
          ],
          colSpan: isVertical ? span : 1
        }, label), directives);
      case "content":
        return withDirectives(h(this.tag, {
          style,
          class: [
            ns.e("cell"),
            ns.e("content"),
            ns.is("bordered-content", border),
            ns.is("vertical-content", isVertical),
            align,
            className
          ],
          colSpan: isVertical ? span : span * 2 - 1
        }, content), directives);
      default:
        return withDirectives(h("td", {
          style,
          class: [ns.e("cell"), align],
          colSpan: span
        }, [
          !isNil(label) ? h("span", {
            class: [ns.e("label"), labelClassName]
          }, label) : void 0,
          h("span", {
            class: [ns.e("content"), className]
          }, content)
        ]), directives);
    }
  }
});

export { ElDescriptionsCell as default };
//# sourceMappingURL=descriptions-cell.mjs.map
