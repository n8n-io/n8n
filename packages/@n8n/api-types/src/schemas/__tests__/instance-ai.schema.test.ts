import {
	AI_GATEWAY_MANAGED_TAG,
	base64EncodedSize,
	exceedsAttachmentSizeLimit,
	formatAttachmentSizeLimit,
	formatTotalAttachmentSizeLimit,
	MAX_ATTACHMENT_DECODED_BYTES,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
	MAX_TOTAL_ATTACHMENT_DECODED_BYTES,
	instanceAiFileAttachmentSchema,
	MAX_ATTACHMENT_BASE64_BYTES,
	applyBranchReadOnlyOverrides,
	buildDataTablesSessionGrantKey,
	buildUpdateWorkflowSessionGrantKey,
	buildSetupSkipGrantKey,
	parseSetupSkipGrants,
	buildFetchUrlGrantKey,
	confirmationRequestPayloadSchema,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	errorPayloadSchema,
	FETCH_URL_ALLOW_ALL_GRANT_KEY,
	InstanceAiAdminSettingsUpdateRequest,
	instanceAiEventSchema,
	INSTANCE_AI_EPHEMERAL_EVENT_TYPES,
	isDisplayableConfirmationRequest,
	InstanceAiEnsureThreadRequest,
	findUnbackedSeedWorkflowTools,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiThreadMessagesQuery,
	INSTANCE_AI_THREAD_MESSAGES_DEFAULT_LIMIT,
	INSTANCE_AI_THREAD_MESSAGES_MAX_LIMIT,
	INSTANCE_AI_THREAD_MESSAGES_MAX_PAGE,
	instanceAiEvalSeedAgentSchema,
	instanceAiAttachmentSchema,
	instanceAiResourceAttachmentSchema,
	INSTANCE_AI_THREAD_SOURCES,
	isInstanceAiSandboxProvider,
	isKnownInstanceAiErrorCode,
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

	it('parses setup-items events (the FE drops any type failing this parse)', () => {
		const event = {
			type: 'setup-items',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				workflowId: 'wf-1',
				items: [
					{
						id: 'wf-1:credential:slackApi',
						workflowId: 'wf-1',
						kind: 'credential',
						credentialType: 'slackApi',
						nodeBindings: [{ nodeName: 'Send message' }],
					},
				],
			},
		};

		expect(instanceAiEventSchema.parse(event)).toEqual(event);
	});

	it('keeps setup-items durable (not ephemeral) so snapshots survive refresh', () => {
		expect(INSTANCE_AI_EPHEMERAL_EVENT_TYPES.has('setup-items')).toBe(false);
	});

	it('drops malformed or unknown-kind items individually instead of failing the event', () => {
		const event = {
			type: 'setup-items',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				workflowId: 'wf-1',
				items: [
					// Missing credentialType.
					{ id: 'wf-1:credential:slackApi', workflowId: 'wf-1', kind: 'credential' },
					// A kind this client predates.
					{ id: 'wf-1:question:q-1', workflowId: 'wf-1', kind: 'question', prompt: 'Region?' },
					{
						id: 'wf-1:credential:notionApi',
						workflowId: 'wf-1',
						kind: 'credential',
						credentialType: 'notionApi',
					},
				],
			},
		};

		const result = instanceAiEventSchema.safeParse(event);
		expect(result.success).toBe(true);
		if (result.success && result.data.type === 'setup-items') {
			expect(result.data.payload.items).toEqual([
				{
					id: 'wf-1:credential:notionApi',
					workflowId: 'wf-1',
					kind: 'credential',
					credentialType: 'notionApi',
				},
			]);
		}
	});

	it('rejects a setup item claiming a different workflow than the payload', () => {
		const event = {
			type: 'setup-items',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				workflowId: 'wf-1',
				items: [
					{
						id: 'wf-2:credential:slackApi',
						workflowId: 'wf-2',
						kind: 'credential',
						credentialType: 'slackApi',
					},
				],
			},
		};

		expect(instanceAiEventSchema.safeParse(event).success).toBe(false);
	});
});

