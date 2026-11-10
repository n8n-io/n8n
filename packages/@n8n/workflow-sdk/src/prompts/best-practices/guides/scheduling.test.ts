import { SchedulingBestPractices } from './scheduling';

describe('SchedulingBestPractices', () => {
	it('names the real Data Table node type', () => {
		const documentation = new SchedulingBestPractices().getDocumentation();

		expect(documentation).toContain('(n8n-nodes-base.dataTable)');
		expect(documentation).not.toContain('n8n-nodes-base.n8nTables');
	});
});
