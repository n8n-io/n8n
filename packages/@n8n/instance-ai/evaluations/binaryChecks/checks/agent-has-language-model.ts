import type { BinaryCheck } from '../types';
import { AGENT_TYPE, collectTargetsByConnectionType } from '../utils';

export const agentHasLanguageModel: BinaryCheck = {
	name: 'agent_has_language_model',
	description: 'Agent nodes have a language model connected',
	kind: 'deterministic',
	run(workflow) {
		const nodes = (workflow.nodes ?? []).filter((n) => n.type === AGENT_TYPE);
		if (nodes.length === 0) return { pass: true };

		const lmTargets = collectTargetsByConnectionType(
			workflow.connections ?? {},
			'ai_languageModel',
		);
		const missing = nodes.filter((n) => !lmTargets.has(n.name)).map((n) => n.name);

		return {
			pass: missing.length === 0,
			...(missing.length > 0
				? { comment: `Agent node(s) missing language model connection: ${missing.join(', ')}` }
				: {}),
		};
	},
};