describe('errorPayloadSchema', () => {
	it('accepts a payload without a code', () => {
		expect(errorPayloadSchema.parse({ content: 'boom' })).toEqual({ content: 'boom' });
	});

	it('accepts the quota_exhausted code', () => {
		const payload = { content: 'out of credits', code: 'quota_exhausted' as const };
		expect(errorPayloadSchema.parse(payload)).toEqual(payload);
	});

	it('accepts an unknown code and preserves it (forward-compatible)', () => {
		// A newer service may emit an error code an older client doesn't recognize.
		// The wire schema must not reject it, otherwise the whole error event is
		// dropped by instanceAiEventSchema.safeParse before the reducer's
		// unknown-code fallback can render a generic error.
		const parsed = errorPayloadSchema.safeParse({ content: 'boom', code: 'some_future_code' });
		expect(parsed.success).toBe(true);
		expect(parsed.success && parsed.data.code).toBe('some_future_code');
	});
});

describe('isKnownInstanceAiErrorCode', () => {
	it('is true for a recognized code', () => {
		expect(isKnownInstanceAiErrorCode('quota_exhausted')).toBe(true);
	});

	it('is false for an unknown code or undefined', () => {
		expect(isKnownInstanceAiErrorCode('some_future_code')).toBe(false);
		expect(isKnownInstanceAiErrorCode(undefined)).toBe(false);
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
		expect(result.createCredential).toBe('require_approval');
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
			createCredential: 'always_allow',
			deleteCredential: 'always_allow',
			readFilesystem: 'always_allow',
		};

		const result = applyBranchReadOnlyOverrides(permissions);

		expect(result.publishWorkflow).toBe('always_allow');
		expect(result.createCredential).toBe('always_allow');
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

describe('confirmationRequestPayloadSchema', () => {
	it('preserves an explicit credential selection requirement', () => {
		const payload = makeConfirmation({ requireUserSelection: true });

		expect(confirmationRequestPayloadSchema.parse(payload)).toEqual(payload);
	});
});

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
	it('requires a known source', () => {
		expect(
			() =>
				new InstanceAiEnsureThreadRequest({
					projectId: 'project-1',
				} as unknown as ConstructorParameters<typeof InstanceAiEnsureThreadRequest>[0]),
		).toThrow();
		expect(
			() =>
				new InstanceAiEnsureThreadRequest({
					projectId: 'project-1',
					source: 'totally-made-up',
				} as unknown as ConstructorParameters<typeof InstanceAiEnsureThreadRequest>[0]),
		).toThrow();
	});

	it.each(INSTANCE_AI_THREAD_SOURCES)('accepts taxonomy source %s', (source) => {
		const parsed = new InstanceAiEnsureThreadRequest({
			projectId: 'project-1',
			source,
		});
		expect(parsed.source).toBe(source);
	});

	it('parses an ensure-thread request with launch fields', () => {
		const parsed = new InstanceAiEnsureThreadRequest({
			projectId: 'project-1',
			origin: 'external',
			source: 'website-template',
			sourceContext: { templateId: '42' },
		});
		expect(parsed.origin).toBe('external');
		expect(parsed.source).toBe('website-template');
		expect(parsed.sourceContext).toEqual({ templateId: '42' });
	});

	it('rejects an oversized sourceContext', () => {
		const big = { blob: 'x'.repeat(3000) };
		expect(
			() =>
				new InstanceAiEnsureThreadRequest({
					projectId: 'project-1',
					source: 'assistant_page',
					sourceContext: big,
				}),
		).toThrow();
	});
});

describe('data-tables session grant keys', () => {
	it('builds action-scoped keys matching the frontend always-allow format', () => {
		expect(buildDataTablesSessionGrantKey('create')).toBe('data-tables:create');
		expect(buildDataTablesSessionGrantKey('insert-rows')).toBe('data-tables:insert-rows');
	});
});

describe('workflow update session grant keys', () => {
	it('builds per-workflow keys matching the frontend always-allow format', () => {
		expect(buildUpdateWorkflowSessionGrantKey('wf-1')).toBe('workflows:update:wf-1');
	});
});

describe('workflow-setup skip keys', () => {
	it('round-trips credential types and ignores unrelated keys', () => {
		const keys = new Set([
			buildSetupSkipGrantKey('slackApi'),
			buildSetupSkipGrantKey('Wait for Form'),
			'executions:run:wf-1',
		]);

		expect(buildSetupSkipGrantKey('slackApi')).toBe('workflows:setup-skip:slackApi');
		expect(parseSetupSkipGrants(keys)).toEqual(new Set(['slackApi', 'Wait for Form']));
	});

	it('does not collide with the workflow-update namespace', () => {
		expect(parseSetupSkipGrants(new Set([buildUpdateWorkflowSessionGrantKey('wf-1')])).size).toBe(
			0,
		);
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

describe('instanceAiEvalSeedAgentSchema resource references', () => {
	const config = {
		name: 'Support Triage',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Triage inbound tickets.',
	};
	const agent = (over: Record<string, unknown> = {}) => ({
		id: 'AgEnT12345678901',
		config,
		...over,
	});
	const errorOf = (result: { success: boolean; error?: { issues: unknown[] } }) =>
		result.success ? '' : JSON.stringify(result.error?.issues);

	it('accepts an agent whose references are all backed', () => {
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({
				config: { ...config, skills: [{ type: 'skill', id: 'skill_1' }] },
				skills: {
					skill_1: { name: 'Triage rules', description: 'How to sort', instructions: 'Label it.' },
				},
			}),
		);
		expect(result.success).toBe(true);
	});

	it('rejects a skill reference with no body', () => {
		// A restored agent missing the skill reads as a build failure, not a broken fixture.
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({ config: { ...config, skills: [{ type: 'skill', id: 'skill_1' }] } }),
		);
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('carries no body');
	});

	it('rejects a custom tool, which a seed cannot carry a body for', () => {
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({ config: { ...config, tools: [{ type: 'custom', id: 'my_tool' }] } }),
		);
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('custom tool');
	});

	it('rejects declared tasks, which a seed cannot carry bodies for', () => {
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({ config: { ...config, tasks: [{ type: 'task', id: 'nightly' }] } }),
		);
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('tasks');
	});

	it('still accepts node and workflow tools', () => {
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({ config: { ...config, tools: [{ type: 'workflow', workflow: 'Daily digest' }] } }),
		);
		expect(result.success).toBe(true);
	});

	it('rejects duplicate seed agent ids', () => {
		// The harness remaps ids through a Set, so both entries take ONE fresh id and
		// the second `create` on the pinned id aborts the restore.
		const result = InstanceAiEvalRestoreThreadRequest.safeParse({
			threadId: '11111111-1111-4111-8111-111111111111',
			messages: [],
			agents: [agent(), agent()],
		});
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('Duplicate seed agent id');
	});

	it('accepts a sub-agent relationship backed by another seeded agent', () => {
		const result = InstanceAiEvalRestoreThreadRequest.safeParse({
			threadId: '11111111-1111-4111-8111-111111111111',
			messages: [],
			agents: [
				agent({ config: { ...config, subAgents: { agents: [{ agentId: 'AgEnT99999999999' }] } } }),
				agent({ id: 'AgEnT99999999999', config: { ...config, name: 'Helper' } }),
			],
		});

		expect(result.success).toBe(true);
	});

	it.each([
		{
			name: 'self reference',
			referencedAgentId: 'AgEnT12345678901',
			expectedError: 'cannot use itself as a sub-agent',
		},
		{
			name: 'unbacked reference',
			referencedAgentId: 'AgEnT99999999999',
			expectedError: 'is not included in the seed',
		},
	])('rejects a $name', ({ referencedAgentId, expectedError }) => {
		const result = InstanceAiEvalRestoreThreadRequest.safeParse({
			threadId: '11111111-1111-4111-8111-111111111111',
			messages: [],
			agents: [
				agent({
					config: { ...config, subAgents: { agents: [{ agentId: referencedAgentId }] } },
				}),
			],
		});

		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain(expectedError);
	});

	it('rejects an inherited property name as a backed skill body', () => {
		const result = instanceAiEvalSeedAgentSchema.safeParse(
			agent({ config: { ...config, skills: [{ type: 'skill', id: 'constructor' }] }, skills: {} }),
		);
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('carries no body');
	});

	it('flags a workflow tool no seeded workflow name backs', () => {
		// Cross-field, so it lives beside the schema rather than in it.
		const unbacked = findUnbackedSeedWorkflowTools({
			workflows: [{ name: 'Batch loop' }],
			agents: [
				{
					id: 'AgEnT12345678901',
					config: { tools: [{ type: 'workflow', workflow: 'wf12345678' }] },
				},
			],
		});
		expect(unbacked).toEqual([{ agentId: 'AgEnT12345678901', target: 'wf12345678' }]);

		const backed = findUnbackedSeedWorkflowTools({
			workflows: [{ name: 'Batch loop' }],
			agents: [
				{
					id: 'AgEnT12345678901',
					config: { tools: [{ type: 'workflow', workflow: 'Batch loop' }] },
				},
			],
		});
		expect(backed).toEqual([]);
	});
});

