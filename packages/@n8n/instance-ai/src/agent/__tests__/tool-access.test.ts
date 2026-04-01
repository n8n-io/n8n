import type { ToolsInput } from '@mastra/core/agent';

import { getOrchestratorDomainTools } from '../tool-access';

describe('getOrchestratorDomainTools', () => {
	it('keeps user-facing template search but excludes builder-only template tools', () => {
		const tools = {
			'search-workflow-templates': { id: 'search-workflow-templates' },
			'search-template-structures': { id: 'search-template-structures' },
			'search-template-parameters': { id: 'search-template-parameters' },
			'build-workflow': { id: 'build-workflow' },
			'query-data-table-rows': { id: 'query-data-table-rows' },
			'create-data-table': { id: 'create-data-table' },
		} as unknown as ToolsInput;

		const result = getOrchestratorDomainTools(tools);

		expect(result['search-workflow-templates']).toBeDefined();
		expect(result['query-data-table-rows']).toBeDefined();
		expect(result['search-template-structures']).toBeUndefined();
		expect(result['search-template-parameters']).toBeUndefined();
		expect(result['build-workflow']).toBeUndefined();
		expect(result['create-data-table']).toBeUndefined();
	});
});
