const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/renderSlotFragments.ts
function renderSlotFragments(children) {
	if (!children) return [];
	return children.flatMap((child) => {
		if (child.type === vue.Fragment) return renderSlotFragments(child.children);
		return [child];
	});
}

//#endregion
Object.defineProperty(exports, 'renderSlotFragments', {
  enumerable: true,
  get: function () {
    return renderSlotFragments;
  }
});
//# sourceMappingURL=renderSlotFragments.cjs.map