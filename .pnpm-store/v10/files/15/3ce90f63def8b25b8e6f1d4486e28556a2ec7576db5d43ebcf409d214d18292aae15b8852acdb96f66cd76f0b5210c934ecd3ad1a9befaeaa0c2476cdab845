'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/use-v-on-exact.js
/**
* @fileoverview enforce usage of `exact` modifier on `v-on`.
* @author Armano
*/
var require_use_v_on_exact = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	/**
	* @typedef { {name: string, node: VDirectiveKey, modifiers: string[] } } EventDirective
	*/
	const utils = require_index.default;
	const SYSTEM_MODIFIERS = new Set([
		"ctrl",
		"shift",
		"alt",
		"meta"
	]);
	const GLOBAL_MODIFIERS = new Set([
		"stop",
		"prevent",
		"capture",
		"self",
		"once",
		"passive",
		"native"
	]);
	/**
	* Finds and returns all keys for event directives
	*
	* @param {VStartTag} startTag Element startTag
	* @param {SourceCode} sourceCode The source code object.
	* @returns {EventDirective[]} [{ name, node, modifiers }]
	*/
	function getEventDirectives(startTag, sourceCode) {
		return utils.getDirectives(startTag, "on").map((attribute) => ({
			name: attribute.key.argument ? sourceCode.getText(attribute.key.argument) : "",
			node: attribute.key,
			modifiers: attribute.key.modifiers.map((modifier) => modifier.name)
		}));
	}
	/**
	* Checks whether given modifier is key modifier
	*
	* @param {string} modifier
	* @returns {boolean}
	*/
	function isKeyModifier(modifier) {
		return !GLOBAL_MODIFIERS.has(modifier) && !SYSTEM_MODIFIERS.has(modifier);
	}
	/**
	* Checks whether given modifier is system one
	*
	* @param {string} modifier
	* @returns {boolean}
	*/
	function isSystemModifier(modifier) {
		return SYSTEM_MODIFIERS.has(modifier);
	}
	/**
	* Checks whether given any of provided modifiers
	* has system modifier
	*
	* @param {string[]} modifiers
	* @returns {boolean}
	*/
	function hasSystemModifier(modifiers) {
		return modifiers.some(isSystemModifier);
	}
	/**
	* Groups all events in object,
	* with keys represinting each event name
	*
	* @param {EventDirective[]} events
	* @returns { { [key: string]: EventDirective[] } } { click: [], keypress: [] }
	*/
	function groupEvents(events) {
		/** @type { { [key: string]: EventDirective[] } } */
		const grouped = {};
		for (const event of events) {
			if (!grouped[event.name]) grouped[event.name] = [];
			grouped[event.name].push(event);
		}
		return grouped;
	}
	/**
	* Creates alphabetically sorted string with system modifiers
	*
	* @param {string[]} modifiers
	* @returns {string} e.g. "alt,ctrl,del,shift"
	*/
	function getSystemModifiersString(modifiers) {
		return modifiers.filter(isSystemModifier).sort().join(",");
	}
	/**
	* Creates alphabetically sorted string with key modifiers
	*
	* @param {string[]} modifiers
	* @returns {string} e.g. "enter,tab"
	*/
	function getKeyModifiersString(modifiers) {
		return modifiers.filter(isKeyModifier).sort().join(",");
	}
	/**
	* Compares two events based on their modifiers
	* to detect possible event leakeage
	*
	* @param {EventDirective} baseEvent
	* @param {EventDirective} event
	* @returns {boolean}
	*/
	function hasConflictedModifiers(baseEvent, event) {
		if (event.node === baseEvent.node || event.modifiers.includes("exact")) return false;
		const eventKeyModifiers = getKeyModifiersString(event.modifiers);
		const baseEventKeyModifiers = getKeyModifiersString(baseEvent.modifiers);
		if (eventKeyModifiers && baseEventKeyModifiers && eventKeyModifiers !== baseEventKeyModifiers) return false;
		const eventSystemModifiers = getSystemModifiersString(event.modifiers);
		const baseEventSystemModifiers = getSystemModifiersString(baseEvent.modifiers);
		return baseEvent.modifiers.length > 0 && baseEventSystemModifiers !== eventSystemModifiers && baseEventSystemModifiers.includes(eventSystemModifiers);
	}
	/**
	* Searches for events that might conflict with each other
	*
	* @param {EventDirective[]} events
	* @returns {EventDirective[]} conflicted events, without duplicates
	*/
	function findConflictedEvents(events) {
		/** @type {EventDirective[]} */
		const conflictedEvents = [];
		for (const event of events) conflictedEvents.push(...events.filter((evt) => !conflictedEvents.includes(evt)).filter(hasConflictedModifiers.bind(null, event)));
		return conflictedEvents;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce usage of `exact` modifier on `v-on`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/use-v-on-exact.html"
			},
			fixable: null,
			schema: [],
			messages: { considerExact: "Consider to use '.exact' modifier." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			return utils.defineTemplateBodyVisitor(context, { VStartTag(node) {
				if (node.attributes.length === 0) return;
				const isCustomComponent = utils.isCustomComponent(node.parent);
				let events = getEventDirectives(node, sourceCode);
				if (isCustomComponent) events = events.filter((event) => event.modifiers.includes("native"));
				const grouppedEvents = groupEvents(events);
				for (const eventName of Object.keys(grouppedEvents)) {
					const eventsInGroup = grouppedEvents[eventName];
					if (!eventsInGroup.some((event) => hasSystemModifier(event.modifiers))) continue;
					const conflictedEvents = findConflictedEvents(eventsInGroup);
					for (const e of conflictedEvents) context.report({
						node: e.node,
						loc: e.node.loc,
						messageId: "considerExact"
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_use_v_on_exact();
  }
});