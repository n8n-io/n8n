import { packageRequirementsSchema } from '../requirements.schema';

describe('packageRequirementsSchema', () => {
	const credential = (id: string) => ({
		id,
		name: 'My Credential',
		type: 'httpBasicAuth',
		usedBy: [{ kind: 'workflow', id: 'wf-1' }],
	});
	const variable = (name: string) => ({ name, usedBy: [{ kind: 'workflow', id: 'wf-1' }] });
	const nodeType = (type: string, typeVersion: number) => ({
		type,
		typeVersion,
		usedBy: [{ kind: 'workflow', id: 'wf-1' }],
	});

	it('accepts distinct entries per section', () => {
		const requirements = {
			credentials: [credential('cred-1'), credential('cred-2')],
			variables: [variable('API_URL'), variable('REGION')],
			nodeTypes: [nodeType('n8n-nodes-base.set', 3), nodeType('n8n-nodes-base.set', 3.4)],
		};

		expect(() => packageRequirementsSchema.parse(requirements)).not.toThrow();
	});

	it('accepts a workflow requirement without a name', () => {
		const requirements = {
			workflows: [{ id: 'wf-dep', usedBy: [{ kind: 'workflow', id: 'wf-1' }] }],
		};

		expect(() => packageRequirementsSchema.parse(requirements)).not.toThrow();
	});

	it('rejects a workflow requirement with an empty name', () => {
		const requirements = {
			workflows: [{ id: 'wf-dep', name: '', usedBy: [{ kind: 'workflow', id: 'wf-1' }] }],
		};

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow();
	});

	it('rejects duplicate credential ids', () => {
		const requirements = { credentials: [credential('cred-1'), credential('cred-1')] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(
			/Duplicate credential id: cred-1/,
		);
	});

	it('rejects duplicate tag ids', () => {
		const tag = (id: string) => ({
			id,
			name: 'production',
			usedBy: [{ kind: 'workflow', id: 'wf-1' }],
		});
		const requirements = { tags: [tag('tag-1'), tag('tag-1')] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(/Duplicate tag id: tag-1/);
	});

	it('rejects duplicate variable names', () => {
		const requirements = { variables: [variable('API_URL'), variable('API_URL')] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(
			/Duplicate variable name: API_URL/,
		);
	});

	it('rejects duplicate node type pairs', () => {
		const requirements = {
			nodeTypes: [nodeType('n8n-nodes-base.set', 3), nodeType('n8n-nodes-base.set', 3)],
		};

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(
			/Duplicate node type: n8n-nodes-base.set@3/,
		);
	});

	it('rejects a non-finite node type version', () => {
		const requirements = { nodeTypes: [nodeType('n8n-nodes-base.set', Infinity)] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow();
	});

	describe.each([
		['credentials', { id: 'cred-1', name: 'Model', type: 'openAiApi' }],
		['workflows', { id: 'wf-1' }],
		['agents', { id: 'agent-1' }],
		['dataTables', { id: 'table-1', name: 'Customers' }],
		['variables', { name: 'REGION' }],
		['nodeTypes', { type: 'n8n-nodes-base.set', typeVersion: 3 }],
	])('%s consumer attribution', (collection, requirement) => {
		it.each([
			{ usedBy: [{ kind: 'agent', id: 'consumer' }] },
			{
				usedBy: [
					{ kind: 'workflow', id: 'consumer' },
					{ kind: 'agent', id: 'consumer' },
				],
			},
		])('accepts Agent and mixed consumers: %j', ({ usedBy }) => {
			const input = { [collection]: [{ ...requirement, usedBy }] };
			expect(packageRequirementsSchema.parse(input)).toEqual(input);
		});

		it.each([{}, { usedBy: [] }])('rejects missing consumers: %j', (usage) => {
			expect(() =>
				packageRequirementsSchema.parse({ [collection]: [{ ...requirement, ...usage }] }),
			).toThrow();
		});
	});

	it.each([
		{ usedBy: [{ kind: 'project', id: 'consumer' }] },
		{ usedBy: [{ kind: 'workflow', id: '' }] },
		{ usedBy: ['wf-1'] },
		{ usedByWorkflows: ['wf-1'] },
		{ usedByWorkflows: [], usedByAgents: ['agent-1'] },
	])('rejects invalid or legacy consumer references: %j', (usage) => {
		expect(() =>
			packageRequirementsSchema.parse({ variables: [{ name: 'REGION', ...usage }] }),
		).toThrow();
	});

	it('restricts tag consumers to workflows', () => {
		expect(() =>
			packageRequirementsSchema.parse({
				tags: [{ id: 'tag-1', name: 'production', usedBy: [{ kind: 'agent', id: 'agent-1' }] }],
			}),
		).toThrow();
	});

	it('accepts an ID-only credential for Agent consumers', () => {
		const requirements = {
			credentials: [{ id: 'cred-1', usedBy: [{ kind: 'agent', id: 'agent-1' }] }],
		};
		expect(packageRequirementsSchema.parse(requirements)).toEqual(requirements);
	});

	it.each([{ name: 'Model' }, { type: 'openAiApi' }, {}])(
		'requires credential names and types for mixed consumers: %j',
		(fields) => {
			expect(() =>
				packageRequirementsSchema.parse({
					credentials: [
						{
							id: 'cred-1',
							...fields,
							usedBy: [
								{ kind: 'workflow', id: 'wf-1' },
								{ kind: 'agent', id: 'agent-1' },
							],
						},
					],
				}),
			).toThrow(/required for workflow consumers/);
		},
	);

	it('rejects duplicate Agent requirement ids', () => {
		const agent = { id: 'agent-1', usedBy: [{ kind: 'agent', id: 'agent-consumer' }] };
		expect(() => packageRequirementsSchema.parse({ agents: [agent, agent] })).toThrow(
			/Duplicate Agent id/,
		);
	});
});