describe('instanceAiFileAttachmentSchema size bound', () => {
	function attachmentWithEncodedSize(bytes: number) {
		return {
			type: 'file' as const,
			data: 'A'.repeat(bytes),
			mimeType: 'image/png',
			fileName: 'pasted.png',
		};
	}

	it('accepts a payload exactly at the base64 limit', () => {
		const result = instanceAiFileAttachmentSchema.safeParse(
			attachmentWithEncodedSize(MAX_ATTACHMENT_BASE64_BYTES),
		);
		expect(result.success).toBe(true);
	});

	it('rejects a payload one byte over the base64 limit', () => {
		const result = instanceAiFileAttachmentSchema.safeParse(
			attachmentWithEncodedSize(MAX_ATTACHMENT_BASE64_BYTES + 1),
		);
		expect(result.success).toBe(false);
	});

	it('bounds the base64-encoded size, not the decoded size', () => {
		// The provider limit applies to the encoded payload. A bound expressed in
		// decoded bytes would be ~4/3 larger and admit payloads it rejects.
		const decodedUnitBound = Math.ceil((MAX_ATTACHMENT_BASE64_BYTES * 4) / 3);
		const result = instanceAiFileAttachmentSchema.safeParse(
			attachmentWithEncodedSize(decodedUnitBound),
		);
		expect(result.success).toBe(false);
	});

	it('states the limit as the raw file size the user sees, not the encoded one', () => {
		const result = instanceAiFileAttachmentSchema.safeParse(
			attachmentWithEncodedSize(MAX_ATTACHMENT_BASE64_BYTES + 1),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain(formatAttachmentSizeLimit());
		}
	});
});

