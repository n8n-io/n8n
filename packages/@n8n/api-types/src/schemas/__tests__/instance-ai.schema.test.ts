import {
	AI_GATEWAY_MANAGED_TAG,
	applyBranchReadOnlyOverrides,
	buildFetchUrlGrantKey,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	FETCH_URL_ALLOW_ALL_GRANT_KEY,
	InstanceAiAdminSettingsUpdateRequest,
	instanceAiEventSchema,
	isDisplayableConfirmationRequest,
	InstanceAiEnsureThreadRequest,
	normalizeInstanceAiThreadSource,
	INSTANCE_AI_THREAD_SOURCE_FALLBACK,
	isInstanceAiSandboxProvider,
	parseDomainAccessGrants,
	WEB_SEARCH_GRANT_KEY,
	workflowSetupNodeSchema,
	type InstanceAiConfirmationInputType,
	type InstanceAiConfirmationRequestPayload,
	type InstanceAiPermissions,
} from '../instance-ai.schema';

describe('sandbox provider', () => {
	it('accepts supported providers', () => {
		expect(isInstanceAiSandboxProvider('n8n-sandbox')).toBe(true);
		expect(isInstanceAiSandboxProvider('daytona')).toBe(true);
	});

	it('rejects unsupported or non-string providers', () => {
		expect(isInstanceAiSandboxProvider('local')).toBe(false);
		expect(isInstanceAiSandboxProvider('')).toBe(false);
		expect(isInstanceAiSandboxProvider(undefined)).toBe(false);
	});

	it('rejects unsupported providers on the admin settings update request', () => {
		expect(
			InstanceAiAdminSettingsUpdateRequest.safeParse({ sandboxProvider: 'local' }).success,
		).toBe(false);
		expect(
			InstanceAiAdminSettingsUpdateRequest.safeParse({ sandboxProvider: 'n8n-sandbox' }).success,
		).toBe(true);
	});
});

describe('instanceAiEventSchema', () => {
	it('preserves traceId on run-start events', () => {
		const event = {
			type: 'run-start',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { messageId: 'msg-1', traceId: 'trace-1' },
		};

		expect(instanceAiEventSchema.parse(event)).toEqual(event);
	});
});

describe('workflowSetupNodeSchema credentials', () => {
	const baseNode = {
		name: 'Gemini',
		type: 'n8n-nodes-base.lmChatGoogleGemini',
		typeVersion: 1,
		parameters: {},
		position: [0, 0] as [number, number],
		id: 'node-1',
	};

	it('accepts AI Gateway-managed credential entries', () => {
		const result = workflowSetupNodeSchema.safeParse({
			node: {
				...baseNode,
				credentials: { googlePalmApi: { id: null, name: '', __aiGatewayManaged: true } },
			},
			isTrigger: false,
		});

		expect(result.success).toBe(true);
		expect(result.data?.node.credentials?.googlePalmApi).toEqual({
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});
	});

	it('accepts real credential entries', () => {
		const result = workflowSetupNodeSchema.safeParse({
			node: {
				...baseNode,
				credentials: { googlePalmApi: { id: 'cred-123', name: 'My Gemini' } },
			},
			isTrigger: false,
		});

		expect(result.success).toBe(true);
		expect(result.data?.node.credentials?.googlePalmApi?.id).toBe('cred-123');
	});

	it('rejects null id without __aiGatewayManaged: true', () => {
		const result = workflowSetupNodeSchema.safeParse({
			node: {
				...baseNode,
				credentials: { googlePalmApi: { id: null, name: 'My Cred' } },
			},
			isTrigger: false,
		});

		expect(result.success).toBe(false);
	});

	it('exports the shared AI Gateway-managed setup tag', () => {
		expect(AI_GATEWAY_MANAGED_TAG).toBe('__AI_GATEWAY_MANAGED__');
	});
});

