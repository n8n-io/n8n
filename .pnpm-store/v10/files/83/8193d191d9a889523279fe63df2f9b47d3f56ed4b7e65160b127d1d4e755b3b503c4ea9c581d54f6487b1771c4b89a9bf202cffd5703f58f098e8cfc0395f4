// @ts-check
/** @typedef { import('estree').BaseNode} BaseNode */

/** @typedef {{
	skip: () => void;
	remove: () => void;
	replace: (node: BaseNode) => void;
}} WalkerContext */

export class WalkerBase {
	constructor() {
		/** @type {boolean} */
		this.should_skip = false;

		/** @type {boolean} */
		this.should_remove = false;

		/** @type {BaseNode | null} */
		this.replacement = null;

		/** @type {WalkerContext} */
		this.context = {
			skip: () => (this.should_skip = true),
			remove: () => (this.should_remove = true),
			replace: (node) => (this.replacement = node)
		};
	}

	/**
	 *
	 * @param {any} parent
	 * @param {string} prop
	 * @param {number} index
	 * @param {BaseNode} node
	 */
	replace(parent, prop, index, node) {
		if (parent) {
			if (index !== null) {
				parent[prop][index] = node;
			} else {
				parent[prop] = node;
			}
		}
	}

	/**
	 *
	 * @param {any} parent
	 * @param {string} prop
	 * @param {number} index
	 */
	remove(parent, prop, index) {
		if (parent) {
			if (index !== null) {
				parent[prop].splice(index, 1);
			} else {
				delete parent[prop];
			}
		}
	}
}
