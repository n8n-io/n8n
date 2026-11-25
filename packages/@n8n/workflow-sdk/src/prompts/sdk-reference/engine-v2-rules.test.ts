import { NODE_TYPE_DENYLIST } from '@n8n/workflow-engine-check';

import {
	getBlockedEngineV2Limits,
	getBlockedEngineV2NodeSettingRules,
	getEngineV2BuildRules,
} from './engine-v2-rules';
import { ENGINE_V2_NODE_SETTING_RULES } from '../../validation/engine-v2-support';

describe('getEngineV2BuildRules', () => {
	const rules = getEngineV2BuildRules();

	it('lists the node types that the engine check blocks', () => {
		expect(rules).toContain('`n8n-nodes-base.formTrigger`');
		expect(rules).toContain('every node whose type starts with `@n8n/n8n-nodes-langchain.`');
		// The package prefix already covers these types.
		expect(rules).not.toContain('`@n8n/n8n-nodes-langchain.chatTrigger`');
		expect(rules).not.toContain('`@n8n/n8n-nodes-langchain.mcpTrigger`');
		for (const entry of NODE_TYPE_DENYLIST) {
			if (entry.type.startsWith('@n8n/n8n-nodes-langchain.')) continue;
			expect(rules).toContain(`\`${entry.type}\``);
		}
	});

	it('lists the workflow-level limits that the engine check blocks', () => {
		expect(rules).toContain('community and custom nodes');
		expect(rules).toContain('error workflows');
		expect(rules).toContain('the Merge mode "Choose Branch"');
	});

	it('reports each blocked limit by its id', () => {
		// Every limit is blocked today. A limit leaves this set when engine v2 supports it.
		expect([...getBlockedEngineV2Limits()].sort()).toEqual([
			'community-nodes',
			'error-workflows',
			'merge-choose-branch',
		]);
	});

	it('keeps a node setting rule only while the engine check blocks the setting', () => {
		// Every setting is blocked today. A rule leaves this list when engine v2 supports it.
		expect(Object.keys(getBlockedEngineV2NodeSettingRules()).sort()).toEqual(
			Object.keys(ENGINE_V2_NODE_SETTING_RULES).sort(),
		);
	});

	it('uses the validation text for each node setting', () => {
		for (const rule of Object.values(ENGINE_V2_NODE_SETTING_RULES)) {
			expect(rules).toContain(`${rule.setting}: ${rule.text}`);
		}
		expect(rules).toContain('add a Limit node (1 item) before this node');
		expect(rules).toContain("`onError: 'continueRegularOutput'` is v2-safe");
	});
});