describe('base64EncodedSize', () => {
	it.each([
		[0, 0],
		[1, 4],
		[2, 4],
		[3, 4],
		[4, 8],
	])('encodes %i raw bytes as %i base64 bytes', (raw, encoded) => {
		expect(base64EncodedSize(raw)).toBe(encoded);
	});

	it('inflates by roughly 4/3', () => {
		expect(base64EncodedSize(3 * 1024 * 1024)).toBe(4 * 1024 * 1024);
	});
});

describe('exceedsAttachmentSizeLimit', () => {
	// A file is measured by its *encoded* size, so the largest file that fits is
	// three quarters of the limit — not the limit itself.
	const largestAllowedRawBytes = (MAX_ATTACHMENT_BASE64_BYTES / 4) * 3;

	it('accepts a file whose encoded form lands exactly on the limit', () => {
		expect(exceedsAttachmentSizeLimit(largestAllowedRawBytes)).toBe(false);
	});

	it('rejects a file whose encoded form crosses the limit', () => {
		expect(exceedsAttachmentSizeLimit(largestAllowedRawBytes + 1)).toBe(true);
	});

	it('rejects a raw size that only fits when the 4/3 inflation is ignored', () => {
		// This is the case a naive `file.size > limit` check lets through.
		expect(largestAllowedRawBytes + 1).toBeLessThan(MAX_ATTACHMENT_BASE64_BYTES);
		expect(exceedsAttachmentSizeLimit(MAX_ATTACHMENT_BASE64_BYTES)).toBe(true);
	});
});

