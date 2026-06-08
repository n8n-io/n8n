import { WORKFLOW_RULES } from './workflow-rules';

describe('WORKFLOW_RULES', () => {
	it('forbids synthesized credential ids and treats availableCredentials as an allow-list', () => {
		expect(WORKFLOW_RULES).toContain('availableCredentials');
		expect(WORKFLOW_RULES).toContain('allow-list');
		expect(WORKFLOW_RULES).toContain('Never synthesize credential IDs');
		expect(WORKFLOW_RULES).toContain('mock-*');
	});

	it('connects duplicate item-flow symptoms to executeOnce', () => {
		expect(WORKFLOW_RULES).toContain('fetches shared context independently');
		expect(WORKFLOW_RULES).toContain('Duplicate notifications');
		expect(WORKFLOW_RULES).toContain('missing `executeOnce: true`');
	});

	it('requires action nodes after predicate-only routing', () => {
		expect(WORKFLOW_RULES).toContain('A Filter or IF only selects items');
		expect(WORKFLOW_RULES).toContain('wire the corresponding action node on the matching path');
	});
});
