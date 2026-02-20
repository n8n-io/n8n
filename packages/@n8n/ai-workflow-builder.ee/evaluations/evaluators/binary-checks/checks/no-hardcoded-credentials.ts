import { validateCredentials } from '@/validation/checks';

import type { BinaryCheck, SimpleWorkflow } from '../types';

export const noHardcodedCredentials: BinaryCheck = {
	name: 'no_hardcoded_credentials',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		const violations = validateCredentials(workflow);
		return {
			pass: violations.length === 0,
			...(violations.length > 0
				? { comment: violations.map((v) => v.description).join('; ') }
				: {}),
		};
	},
};
