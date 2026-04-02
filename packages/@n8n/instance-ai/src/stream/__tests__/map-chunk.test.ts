import { mapMastraChunkToEvent } from '../map-chunk';

describe('mapMastraChunkToEvent', () => {
	const runId = 'run-1';
	const agentId = 'agent-1';

	// -----------------------------------------------------------------------
	// Null / invalid inputs
	// -----------------------------------------------------------------------

	describe('null and invalid inputs', () => {
		it('returns null for null chunk', () => {
			expect(mapMastraChunkToEvent(runId, agentId, null)).toBeNull();
		});

		it('returns null for string chunk', () => {
			expect(mapMastraChunkToEvent(runId, agentId, 'hello')).toBeNull();
		});

		it('returns null for number chunk', () => {
			expect(mapMastraChunkToEvent(runId, agentId, 42)).toBeNull();
		});

		it('returns null for array chunk', () => {
			expect(mapMastraChunkToEvent(runId, agentId, [1, 2, 3])).toBeNull();
		});

		it('returns null for undefined chunk', () => {
			expect(mapMastraChunkToEvent(runId, agentId, undefined)).toBeNull();
		});

		it('returns null for object without type', () => {
			expect(mapMastraChunkToEvent(runId, agentId, { payload: { text: 'hi' } })).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// text-delta
	// -----------------------------------------------------------------------

	describe('text-delta', () => {
		it('maps chunk with payload.text', () => {
			const chunk = { type: 'text-delta', payload: { text: 'hello' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'text-delta',
				runId,
				agentId,
				payload: { text: 'hello' },
			});
		});

		it('maps chunk with payload.textDelta', () => {
			const chunk = { type: 'text-delta', payload: { textDelta: 'world' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'text-delta',
				runId,
				agentId,
				payload: { text: 'world' },
			});
		});

		it('prefers payload.text over payload.textDelta', () => {
			const chunk = { type: 'text-delta', payload: { text: 'preferred', textDelta: 'ignored' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'text-delta',
				runId,
				agentId,
				payload: { text: 'preferred' },
			});
		});

		it('maps empty string text', () => {
			const chunk = { type: 'text-delta', payload: { text: '' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'text-delta',
				runId,
				agentId,
				payload: { text: '' },
			});
		});

		it('returns null when payload has no text or textDelta', () => {
			const chunk = { type: 'text-delta', payload: { other: 'value' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});

		it('returns null when payload is not an object', () => {
			const chunk = { type: 'text-delta', payload: 'not-an-object' };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// reasoning-delta
	// -----------------------------------------------------------------------

	describe('reasoning-delta', () => {
		it('maps chunk with type reasoning-delta', () => {
			const chunk = { type: 'reasoning-delta', payload: { text: 'thinking...' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'reasoning-delta',
				runId,
				agentId,
				payload: { text: 'thinking...' },
			});
		});

		it('maps chunk with type reasoning (alias)', () => {
			const chunk = { type: 'reasoning', payload: { text: 'also thinking' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'reasoning-delta',
				runId,
				agentId,
				payload: { text: 'also thinking' },
			});
		});

		it('maps reasoning with payload.textDelta', () => {
			const chunk = { type: 'reasoning-delta', payload: { textDelta: 'delta text' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'reasoning-delta',
				runId,
				agentId,
				payload: { text: 'delta text' },
			});
		});

		it('returns null when reasoning chunk has no text', () => {
			const chunk = { type: 'reasoning-delta', payload: { other: 'value' } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// tool-call
	// -----------------------------------------------------------------------

	describe('tool-call', () => {
		it('maps chunk with all fields', () => {
			const chunk = {
				type: 'tool-call',
				payload: {
					toolCallId: 'tc-1',
					toolName: 'my-tool',
					args: { key: 'value' },
				},
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-call',
				runId,
				agentId,
				payload: {
					toolCallId: 'tc-1',
					toolName: 'my-tool',
					args: { key: 'value' },
				},
			});
		});

		it('defaults toolCallId to empty string when missing', () => {
			const chunk = {
				type: 'tool-call',
				payload: { toolName: 'my-tool', args: { a: 1 } },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.payload).toMatchObject({ toolCallId: '' });
		});

		it('defaults toolName to empty string when missing', () => {
			const chunk = {
				type: 'tool-call',
				payload: { toolCallId: 'tc-1', args: {} },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.payload).toMatchObject({ toolName: '' });
		});

		it('defaults args to empty object when not a record', () => {
			const chunk = {
				type: 'tool-call',
				payload: { toolCallId: 'tc-1', toolName: 'tool', args: 'invalid' },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.payload).toMatchObject({ args: {} });
		});

		it('defaults args to empty object when args is an array', () => {
			const chunk = {
				type: 'tool-call',
				payload: { toolCallId: 'tc-1', toolName: 'tool', args: [1, 2] },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.payload).toMatchObject({ args: {} });
		});
	});

	// -----------------------------------------------------------------------
	// tool-result
	// -----------------------------------------------------------------------

	describe('tool-result', () => {
		it('maps a normal tool result', () => {
			const chunk = {
				type: 'tool-result',
				payload: { toolCallId: 'tc-1', result: { data: 'ok' } },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-result',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', result: { data: 'ok' } },
			});
		});

		it('maps tool-result with string result', () => {
			const chunk = {
				type: 'tool-result',
				payload: { toolCallId: 'tc-1', result: 'done' },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-result',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', result: 'done' },
			});
		});

		it('maps tool-result with undefined result', () => {
			const chunk = {
				type: 'tool-result',
				payload: { toolCallId: 'tc-1' },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result).toEqual({
				type: 'tool-result',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', result: undefined },
			});
		});

		it('defaults toolCallId to empty string when missing', () => {
			const chunk = {
				type: 'tool-result',
				payload: { result: 'ok' },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.payload).toMatchObject({ toolCallId: '' });
		});

		it('maps tool-result with isError=true to tool-error event', () => {
			const chunk = {
				type: 'tool-result',
				payload: { toolCallId: 'tc-1', isError: true, result: 'Something went wrong' },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-error',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', error: 'Something went wrong' },
			});
		});

		it('uses default error message when isError=true but result is not a string', () => {
			const chunk = {
				type: 'tool-result',
				payload: { toolCallId: 'tc-1', isError: true, result: { complex: 'error' } },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-error',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', error: 'Tool execution failed' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// tool-error
	// -----------------------------------------------------------------------

	describe('tool-error (chunk type)', () => {
		it('maps tool-error chunk without isError to tool-result', () => {
			const chunk = {
				type: 'tool-error',
				payload: { toolCallId: 'tc-1', result: 'some result' },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-result',
				runId,
				agentId,
				payload: { toolCallId: 'tc-1', result: 'some result' },
			});
		});

		it('maps tool-error chunk with isError=true to tool-error event', () => {
			const chunk = {
				type: 'tool-error',
				payload: { toolCallId: 'tc-2', isError: true, result: 'Timeout' },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'tool-error',
				runId,
				agentId,
				payload: { toolCallId: 'tc-2', error: 'Timeout' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// tool-call-suspended (confirmation-request)
	// -----------------------------------------------------------------------

	describe('tool-call-suspended (confirmation-request)', () => {
		it('maps basic confirmation with requestId and toolCallId', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					toolName: 'delete-workflow',
					args: { id: 'wf-1' },
					suspendPayload: {
						requestId: 'req-1',
						message: 'Delete this workflow?',
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result).toEqual({
				type: 'confirmation-request',
				runId,
				agentId,
				payload: {
					requestId: 'req-1',
					toolCallId: 'tc-1',
					toolName: 'delete-workflow',
					args: { id: 'wf-1' },
					severity: 'warning',
					message: 'Delete this workflow?',
				},
			});
		});

		it('falls back requestId to toolCallId when requestId is absent', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-fallback',
					toolName: 'some-tool',
					suspendPayload: {
						message: 'Confirm?',
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result?.type).toBe('confirmation-request');
			if (result?.type === 'confirmation-request') {
				expect(result.payload.requestId).toBe('tc-fallback');
			}
		});

		it('returns null when both requestId and toolCallId are empty', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: '',
					suspendPayload: {
						requestId: '',
					},
				},
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});

		it('returns null when toolCallId is missing', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					suspendPayload: {
						requestId: 'req-1',
					},
				},
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});

		it('defaults message to "Confirmation required" when missing', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.message).toBe('Confirmation required');
			}
		});

		// Severity

		it.each(['destructive', 'warning', 'info'] as const)(
			'accepts valid severity "%s"',
			(severity) => {
				const chunk = {
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-1',
						suspendPayload: { severity },
					},
				};
				const result = mapMastraChunkToEvent(runId, agentId, chunk);
				if (result?.type === 'confirmation-request') {
					expect(result.payload.severity).toBe(severity);
				}
			},
		);

		it('defaults severity to warning for unknown value', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { severity: 'critical' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.severity).toBe('warning');
			}
		});

		it('defaults severity to warning when severity is missing', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.severity).toBe('warning');
			}
		});

		// credentialRequests

		it('includes valid credentialRequests', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						credentialRequests: [
							{
								credentialType: 'notionApi',
								reason: 'Need Notion access',
								existingCredentials: [{ id: 'cred-1', name: 'My Notion' }],
								suggestedName: 'Notion Cred',
							},
						],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.credentialRequests).toEqual([
					{
						credentialType: 'notionApi',
						reason: 'Need Notion access',
						existingCredentials: [{ id: 'cred-1', name: 'My Notion' }],
						suggestedName: 'Notion Cred',
					},
				]);
			}
		});

		it('filters out invalid credentialRequests', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						credentialRequests: [
							{ invalid: true },
							{
								credentialType: 'slackApi',
								reason: 'Need Slack',
								existingCredentials: [],
							},
						],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.credentialRequests).toEqual([
					{
						credentialType: 'slackApi',
						reason: 'Need Slack',
						existingCredentials: [],
					},
				]);
			}
		});

		it('omits credentialRequests when all items are invalid', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						credentialRequests: [{ invalid: true }],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('credentialRequests');
			}
		});

		// projectId

		it('includes projectId when present', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { projectId: 'proj-123' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.projectId).toBe('proj-123');
			}
		});

		it('omits projectId when not a string', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { projectId: 123 },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('projectId');
			}
		});

		// inputType

		it.each(['approval', 'text', 'questions', 'plan-review'] as const)(
			'accepts valid inputType "%s"',
			(inputType) => {
				const chunk = {
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-1',
						suspendPayload: { inputType },
					},
				};
				const result = mapMastraChunkToEvent(runId, agentId, chunk);
				if (result?.type === 'confirmation-request') {
					expect(result.payload.inputType).toBe(inputType);
				}
			},
		);

		it('omits inputType for invalid value', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { inputType: 'invalid-type' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('inputType');
			}
		});

		it('omits inputType when not a string', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { inputType: 42 },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('inputType');
			}
		});

		// questions

		it('includes valid questions', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						questions: [
							{ id: 'q1', question: 'Which one?', type: 'single', options: ['A', 'B'] },
							{ id: 'q2', question: 'Describe it', type: 'text' },
						],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.questions).toEqual([
					{ id: 'q1', question: 'Which one?', type: 'single', options: ['A', 'B'] },
					{ id: 'q2', question: 'Describe it', type: 'text' },
				]);
			}
		});

		it('filters out invalid questions', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						questions: [{ id: 'q1', question: 'Valid', type: 'multi' }, { missing: 'fields' }],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.questions).toEqual([{ id: 'q1', question: 'Valid', type: 'multi' }]);
			}
		});

		it('omits questions when all items are invalid', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						questions: [{ bad: true }],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('questions');
			}
		});

		// introMessage

		it('includes introMessage when present', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { introMessage: 'Please review the following' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.introMessage).toBe('Please review the following');
			}
		});

		it('omits introMessage when not a string', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { introMessage: 123 },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('introMessage');
			}
		});

		// tasks

		it('includes valid tasks', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						tasks: {
							tasks: [
								{ id: 't1', description: 'Build workflow', status: 'todo' },
								{ id: 't2', description: 'Test workflow', status: 'in_progress' },
							],
						},
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.tasks).toEqual({
					tasks: [
						{ id: 't1', description: 'Build workflow', status: 'todo' },
						{ id: 't2', description: 'Test workflow', status: 'in_progress' },
					],
				});
			}
		});

		it('omits tasks when schema validation fails', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						tasks: { tasks: [{ invalid: true }] },
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('tasks');
			}
		});

		it('omits tasks when not a record', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { tasks: 'not-an-object' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('tasks');
			}
		});

		// domainAccess

		it('includes domainAccess with url and host', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						domainAccess: { url: 'https://example.com/api', host: 'example.com' },
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.domainAccess).toEqual({
					url: 'https://example.com/api',
					host: 'example.com',
				});
			}
		});

		it('omits domainAccess when url is missing', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						domainAccess: { host: 'example.com' },
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('domainAccess');
			}
		});

		it('omits domainAccess when host is missing', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						domainAccess: { url: 'https://example.com' },
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('domainAccess');
			}
		});

		it('omits domainAccess when not a record', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { domainAccess: 'not-an-object' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('domainAccess');
			}
		});

		// credentialFlow

		it.each(['generic', 'finalize'] as const)(
			'includes credentialFlow with valid stage "%s"',
			(stage) => {
				const chunk = {
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-1',
						suspendPayload: { credentialFlow: { stage } },
					},
				};
				const result = mapMastraChunkToEvent(runId, agentId, chunk);
				if (result?.type === 'confirmation-request') {
					expect(result.payload.credentialFlow).toEqual({ stage });
				}
			},
		);

		it('omits credentialFlow for invalid stage', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { credentialFlow: { stage: 'unknown' } },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('credentialFlow');
			}
		});

		it('omits credentialFlow when not a record', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { credentialFlow: 'generic' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('credentialFlow');
			}
		});

		// setupRequests

		it('includes valid setupRequests', () => {
			const validNode = {
				node: {
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					parameters: {},
					position: [0, 0] as [number, number],
					id: 'node-1',
				},
				isTrigger: false,
			};
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						setupRequests: [validNode],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.setupRequests).toEqual([validNode]);
			}
		});

		it('filters out invalid setupRequests', () => {
			const validNode = {
				node: {
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					parameters: {},
					position: [0, 0] as [number, number],
					id: 'node-1',
				},
				isTrigger: false,
			};
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						setupRequests: [{ invalid: true }, validNode],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.setupRequests).toEqual([validNode]);
			}
		});

		it('omits setupRequests when all items are invalid', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {
						setupRequests: [{ bad: true }],
					},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('setupRequests');
			}
		});

		// workflowId

		it('includes workflowId when present', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { workflowId: 'wf-abc' },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.workflowId).toBe('wf-abc');
			}
		});

		it('omits workflowId when not a string', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: { workflowId: 42 },
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload).not.toHaveProperty('workflowId');
			}
		});

		// defaults for toolName and args

		it('defaults toolName to empty string when missing from payload', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.toolName).toBe('');
			}
		});

		it('defaults args to empty object when missing from payload', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					suspendPayload: {},
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'confirmation-request') {
				expect(result.payload.args).toEqual({});
			}
		});

		// suspendPayload missing

		it('handles missing suspendPayload gracefully', () => {
			const chunk = {
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
				},
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result).toEqual({
				type: 'confirmation-request',
				runId,
				agentId,
				payload: {
					requestId: 'tc-1',
					toolCallId: 'tc-1',
					toolName: '',
					args: {},
					severity: 'warning',
					message: 'Confirmation required',
				},
			});
		});
	});

	// -----------------------------------------------------------------------
	// error
	// -----------------------------------------------------------------------

	describe('error', () => {
		it('maps string error', () => {
			const chunk = {
				type: 'error',
				payload: { error: 'Something failed' },
			};
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'error',
				runId,
				agentId,
				payload: { content: 'Something failed' },
			});
		});

		it('maps Error instance', () => {
			const chunk = {
				type: 'error',
				payload: { error: new Error('Boom') },
			};
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			expect(result).toEqual({
				type: 'error',
				runId,
				agentId,
				payload: { content: 'Boom' },
			});
		});

		it('maps Error with statusCode', () => {
			const error = new Error('Rate limited');
			Object.assign(error, { statusCode: 429 });
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.content).toBe('Rate limited');
				expect(result.payload.statusCode).toBe(429);
			}
		});

		it('maps Error with JSON responseBody and extracts message', () => {
			const error = new Error('API Error');
			Object.assign(error, {
				statusCode: 400,
				responseBody: JSON.stringify({
					error: { message: 'Invalid API key', type: 'invalid_request_error' },
				}),
			});
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.content).toBe('Invalid API key');
				expect(result.payload.statusCode).toBe(400);
				expect(result.payload.technicalDetails).toBe(
					JSON.stringify({
						error: { message: 'Invalid API key', type: 'invalid_request_error' },
					}),
				);
			}
		});

		it('maps Error with non-JSON responseBody as technicalDetails', () => {
			const error = new Error('Server error');
			Object.assign(error, {
				responseBody: '<html>Internal Server Error</html>',
			});
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.content).toBe('Server error');
				expect(result.payload.technicalDetails).toBe('<html>Internal Server Error</html>');
			}
		});

		it('maps Error with JSON responseBody but no error.message keeps original message', () => {
			const error = new Error('Original message');
			Object.assign(error, {
				responseBody: JSON.stringify({ status: 'fail' }),
			});
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.content).toBe('Original message');
			}
		});

		it('maps Error with anthropic URL to provider Anthropic', () => {
			const error = new Error('Context length exceeded');
			Object.assign(error, { url: 'https://api.anthropic.com/v1/messages' });
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.provider).toBe('Anthropic');
			}
		});

		it('maps Error with openai URL to provider OpenAI', () => {
			const error = new Error('Model not found');
			Object.assign(error, { url: 'https://api.openai.com/v1/chat/completions' });
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload.provider).toBe('OpenAI');
			}
		});

		it('does not set provider for unknown URLs', () => {
			const error = new Error('Fail');
			Object.assign(error, { url: 'https://api.custom-llm.com/v1/chat' });
			const chunk = { type: 'error', payload: { error } };
			const result = mapMastraChunkToEvent(runId, agentId, chunk);
			if (result?.type === 'error') {
				expect(result.payload).not.toHaveProperty('provider');
			}
		});

		it('maps unknown error type to "Unknown error"', () => {
			const chunk = { type: 'error', payload: { error: 12345 } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'error',
				runId,
				agentId,
				payload: { content: 'Unknown error' },
			});
		});

		it('maps null error to "Unknown error"', () => {
			const chunk = { type: 'error', payload: { error: null } };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'error',
				runId,
				agentId,
				payload: { content: 'Unknown error' },
			});
		});

		it('maps undefined error to "Unknown error"', () => {
			const chunk = { type: 'error', payload: {} };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toEqual({
				type: 'error',
				runId,
				agentId,
				payload: { content: 'Unknown error' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// Unknown / ignored chunk types
	// -----------------------------------------------------------------------

	describe('unknown chunk types', () => {
		it('returns null for step-finish type', () => {
			const chunk = { type: 'step-finish', payload: {} };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});

		it('returns null for finish type', () => {
			const chunk = { type: 'finish', payload: {} };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});

		it('returns null for completely unknown type', () => {
			const chunk = { type: 'something-new', payload: {} };
			expect(mapMastraChunkToEvent(runId, agentId, chunk)).toBeNull();
		});
	});
});
