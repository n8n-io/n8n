import { DEFAULT_TOOL_POLICY_DENY_MESSAGE, parseToolPolicy } from './toolPolicies';

describe('parseToolPolicy', () => {
	it('should return undefined when no policy is configured', () => {
		expect(parseToolPolicy({})).toBeUndefined();
		expect(parseToolPolicy({ toolPolicyDefault: 'allow', toolPolicies: {} })).toBeUndefined();
	});

	it('should return a deny-by-default policy even without rules', () => {
		expect(parseToolPolicy({ toolPolicyDefault: 'deny' })).toEqual({
			defaultAction: 'deny',
			rules: [],
		});
	});

	it('should map a deny rule with a tool-used trigger', () => {
		const policy = parseToolPolicy({
			toolPolicies: {
				rules: [
					{
						name: '  No email after lookup  ',
						action: 'deny',
						tools: ['Send Email'],
						toolTypes: ['n8n-nodes-base.httpRequestTool'],
						trigger: 'toolUsed',
						afterTools: ['Read Customer DB'],
						afterToolTypes: ['n8n-nodes-base.postgresTool'],
						message: '  Not now  ',
					},
				],
			},
		});

		expect(policy).toEqual({
			defaultAction: 'allow',
			rules: [
				{
					id: 'rule-1',
					name: 'No email after lookup',
					action: 'deny',
					tools: [
						{ kind: 'tool', ref: { type: 'node', name: 'Send Email' } },
						{ kind: 'nodeType', value: 'n8n-nodes-base.httpRequestTool' },
					],
					when: {
						toolUsed: [
							{ kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } },
							{ kind: 'nodeType', value: 'n8n-nodes-base.postgresTool' },
						],
					},
					message: 'Not now',
				},
			],
		});
	});

	it('should map an always-on allow rule without condition or message', () => {
		const policy = parseToolPolicy({
			toolPolicyDefault: 'deny',
			toolPolicies: {
				rules: [{ action: 'allow', tools: ['Search Docs'], trigger: 'always', message: 'x' }],
			},
		});

		expect(policy?.rules).toEqual([
			{
				id: 'rule-1',
				action: 'allow',
				tools: [{ kind: 'tool', ref: { type: 'node', name: 'Search Docs' } }],
			},
		]);
	});

	it('should use the default message when a deny rule has none', () => {
		const policy = parseToolPolicy({
			toolPolicies: { rules: [{ action: 'deny', tools: ['A'], trigger: 'always', message: ' ' }] },
		});

		expect(policy?.rules[0].message).toBe(DEFAULT_TOOL_POLICY_DENY_MESSAGE);
	});

	it('should treat an unknown action as deny', () => {
		const policy = parseToolPolicy({
			toolPolicies: { rules: [{ action: 'maybe', tools: ['A'], trigger: 'always' }] },
		});

		expect(policy?.rules[0].action).toBe('deny');
	});

	it('should treat a missing trigger as tool-used, not always', () => {
		const policy = parseToolPolicy({
			toolPolicies: { rules: [{ action: 'allow', tools: ['A'], afterTools: ['B'] }] },
		});

		expect(policy?.rules[0].when).toEqual({
			toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'B' } }],
		});
	});

	it('should map an all-of-these-tools trigger to an all condition', () => {
		const policy = parseToolPolicy({
			toolPolicies: {
				rules: [
					{
						action: 'deny',
						tools: ['Send Email'],
						trigger: 'allToolsUsed',
						afterTools: ['Read Customer DB', 'Read Files'],
						afterToolTypes: ['n8n-nodes-base.postgresTool'],
					},
				],
			},
		});

		expect(policy?.rules[0].when).toEqual({
			all: [
				{ toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } }] },
				{ toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'Read Files' } }] },
				{ toolUsed: [{ kind: 'nodeType', value: 'n8n-nodes-base.postgresTool' }] },
			],
		});
	});

	it('should save an all-of trigger with one tool in the simple form', () => {
		const policy = parseToolPolicy({
			toolPolicies: {
				rules: [{ action: 'deny', tools: ['A'], trigger: 'allToolsUsed', afterTools: ['B'] }],
			},
		});

		expect(policy?.rules[0].when).toEqual({
			toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'B' } }],
		});
	});

	it('should map tool categories in tools and in the condition', () => {
		const policy = parseToolPolicy({
			toolPolicies: {
				rules: [
					{
						action: 'deny',
						toolCategories: ['sendsDataOut', 'unknown'],
						trigger: 'toolUsed',
						afterToolCategories: ['readsData'],
					},
				],
			},
		});

		expect(policy?.rules[0]).toMatchObject({
			tools: [{ kind: 'category', value: 'sendsDataOut' }],
			when: { toolUsed: [{ kind: 'category', value: 'readsData' }] },
		});
	});

	it('should add built-in policies before the custom rules', () => {
		const policy = parseToolPolicy({
			toolPolicyTemplates: ['preventDataLeaks', 'unknown'],
			toolPolicies: { rules: [{ action: 'deny', tools: ['A'], trigger: 'always' }] },
		});

		expect(policy?.defaultAction).toBe('allow');
		expect(policy?.rules.map((rule) => rule.id)).toEqual(['template-preventDataLeaks-1', 'rule-1']);
		expect(policy?.rules[0]).toEqual({
			id: 'template-preventDataLeaks-1',
			name: 'No sending data out after reading business data',
			action: 'deny',
			tools: [{ kind: 'category', value: 'sendsDataOut' }],
			when: { toolUsed: [{ kind: 'category', value: 'readsData' }] },
		});
	});

	it('should let the read-only built-in policy make the default deny', () => {
		const policy = parseToolPolicy({
			toolPolicyDefault: 'allow',
			toolPolicyTemplates: ['readOnly'],
		});

		expect(policy?.defaultAction).toBe('deny');
		expect(policy?.rules.map((rule) => rule.action)).toEqual(['allow', 'deny']);
	});

	it('should drop rules that can never apply, and keep the position as id', () => {
		const policy = parseToolPolicy({
			toolPolicies: {
				rules: [
					{ action: 'deny', tools: [], trigger: 'always' },
					{ action: 'deny', tools: ['A'], trigger: 'toolUsed', afterTools: [] },
					'not a rule',
					{ action: 'deny', tools: ['C'], trigger: 'always' },
				],
			},
		});

		expect(policy?.rules.map((r) => r.id)).toEqual(['rule-4']);
	});
});
