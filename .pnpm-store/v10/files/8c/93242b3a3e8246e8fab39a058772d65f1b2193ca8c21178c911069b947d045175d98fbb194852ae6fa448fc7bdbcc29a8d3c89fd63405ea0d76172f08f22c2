const require_rolldown_runtime = require('./_virtual/rolldown_runtime.js');
const require_meta = require('./meta.js');

//#region lib/processor.ts
function addDisableRule(disableRuleKeys, rule, key) {
	let keys = disableRuleKeys.get(rule);
	if (keys) keys.push(key);
	else {
		keys = [key];
		disableRuleKeys.set(rule, keys);
	}
}
function messageToKey(message) {
	return `line:${message.line},column${message.column - 1}`;
}
/**
* Compares the locations of two objects in a source file
* @param itemA The first object
* @param itemB The second object
* @returns A value less than 1 if itemA appears before itemB in the source file, greater than 1 if
* itemA appears after itemB in the source file, or 0 if itemA and itemB have the same location.
*/
function compareLocations(itemA, itemB) {
	return itemA.line - itemB.line || itemA.column - itemB.column;
}
var processor_default;
var init_processor = require_rolldown_runtime.__esmMin((() => {
	require_meta.init_meta();
	processor_default = {
		preprocess(code) {
			return [code];
		},
		postprocess(messages) {
			const state = {
				block: {
					disableAllKeys: /* @__PURE__ */ new Set(),
					disableRuleKeys: /* @__PURE__ */ new Map()
				},
				line: {
					disableAllKeys: /* @__PURE__ */ new Set(),
					disableRuleKeys: /* @__PURE__ */ new Map()
				}
			};
			const usedDisableDirectiveKeys = [];
			const unusedDisableDirectiveReports = /* @__PURE__ */ new Map();
			const filteredMessages = messages[0].filter((message) => {
				if (message.ruleId === "vue/comment-directive") {
					const directiveType = message.messageId;
					const data = message.message.split(" ");
					switch (directiveType) {
						case "disableBlock":
							state.block.disableAllKeys.add(data[1]);
							break;
						case "disableLine":
							state.line.disableAllKeys.add(data[1]);
							break;
						case "enableBlock":
							state.block.disableAllKeys.clear();
							break;
						case "enableLine":
							state.line.disableAllKeys.clear();
							break;
						case "disableBlockRule":
							addDisableRule(state.block.disableRuleKeys, data[1], data[2]);
							break;
						case "disableLineRule":
							addDisableRule(state.line.disableRuleKeys, data[1], data[2]);
							break;
						case "enableBlockRule":
							state.block.disableRuleKeys.delete(data[1]);
							break;
						case "enableLineRule":
							state.line.disableRuleKeys.delete(data[1]);
							break;
						case "clear":
							state.block.disableAllKeys.clear();
							state.block.disableRuleKeys.clear();
							state.line.disableAllKeys.clear();
							state.line.disableRuleKeys.clear();
							break;
						default:
							unusedDisableDirectiveReports.set(messageToKey(message), message);
							break;
					}
					return false;
				} else {
					const disableDirectiveKeys = [];
					if (state.block.disableAllKeys.size > 0) disableDirectiveKeys.push(...state.block.disableAllKeys);
					if (state.line.disableAllKeys.size > 0) disableDirectiveKeys.push(...state.line.disableAllKeys);
					if (message.ruleId) {
						const block = state.block.disableRuleKeys.get(message.ruleId);
						if (block) disableDirectiveKeys.push(...block);
						const line = state.line.disableRuleKeys.get(message.ruleId);
						if (line) disableDirectiveKeys.push(...line);
					}
					if (disableDirectiveKeys.length > 0) {
						usedDisableDirectiveKeys.push(...disableDirectiveKeys);
						return false;
					} else return true;
				}
			});
			if (unusedDisableDirectiveReports.size > 0) {
				for (const key of usedDisableDirectiveKeys) unusedDisableDirectiveReports.delete(key);
				filteredMessages.push(...unusedDisableDirectiveReports.values());
				filteredMessages.sort(compareLocations);
			}
			return filteredMessages;
		},
		supportsAutofix: true,
		meta: require_meta.default
	};
}));

//#endregion
init_processor();
exports.default = processor_default;
Object.defineProperty(exports, 'init_processor', {
  enumerable: true,
  get: function () {
    return init_processor;
  }
});