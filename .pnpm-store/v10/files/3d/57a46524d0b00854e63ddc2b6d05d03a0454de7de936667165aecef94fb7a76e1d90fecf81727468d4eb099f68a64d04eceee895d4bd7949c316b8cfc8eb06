import { Fragment } from "vue";

//#region src/shared/renderSlotFragments.ts
function renderSlotFragments(children) {
	if (!children) return [];
	return children.flatMap((child) => {
		if (child.type === Fragment) return renderSlotFragments(child.children);
		return [child];
	});
}

//#endregion
export { renderSlotFragments };
//# sourceMappingURL=renderSlotFragments.js.map