describe('applyBranchReadOnlyOverrides', () => {
	it('should block all write permissions while preserving safe ones', () => {
		const result = applyBranchReadOnlyOverrides({ ...DEFAULT_INSTANCE_AI_PERMISSIONS });

		// These should remain unchanged (safe for read-only instances)
		expect(result.readFilesystem).toBe('require_approval');
		expect(result.fetchUrl).toBe('require_approval');
		expect(result.publishWorkflow).toBe('require_approval');
		expect(result.deleteCredential).toBe('require_approval');
		expect(result.restoreWorkflowVersion).toBe('require_approval');

		// These should all be blocked
		expect(result.createWorkflow).toBe('blocked');
		expect(result.updateWorkflow).toBe('blocked');
		expect(result.runWorkflow).toBe('blocked');
		expect(result.deleteWorkflow).toBe('blocked');
		expect(result.createFolder).toBe('blocked');
		expect(result.deleteFolder).toBe('blocked');
		expect(result.moveWorkflowToFolder).toBe('blocked');
		expect(result.tagWorkflow).toBe('blocked');
		expect(result.createDataTable).toBe('blocked');
		expect(result.deleteDataTable).toBe('blocked');
		expect(result.mutateDataTableSchema).toBe('blocked');
		expect(result.mutateDataTableRows).toBe('blocked');
		expect(result.cleanupTestExecutions).toBe('blocked');
	});

	it('should preserve safe permissions even when set to always_allow', () => {
		const permissions: InstanceAiPermissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			publishWorkflow: 'always_allow',
			deleteCredential: 'always_allow',
			readFilesystem: 'always_allow',
		};

		const result = applyBranchReadOnlyOverrides(permissions);

		expect(result.publishWorkflow).toBe('always_allow');
		expect(result.deleteCredential).toBe('always_allow');
		expect(result.readFilesystem).toBe('always_allow');
	});

	it('should not mutate the original permissions object', () => {
		const original = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };
		applyBranchReadOnlyOverrides(original);

		expect(original.createWorkflow).toBe('require_approval');
	});
});

function makeConfirmation(
	overrides: Partial<InstanceAiConfirmationRequestPayload> = {},
): InstanceAiConfirmationRequestPayload {
	return {
		requestId: 'req-1',
		toolCallId: 'tc-1',
		toolName: 'tool',
		args: {},
		severity: 'info',
		message: 'Please approve',
		...overrides,
	};
}

describe('isDisplayableConfirmationRequest', () => {
	it('treats approval and text messages as displayable', () => {
		expect(isDisplayableConfirmationRequest(makeConfirmation({ inputType: 'approval' }))).toBe(
			true,
		);
		expect(isDisplayableConfirmationRequest(makeConfirmation({ inputType: 'text' }))).toBe(true);
	});

	it('does not treat metadata-only approval prompts as displayable', () => {
		expect(isDisplayableConfirmationRequest(makeConfirmation({ message: '   ' }))).toBe(false);
	});

	it('does not treat intro-only questions prompts as displayable', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'questions',
					message: '',
					introMessage: 'A little context before the questions',
				}),
			),
		).toBe(false);
	});

	it('recognizes typed display variants', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'questions',
					message: '',
					questions: [{ id: 'q1', question: 'Pick one', type: 'single', options: ['A'] }],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					planItems: [{ id: 'task-1', title: 'Task', kind: 'delegate', spec: 'Do it', deps: [] }],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'resource-decision',
					message: '',
					resourceDecision: {
						toolGroup: 'filesystem',
						resource: '/tmp',
						description: 'Access /tmp',
						options: ['allowForSession'],
					},
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					setupRequests: [
						{
							node: {
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 1,
								parameters: {},
								position: [0, 0],
								id: 'node-1',
							},
							isTrigger: true,
						},
					],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					credentialRequests: [
						{ credentialType: 'httpBasicAuth', reason: 'Required', existingCredentials: [] },
					],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					domainAccess: { url: 'https://example.com', host: 'example.com' },
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
				}),
			),
		).toBe(true);
	});

	it('does not treat credential flow metadata as displayable on its own', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					credentialFlow: { stage: 'finalize' },
				}),
			),
		).toBe(false);
	});

	it('does not treat lightweight task lists as displayable plan reviews', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					tasks: {
						tasks: [{ id: 'task-1', description: 'Do it', status: 'todo' }],
					},
				}),
			),
		).toBe(false);
	});

	it('recognizes only renderable task args for plan reviews', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					args: {
						tasks: [{ id: 'task-1', title: 'Task', kind: 'delegate', spec: 'Do it', deps: [] }],
					},
				}),
			),
		).toBe(true);

		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					args: {
						tasks: [{ id: 'task-1', description: 'Do it', status: 'todo' }],
					},
				}),
			),
		).toBe(false);
	});

	it('keeps the input type switch exhaustive', () => {
		const handled = {
			approval: true,
			text: true,
			questions: true,
			'plan-review': true,
			'resource-decision': true,
			continue: true,
		} satisfies Record<InstanceAiConfirmationInputType, true>;

		expect(Object.keys(handled)).toHaveLength(6);
	});
});