describe('MAX_ATTACHMENT_DECODED_BYTES', () => {
	it('is the largest raw file whose encoded form still fits', () => {
		expect(exceedsAttachmentSizeLimit(MAX_ATTACHMENT_DECODED_BYTES)).toBe(false);
		expect(exceedsAttachmentSizeLimit(MAX_ATTACHMENT_DECODED_BYTES + 1)).toBe(true);
	});

	it('is smaller than the encoded limit, because base64 inflates', () => {
		expect(MAX_ATTACHMENT_DECODED_BYTES).toBeLessThan(MAX_ATTACHMENT_BASE64_BYTES);
	});
});

describe('formatAttachmentSizeLimit', () => {
	// Users compare against the file on their disk, which is the decoded size. Quoting
	// the encoded limit would tell someone with an 8 MB file that it "exceeds 10 MB".
	it('describes the limit as the raw file size a user would see', () => {
		expect(formatAttachmentSizeLimit()).toBe('7.5 MB');
	});
});

describe('instanceAiFileAttachmentSchema rejection message', () => {
	it('quotes the raw-file limit, not the encoded one', () => {
		const result = instanceAiFileAttachmentSchema.safeParse({
			type: 'file',
			data: 'A'.repeat(MAX_ATTACHMENT_BASE64_BYTES + 1),
			mimeType: 'image/png',
			fileName: 'pasted.png',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			const { message } = result.error.issues[0];
			expect(message).toContain('7.5 MB');
			expect(message).not.toContain('10 MB');
		}
	});

	it('tells the user what to do about it', () => {
		const result = instanceAiFileAttachmentSchema.safeParse({
			type: 'file',
			data: 'A'.repeat(MAX_ATTACHMENT_BASE64_BYTES + 1),
			mimeType: 'image/png',
			fileName: 'pasted.png',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message.toLowerCase()).toContain('smaller');
		}
	});
});

describe('total attachment budget', () => {
	it('exposes the combined ceiling as a raw file size', () => {
		expect(MAX_TOTAL_ATTACHMENT_DECODED_BYTES).toBe((MAX_TOTAL_ATTACHMENT_BASE64_BYTES / 4) * 3);
	});

	it('describes the combined limit for user-facing copy', () => {
		expect(formatTotalAttachmentSizeLimit()).toBe('12.0 MB');
	});

	it('leaves room for more than one max-size file', () => {
		expect(MAX_TOTAL_ATTACHMENT_DECODED_BYTES).toBeGreaterThan(MAX_ATTACHMENT_DECODED_BYTES);
	});
});

describe('instanceAiAttachmentSchema — nodes attachment', () => {
	const nodesAttachment = (overrides: Record<string, unknown> = {}) => ({
		type: 'nodes',
		workflowId: 'wf-1',
		sets: [{ nodes: [{ id: 'n1', name: 'HTTP Request' }] }],
		...overrides,
	});

	it('accepts a single set with one loose node and no optional fields', () => {
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment());
		expect(result.success).toBe(true);
	});

	it('accepts a chain set with inputNode, outputNode, and canvasGroupId', () => {
		const result = instanceAiAttachmentSchema.safeParse(
			nodesAttachment({
				sets: [
					{
						nodes: [
							{ id: 'n1', name: 'HTTP Request' },
							{ id: 'n2', name: 'Set' },
							{ id: 'n3', name: 'IF' },
						],
						inputNode: { id: 'n0', name: 'Webhook' },
						outputNode: { id: 'n4', name: 'Slack' },
						canvasGroupId: 'g1',
						canvasGroupName: 'My Group 1',
					},
				],
			}),
		);
		expect(result.success).toBe(true);
	});

	it('accepts two sets at once', () => {
		const result = instanceAiAttachmentSchema.safeParse(
			nodesAttachment({
				sets: [
					{ nodes: [{ id: 'n1' }] },
					{ nodes: [{ id: 'n2' }, { id: 'n3' }], inputNode: { id: 'n1' } },
				],
			}),
		);
		expect(result.success).toBe(true);
	});

	it('rejects a missing workflowId', () => {
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment({ workflowId: undefined }));
		expect(result.success).toBe(false);
	});

	it('rejects an empty sets array', () => {
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment({ sets: [] }));
		expect(result.success).toBe(false);
	});

	it('rejects a set with an empty nodes array', () => {
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment({ sets: [{ nodes: [] }] }));
		expect(result.success).toBe(false);
	});

	it('rejects more than 50 sets', () => {
		const sets = Array.from({ length: 51 }, (_, i) => ({ nodes: [{ id: `n${i}` }] }));
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment({ sets }));
		expect(result.success).toBe(false);
	});

	it('rejects more than 50 nodes in a single set', () => {
		const nodes = Array.from({ length: 51 }, (_, i) => ({ id: `n${i}` }));
		const result = instanceAiAttachmentSchema.safeParse(nodesAttachment({ sets: [{ nodes }] }));
		expect(result.success).toBe(false);
	});

	it('accepts node refs without a name', () => {
		const result = instanceAiAttachmentSchema.safeParse(
			nodesAttachment({
				sets: [
					{
						nodes: [{ id: 'n1' }],
						inputNode: { id: 'n0' },
						outputNode: { id: 'n2' },
					},
				],
			}),
		);
		expect(result.success).toBe(true);
	});

	it('still accepts file, workflow, and agent attachments unchanged', () => {
		expect(
			instanceAiAttachmentSchema.safeParse({
				type: 'file',
				data: 'YQ==',
				mimeType: 'text/plain',
				fileName: 'a.txt',
			}).success,
		).toBe(true);
		expect(instanceAiAttachmentSchema.safeParse({ type: 'workflow', id: 'wf-1' }).success).toBe(
			true,
		);
		expect(
			instanceAiAttachmentSchema.safeParse({ type: 'agent', id: 'agent-1', projectId: 'proj-1' })
				.success,
		).toBe(true);
	});

	it('is also accepted by instanceAiResourceAttachmentSchema', () => {
		const result = instanceAiResourceAttachmentSchema.safeParse(nodesAttachment());
		expect(result.success).toBe(true);
	});
});

