import { validateAgentPrompt } from '@/validation/checks';

import type { BinaryCheck, SimpleWorkflow } from '../types';

export const agentHasDynamicPrompt: BinaryCheck = {
	name: 'agent_has_dynamic_prompt',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		const violations = validateAgentPrompt(workflow);
		const failed = violations.some((v) => v.name === 'agent-static-prompt');
		return {
			pass: !failed,
			...(failed
				? {
						comment: violations
							.filter((v) => v.name === 'agent-static-prompt')
							.map((v) => v.description)
							.join('; '),
					}
				: {}),
		};
	},
};