describe('instance-ai launch schema', () => {
	it('normalizes a known source', () => {
		expect(normalizeInstanceAiThreadSource('template-view')).toBe('template-view');
	});

	it('falls back for an unknown source', () => {
		expect(normalizeInstanceAiThreadSource('totally-made-up')).toBe(
			INSTANCE_AI_THREAD_SOURCE_FALLBACK,
		);
		expect(normalizeInstanceAiThreadSource(undefined)).toBe(INSTANCE_AI_THREAD_SOURCE_FALLBACK);
	});

	it('parses an ensure-thread request with launch fields', () => {
		const parsed = new InstanceAiEnsureThreadRequest({
			projectId: 'project-1',
			origin: 'external',
			source: 'website-template',
			sourceContext: { templateId: '42' },
		});
		expect(parsed.origin).toBe('external');
		expect(parsed.sourceContext).toEqual({ templateId: '42' });
	});

	it('rejects an oversized sourceContext', () => {
		const big = { blob: 'x'.repeat(3000) };
		expect(
			() => new InstanceAiEnsureThreadRequest({ projectId: 'project-1', sourceContext: big }),
		).toThrow();
	});
});

describe('domain-access grant keys', () => {
	it('builds and parses per-host grant keys round-trip', () => {
		const key = buildFetchUrlGrantKey('example.com');
		expect(key).toBe('fetch-url:example.com');

		const parsed = parseDomainAccessGrants(new Set([key]));
		expect(parsed.approvedDomains.has('example.com')).toBe(true);
		expect(parsed.allDomainsApproved).toBe(false);
		expect(parsed.webSearchApproved).toBe(false);
	});

	it('parses the blanket allow-all and web-search keys', () => {
		const parsed = parseDomainAccessGrants(
			new Set([FETCH_URL_ALLOW_ALL_GRANT_KEY, WEB_SEARCH_GRANT_KEY]),
		);
		expect(parsed.allDomainsApproved).toBe(true);
		expect(parsed.webSearchApproved).toBe(true);
		expect(parsed.approvedDomains.size).toBe(0);
	});

	it('ignores unrelated grant keys (e.g. executions:run)', () => {
		const parsed = parseDomainAccessGrants(
			new Set([buildFetchUrlGrantKey('a.com'), 'executions:run:wf-1']),
		);
		expect(parsed.approvedDomains).toEqual(new Set(['a.com']));
		expect(parsed.allDomainsApproved).toBe(false);
		expect(parsed.webSearchApproved).toBe(false);
	});

	it('does not treat the allow-all key as a host', () => {
		const parsed = parseDomainAccessGrants(new Set([FETCH_URL_ALLOW_ALL_GRANT_KEY]));
		expect(parsed.approvedDomains.size).toBe(0);
		expect(parsed.allDomainsApproved).toBe(true);
	});
});
