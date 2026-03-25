(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.estreeWalker = {}));
}(this, (function (exports) { 'use strict';

	// @ts-check
	/** @typedef { import('estree').BaseNode} BaseNode */

	/** @typedef {{
		skip: () => void;
		remove: () => void;
		replace: (node: BaseNode) => void;
	}} WalkerContext */

	class WalkerBase {
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

	// @ts-check

	/** @typedef { import('estree').BaseNode} BaseNode */
	/** @typedef { import('./walker.js').WalkerContext} WalkerContext */

	/** @typedef {(
	 *    this: WalkerContext,
	 *    node: BaseNode,
	 *    parent: BaseNode,
	 *    key: string,
	 *    index: number
	 * ) => void} SyncHandler */

	class SyncWalker extends WalkerBase {
		/**
		 *
		 * @param {SyncHandler} enter
		 * @param {SyncHandler} leave
		 */
		constructor(enter, leave) {
			super();

			/** @type {SyncHandler} */
			this.enter = enter;

			/** @type {SyncHandler} */
			this.leave = leave;
		}

		/**
		 *
		 * @param {BaseNode} node
		 * @param {BaseNode} parent
		 * @param {string} [prop]
		 * @param {number} [index]
		 * @returns {BaseNode}
		 */
		visit(node, parent, prop, index) {
			if (node) {
				if (this.enter) {
					const _should_skip = this.should_skip;
					const _should_remove = this.should_remove;
					const _replacement = this.replacement;
					this.should_skip = false;
					this.should_remove = false;
					this.replacement = null;

					this.enter.call(this.context, node, parent, prop, index);

					if (this.replacement) {
						node = this.replacement;
						this.replace(parent, prop, index, node);
					}

					if (this.should_remove) {
						this.remove(parent, prop, index);
					}

					const skipped = this.should_skip;
					const removed = this.should_remove;

					this.should_skip = _should_skip;
					this.should_remove = _should_remove;
					this.replacement = _replacement;

					if (skipped) return node;
					if (removed) return null;
				}

				for (const key in node) {
					const value = node[key];

					if (typeof value !== "object") {
						continue;
					} else if (Array.isArray(value)) {
						for (let i = 0; i < value.length; i += 1) {
							if (value[i] !== null && typeof value[i].type === 'string') {
								if (!this.visit(value[i], node, key, i)) {
									// removed
									i--;
								}
							}
						}
					} else if (value !== null && typeof value.type === "string") {
						this.visit(value, node, key, null);
					}
				}

				if (this.leave) {
					const _replacement = this.replacement;
					const _should_remove = this.should_remove;
					this.replacement = null;
					this.should_remove = false;

					this.leave.call(this.context, node, parent, prop, index);

					if (this.replacement) {
						node = this.replacement;
						this.replace(parent, prop, index, node);
					}

					if (this.should_remove) {
						this.remove(parent, prop, index);
					}

					const removed = this.should_remove;

					this.replacement = _replacement;
					this.should_remove = _should_remove;

					if (removed) return null;
				}
			}

			return node;
		}
	}

	// @ts-check

	/** @typedef { import('estree').BaseNode} BaseNode */
	/** @typedef { import('./walker').WalkerContext} WalkerContext */

	/** @typedef {(
	 *    this: WalkerContext,
	 *    node: BaseNode,
	 *    parent: BaseNode,
	 *    key: string,
	 *    index: number
	 * ) => Promise<void>} AsyncHandler */

	class AsyncWalker extends WalkerBase {
		/**
		 *
		 * @param {AsyncHandler} enter
		 * @param {AsyncHandler} leave
		 */
		constructor(enter, leave) {
			super();

			/** @type {AsyncHandler} */
			this.enter = enter;

			/** @type {AsyncHandler} */
			this.leave = leave;
		}

		/**
		 *
		 * @param {BaseNode} node
		 * @param {BaseNode} parent
		 * @param {string} [prop]
		 * @param {number} [index]
		 * @returns {Promise<BaseNode>}
		 */
		async visit(node, parent, prop, index) {
			if (node) {
				if (this.enter) {
					const _should_skip = this.should_skip;
					const _should_remove = this.should_remove;
					const _replacement = this.replacement;
					this.should_skip = false;
					this.should_remove = false;
					this.replacement = null;

					await this.enter.call(this.context, node, parent, prop, index);

					if (this.replacement) {
						node = this.replacement;
						this.replace(parent, prop, index, node);
					}

					if (this.should_remove) {
						this.remove(parent, prop, index);
					}

					const skipped = this.should_skip;
					const removed = this.should_remove;

					this.should_skip = _should_skip;
					this.should_remove = _should_remove;
					this.replacement = _replacement;

					if (skipped) return node;
					if (removed) return null;
				}

				for (const key in node) {
					const value = node[key];

					if (typeof value !== "object") {
						continue;
					} else if (Array.isArray(value)) {
						for (let i = 0; i < value.length; i += 1) {
							if (value[i] !== null && typeof value[i].type === 'string') {
								if (!(await this.visit(value[i], node, key, i))) {
									// removed
									i--;
								}
							}
						}
					} else if (value !== null && typeof value.type === "string") {
						await this.visit(value, node, key, null);
					}
				}

				if (this.leave) {
					const _replacement = this.replacement;
					const _should_remove = this.should_remove;
					this.replacement = null;
					this.should_remove = false;

					await this.leave.call(this.context, node, parent, prop, index);

					if (this.replacement) {
						node = this.replacement;
						this.replace(parent, prop, index, node);
					}

					if (this.should_remove) {
						this.remove(parent, prop, index);
					}

					const removed = this.should_remove;

					this.replacement = _replacement;
					this.should_remove = _should_remove;

					if (removed) return null;
				}
			}

			return node;
		}
	}

	// @ts-check

	/** @typedef { import('estree').BaseNode} BaseNode */
	/** @typedef { import('./sync.js').SyncHandler} SyncHandler */
	/** @typedef { import('./async.js').AsyncHandler} AsyncHandler */

	/**
	 *
	 * @param {BaseNode} ast
	 * @param {{
	 *   enter?: SyncHandler
	 *   leave?: SyncHandler
	 * }} walker
	 * @returns {BaseNode}
	 */
	function walk(ast, { enter, leave }) {
		const instance = new SyncWalker(enter, leave);
		return instance.visit(ast, null);
	}

	/**
	 *
	 * @param {BaseNode} ast
	 * @param {{
	 *   enter?: AsyncHandler
	 *   leave?: AsyncHandler
	 * }} walker
	 * @returns {Promise<BaseNode>}
	 */
	async function asyncWalk(ast, { enter, leave }) {
		const instance = new AsyncWalker(enter, leave);
		return await instance.visit(ast, null);
	}

	exports.asyncWalk = asyncWalk;
	exports.walk = walk;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