describe('InstanceAiThreadMessagesQuery', () => {
	it('defaults to the first page at the default limit', () => {
		expect(InstanceAiThreadMessagesQuery.parse({})).toEqual({
			limit: INSTANCE_AI_THREAD_MESSAGES_DEFAULT_LIMIT,
			page: 0,
		});
	});

	it('coerces the string query params a URL carries', () => {
		expect(InstanceAiThreadMessagesQuery.parse({ limit: '25', page: '2', raw: 'true' })).toEqual({
			limit: 25,
			page: 2,
			raw: 'true',
		});
	});

	it('accepts the ceilings', () => {
		const result = InstanceAiThreadMessagesQuery.safeParse({
			limit: INSTANCE_AI_THREAD_MESSAGES_MAX_LIMIT,
			page: INSTANCE_AI_THREAD_MESSAGES_MAX_PAGE,
		});
		expect(result.success).toBe(true);
	});

	it.each([
		{ limit: INSTANCE_AI_THREAD_MESSAGES_MAX_LIMIT + 1 },
		{ limit: 0 },
		{ limit: -1 },
		{ limit: 1.5 },
		{ page: INSTANCE_AI_THREAD_MESSAGES_MAX_PAGE + 1 },
		{ page: -1 },
	])('rejects out-of-range paging (%o)', (query) => {
		expect(InstanceAiThreadMessagesQuery.safeParse(query).success).toBe(false);
	});
});
