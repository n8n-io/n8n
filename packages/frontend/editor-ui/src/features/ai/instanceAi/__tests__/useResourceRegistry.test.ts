import { describe, test, expect } from 'vitest';
import { ref, nextTick } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useResourceRegistry } from '../useResourceRegistry';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'some-tool',
		args: {},
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		...overrides,
	} as InstanceAiMessage;
}

function setup(workflowNameLookup?: (id: string) => string | undefined) {
	const messages = ref<InstanceAiMessage[]>([]);
	const { registry } = useResourceRegistry(() => messages.value, workflowNameLookup);
	return { messages, registry };
}

/** Helper to find a registry entry by resource ID. */
function findById(registry: Map<string, unknown>, id: string) {
	for (const entry of registry.values()) {
		if ((entry as { id: string }).id === id) return entry;
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useResourceRegistry', () => {
	describe('workflow registration', () => {
		test('registers workflow with workflowName from result', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								result: { workflowId: 'wf-1', workflowName: 'My Workflow' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(registry.value.get('my workflow')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-1', name: 'My Workflow' }),
			);
		});

		test('falls back to args.name when result has no workflowName', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								args: { name: 'From Args' },
								result: { workflowId: 'wf-2' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(registry.value.get('from args')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-2', name: 'From Args' }),
			);
		});

		test('falls back to Untitled when neither workflowName nor args.name is present', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { success: true, workflowId: 'wf-3' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Keyed by workflowId when unnamed (avoids collisions between multiple unnamed workflows)
			const entry = registry.value.get('wf-3');
			expect(entry).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-3', name: 'Untitled' }),
			);
		});

		test('does not collide when multiple workflows have no name', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { success: true, workflowId: 'wf-a' },
							}),
							makeToolCall({
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { success: true, workflowId: 'wf-b' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Both should be registered, keyed by their IDs
			expect(findById(registry.value, 'wf-a')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-a', name: 'Untitled' }),
			);
			expect(findById(registry.value, 'wf-b')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-b', name: 'Untitled' }),
			);
		});

		test('registers workflow from build-workflow-with-agent child calls', async () => {
			const { messages, registry } = setup();

			// Simulates the real scenario: parent is build-workflow-with-agent,
			// child create call has name but no workflowId,
			// child patch call has workflowId but no name.
			const childCreate = makeAgentNode({
				agentId: 'builder',
				toolCalls: [
					makeToolCall({
						toolCallId: 'tc-create',
						toolName: 'build-workflow',
						args: { name: 'Insert Random City Data' },
						result: { success: true, errors: [] },
					}),
					makeToolCall({
						toolCallId: 'tc-patch',
						toolName: 'build-workflow',
						args: { patches: [{ op: 'replace' }] },
						result: { success: true, workflowId: 'wf-built' },
					}),
				],
			});

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow-with-agent',
								result: { result: 'done', taskId: 'task-1' },
							}),
						],
						children: [childCreate],
					}),
				}),
			];
			await nextTick();

			// The patch call registers the workflow with 'Untitled' fallback
			// (since its args only have patches, not name)
			const entry = findById(registry.value, 'wf-built');
			expect(entry).toBeDefined();
			expect((entry as { id: string }).id).toBe('wf-built');
		});
	});

	describe('workflowNameLookup enrichment', () => {
		test('enriches fallback name from store lookup', async () => {
			const lookup = (id: string) => (id === 'wf-3' ? 'Insert Random City Data' : undefined);
			const { messages, registry } = setup(lookup);

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { success: true, workflowId: 'wf-3' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Should be keyed by the enriched name, not the workflowId
			expect(registry.value.has('wf-3')).toBe(false);
			const entry = registry.value.get('insert random city data');
			expect(entry).toEqual(
				expect.objectContaining({
					type: 'workflow',
					id: 'wf-3',
					name: 'Insert Random City Data',
				}),
			);
		});

		test('keeps original name when lookup returns undefined', async () => {
			const lookup = () => undefined;
			const { messages, registry } = setup(lookup);

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								result: { workflowId: 'wf-4', workflowName: 'Original Name' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(registry.value.get('original name')).toEqual(
				expect.objectContaining({ name: 'Original Name' }),
			);
		});

		test('does not enrich when store name matches existing name', async () => {
			const lookup = (id: string) => (id === 'wf-5' ? 'My Workflow' : undefined);
			const { messages, registry } = setup(lookup);

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								result: { workflowId: 'wf-5', workflowName: 'My Workflow' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Key should remain the same
			expect(registry.value.get('my workflow')).toEqual(
				expect.objectContaining({ id: 'wf-5', name: 'My Workflow' }),
			);
		});

		test('does not enrich data-table entries', async () => {
			const lookup = () => 'Should Not Apply';
			const { messages, registry } = setup(lookup);

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1', name: 'cities1' } },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(registry.value.get('cities1')).toEqual(
				expect.objectContaining({ type: 'data-table', name: 'cities1' }),
			);
		});
	});

	describe('data table mutation artifact metadata', () => {
		test.each(['insert-data-table-rows', 'update-data-table-rows', 'delete-data-table-rows'])(
			'registers data table from %s result with name and projectId',
			async (toolName) => {
				const { messages, registry } = setup();

				messages.value = [
					makeMessage({
						agentTree: makeAgentNode({
							toolCalls: [
								makeToolCall({
									toolName,
									result: {
										dataTableId: 'dt-mut-1',
										tableName: 'Orders',
										projectId: 'proj-1',
									},
								}),
							],
						}),
					}),
				];
				await nextTick();

				const entry = registry.value.get('orders');
				expect(entry).toEqual({
					type: 'data-table',
					id: 'dt-mut-1',
					name: 'Orders',
					projectId: 'proj-1',
				});
			},
		);

		test('enriches existing registry entry with projectId from mutation result', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							// First: create-data-table registers the table (without projectId)
							makeToolCall({
								toolName: 'create-data-table',
								result: { table: { id: 'dt-enrich', name: 'Signups' } },
							}),
							// Then: insert-data-table-rows adds projectId
							makeToolCall({
								toolName: 'insert-data-table-rows',
								result: {
									insertedCount: 5,
									dataTableId: 'dt-enrich',
									tableName: 'Signups',
									projectId: 'proj-2',
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			const entry = registry.value.get('signups');
			expect(entry).toEqual(
				expect.objectContaining({
					type: 'data-table',
					id: 'dt-enrich',
					name: 'Signups',
					projectId: 'proj-2',
				}),
			);
		});

		test('uses dataTableId as fallback name when tableName is missing', async () => {
			const { messages, registry } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'insert-data-table-rows',
								result: {
									insertedCount: 1,
									dataTableId: 'dt-no-name',
									projectId: 'proj-3',
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			const entry = registry.value.get('dt-no-name');
			expect(entry).toEqual({
				type: 'data-table',
				id: 'dt-no-name',
				name: 'dt-no-name',
				projectId: 'proj-3',
			});
		});
	});
});
