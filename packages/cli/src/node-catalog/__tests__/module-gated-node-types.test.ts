import type { ModuleRegistry } from '@n8n/backend-common';

import { getModuleDisabledNotice } from '../module-gated-node-types';

function makeRegistry(agentsSettings: Record<string, unknown> | undefined): ModuleRegistry {
	return {
		isActive: (name: string) => name === 'agents',
		settings: new Map(agentsSettings ? [['agents', agentsSettings]] : []),
	} as unknown as ModuleRegistry;
}

describe('getModuleDisabledNotice', () => {
	const nodeType = 'n8n-nodes-base.agentDecisionTrigger';

	it('asks for the human-review module when agents are on', () => {
		expect(getModuleDisabledNotice(makeRegistry({ modules: [] }), nodeType)).toContain(
			'Enable human-review in N8N_AGENTS_MODULES',
		);
	});

	it('names the Settings switch when an admin turned agents off', () => {
		const notice = getModuleDisabledNotice(
			makeRegistry({ enabled: false, modules: ['human-review'] }),
			nodeType,
		);

		expect(notice).toContain('An admin turned "agents" off in the instance settings.');
		expect(notice).not.toContain('N8N_AGENTS_MODULES');
	});

	it('returns no notice when human review is on', () => {
		expect(
			getModuleDisabledNotice(makeRegistry({ modules: ['human-review'] }), nodeType),
		).toBeUndefined();
	});
});
