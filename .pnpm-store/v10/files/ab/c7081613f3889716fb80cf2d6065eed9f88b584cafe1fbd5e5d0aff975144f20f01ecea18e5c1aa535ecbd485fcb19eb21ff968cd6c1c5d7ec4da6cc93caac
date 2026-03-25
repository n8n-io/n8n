const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_renderSlotFragments = require('../shared/renderSlotFragments.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Primitive/Slot.ts
const Slot = (0, vue.defineComponent)({
	name: "PrimitiveSlot",
	inheritAttrs: false,
	setup(_, { attrs, slots }) {
		return () => {
			if (!slots.default) return null;
			const children = require_shared_renderSlotFragments.renderSlotFragments(slots.default());
			const firstNonCommentChildrenIndex = children.findIndex((child) => child.type !== vue.Comment);
			if (firstNonCommentChildrenIndex === -1) return children;
			const firstNonCommentChildren = children[firstNonCommentChildrenIndex];
			delete firstNonCommentChildren.props?.ref;
			const mergedProps = firstNonCommentChildren.props ? (0, vue.mergeProps)(attrs, firstNonCommentChildren.props) : attrs;
			const cloned = (0, vue.cloneVNode)({
				...firstNonCommentChildren,
				props: {}
			}, mergedProps);
			if (children.length === 1) return cloned;
			children[firstNonCommentChildrenIndex] = cloned;
			return children;
		};
	}
});

//#endregion
Object.defineProperty(exports, 'Slot', {
  enumerable: true,
  get: function () {
    return Slot;
  }
});
//# sourceMappingURL=Slot.cjs.map