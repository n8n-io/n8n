const require_utils_assert = require('./assert.cjs');

//#region src/Splitter/utils/stackingOrder.ts
/**
* Determine which of two nodes appears in front of the other —
* if `a` is in front, returns 1, otherwise returns -1
* @param {HTMLElement} a
* @param {HTMLElement} b
*/
function compare(a, b) {
	if (a === b) throw new Error("Cannot compare node with itself");
	const ancestors = {
		a: getAncestors(a),
		b: getAncestors(b)
	};
	let common_ancestor;
	while (ancestors.a.at(-1) === ancestors.b.at(-1)) {
		a = ancestors.a.pop();
		b = ancestors.b.pop();
		common_ancestor = a;
	}
	require_utils_assert.assert(common_ancestor);
	const z_indexes = {
		a: getZIndex(findStackingContext(ancestors.a)),
		b: getZIndex(findStackingContext(ancestors.b))
	};
	if (z_indexes.a === z_indexes.b) {
		const children = common_ancestor.childNodes;
		const furthest_ancestors = {
			a: ancestors.a.at(-1),
			b: ancestors.b.at(-1)
		};
		let i = children.length;
		while (i--) {
			const child = children[i];
			if (child === furthest_ancestors.a) return 1;
			if (child === furthest_ancestors.b) return -1;
		}
	}
	return Math.sign(z_indexes.a - z_indexes.b);
}
const props = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
/** @param {HTMLElement} node */
function isFlexItem(node) {
	const display = getComputedStyle(getParent(node)).display;
	return display === "flex" || display === "inline-flex";
}
/** @param {HTMLElement} node */
function createsStackingContext(node) {
	const style = getComputedStyle(node);
	if (style.position === "fixed") return true;
	if (style.zIndex !== "auto" && (style.position !== "static" || isFlexItem(node))) return true;
	if (+style.opacity < 1) return true;
	if ("transform" in style && style.transform !== "none") return true;
	if ("webkitTransform" in style && style.webkitTransform !== "none") return true;
	if ("mixBlendMode" in style && style.mixBlendMode !== "normal") return true;
	if ("filter" in style && style.filter !== "none") return true;
	if ("webkitFilter" in style && style.webkitFilter !== "none") return true;
	if ("isolation" in style && style.isolation === "isolate") return true;
	if (props.test(style.willChange)) return true;
	if (style.webkitOverflowScrolling === "touch") return true;
	return false;
}
/** @param {HTMLElement[]} nodes */
function findStackingContext(nodes) {
	let i = nodes.length;
	while (i--) {
		const node = nodes[i];
		require_utils_assert.assert(node);
		if (createsStackingContext(node)) return node;
	}
	return null;
}
/** @param {HTMLElement} node */
function getZIndex(node) {
	return node && Number(getComputedStyle(node).zIndex) || 0;
}
/** @param {HTMLElement} node */
function getAncestors(node) {
	const ancestors = [];
	while (node) {
		ancestors.push(node);
		node = getParent(node);
	}
	return ancestors;
}
/** @param {HTMLElement} node */
function getParent(node) {
	return node.parentNode instanceof DocumentFragment && node.parentNode?.host || node.parentNode;
}

//#endregion
Object.defineProperty(exports, 'compare', {
  enumerable: true,
  get: function () {
    return compare;
  }
});
//# sourceMappingURL=stackingOrder.cjs.map