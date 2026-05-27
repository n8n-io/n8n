import { WORKFLOW_RULES } from './workflow-rules';

describe('WORKFLOW_RULES', () => {
	it('forbids synthesized credential ids and treats availableCredentials as an allow-list', () => {
		expect(WORKFLOW_RULES).toContain('availableCredentials');
		expect(WORKFLOW_RULES).toContain('allow-list');
		expect(WORKFLOW_RULES).toContain('Never synthesize credential IDs');
		expect(WORKFLOW_RULES).toContain('mock-*');
	});
});
