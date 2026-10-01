import {
	isCommittingCall,
	isCommittingDataTablesAction,
	isMutatingDataTablesAction,
} from '../../routing/route-rules';

describe('isCommittingCall', () => {
	it.each([
		['build-agent', { operation: 'create' }],
		['build-workflow', {}],
		['create-tasks', {}],
		['ask-user', { questions: [] }],
		['nodes', { action: 'execute' }],
		['executions', { action: 'run' }],
		['executions', { action: 'debug' }],
		['executions', { action: 'stop' }],
		['data-tables', { action: 'insert-rows' }],
		['data-tables', { action: 'update-rows' }],
		['data-tables', { action: 'delete-rows' }],
		['data-tables', { action: 'upsert-rows' }],
		['data-tables', { action: 'delete' }],
		['workflows', { action: 'delete' }],
		['workflows', { action: 'publish' }],
	])('treats %s %j as committing', (toolName, args) => {
		expect(isCommittingCall(toolName, args)).toBe(true);
	});

	it.each([
		['load_skill', { skillId: 'intent-recognition' }],
		['load_skill', { skillId: 'debugging-executions' }],
		['search_tools', { query: 'agent' }],
		['n8n-docs', { query: 'credentials' }],
		['research', { action: 'web-search' }],
		['nodes', { action: 'search' }],
		['executions', { action: 'list' }],
		['executions', { action: 'get' }],
		['data-tables', { action: 'list' }],
		['data-tables', { action: 'query' }],
		['data-tables', { action: 'schema' }],
		['data-tables', { action: 'create' }],
		['data-tables', { action: 'add-column' }],
		['data-tables', { action: 'rename-column' }],
		['data-tables', { action: 'delete-column' }],
		['data-tables', {}],
		['workflows', { action: 'list' }],
		['workflows', { action: 'get-as-code' }],
		['workflows', { action: 'validate' }],
		['workflows', {}],
		['credentials', { action: 'list' }],
	])('treats %s %j as exploration', (toolName, args) => {
		expect(isCommittingCall(toolName, args)).toBe(false);
	});
});

describe('data-tables actions', () => {
	it('counts schema setup as mutating but not committing', () => {
		expect(isMutatingDataTablesAction('create')).toBe(true);
		expect(isCommittingDataTablesAction('create')).toBe(false);
	});

	it('counts row writes as mutating and committing', () => {
		expect(isMutatingDataTablesAction('insert-rows')).toBe(true);
		expect(isCommittingDataTablesAction('insert-rows')).toBe(true);
	});

	it('counts reads and a missing action as neither', () => {
		for (const action of ['list', 'get', 'query', 'schema', undefined]) {
			expect(isMutatingDataTablesAction(action)).toBe(false);
			expect(isCommittingDataTablesAction(action)).toBe(false);
		}
	});
});
