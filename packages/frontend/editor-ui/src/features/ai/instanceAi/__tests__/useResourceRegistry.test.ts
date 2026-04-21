import { describe, test, expect } from 'vitest';
import { ref, nextTick } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useResourceRegistry } from '../useResourceRegistry';
import type { ResourceEntry } from '../useResourceRegistry';

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
	const { producedArtifacts, referencedArtifacts, resourceNameIndex } = useResourceRegistry(
		() => messages.value,
		workflowNameLookup,
	);
	return { messages, producedArtifacts, referencedArtifacts, resourceNameIndex };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useResourceRegistry', () => {
	describe('producedArtifacts — workflow registration', () => {
		test('registers workflow with workflowName from result', async () => {
			const { messages, producedArtifacts, resourceNameIndex } = setup();

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

			expect(producedArtifacts.value.get('wf-1')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-1', name: 'My Workflow' }),
			);
			expect(resourceNameIndex.value.get('my workflow')?.id).toBe('wf-1');
		});

		test('falls back to args.name when result has no workflowName', async () => {
			const { messages, producedArtifacts } = setup();

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

			expect(producedArtifacts.value.get('wf-2')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-2', name: 'From Args' }),
			);
		});

		test('falls back to Untitled when neither workflowName nor args.name is present', async () => {
			const { messages, producedArtifacts } = setup();

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

			expect(producedArtifacts.value.get('wf-3')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-3', name: 'Untitled' }),
			);
		});

		test('does not collide when multiple workflows have no name', async () => {
			const { messages, producedArtifacts } = setup();

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

			expect(producedArtifacts.value.get('wf-a')?.id).toBe('wf-a');
			expect(producedArtifacts.value.get('wf-b')?.id).toBe('wf-b');
		});
	});

	describe('producedArtifacts — updates and merges', () => {
		test('second write to the same workflow id updates the existing entry', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-1',
								toolName: 'build-workflow',
								args: { name: 'Initial' },
								result: { workflowId: 'wf-1' },
							}),
							makeToolCall({
								toolCallId: 'tc-2',
								toolName: 'submit-workflow',
								result: { workflowId: 'wf-1', workflowName: 'Renamed' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.size).toBe(1);
			expect(producedArtifacts.value.get('wf-1')?.name).toBe('Renamed');
		});

		test('patch call without a name preserves the existing name (no regression to Untitled)', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-create',
								toolName: 'build-workflow',
								args: { name: 'Keep Me' },
								result: { workflowId: 'wf-1' },
							}),
							makeToolCall({
								toolCallId: 'tc-patch',
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { success: true, workflowId: 'wf-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.get('wf-1')?.name).toBe('Keep Me');
		});

		test('mutation result enriches an existing data-table entry with projectId', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1', name: 'Signups' } },
							}),
							makeToolCall({
								toolName: 'insert-data-table-rows',
								result: {
									insertedCount: 5,
									dataTableId: 'dt-1',
									tableName: 'Signups',
									projectId: 'proj-2',
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.size).toBe(1);
			expect(producedArtifacts.value.get('dt-1')).toEqual(
				expect.objectContaining({
					type: 'data-table',
					id: 'dt-1',
					name: 'Signups',
					projectId: 'proj-2',
				}),
			);
		});
	});

	describe('list results do not populate producedArtifacts', () => {
		test('workflows action=list result is indexed by name only, never in producedArtifacts', async () => {
			const { messages, producedArtifacts, resourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'workflows',
								args: { action: 'list' },
								result: {
									workflows: [
										{ id: 'wf-list-1', name: 'Workspace Workflow 1' },
										{ id: 'wf-list-2', name: 'Workspace Workflow 2' },
									],
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.size).toBe(0);
			expect(resourceNameIndex.value.get('workspace workflow 1')?.id).toBe('wf-list-1');
			expect(resourceNameIndex.value.get('workspace workflow 2')?.id).toBe('wf-list-2');
		});

		test('data-tables action=list result is indexed by name only', async () => {
			const { messages, producedArtifacts, resourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'list' },
								result: {
									tables: [{ id: 'dt-a', name: 'Existing Table' }],
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.size).toBe(0);
			expect(resourceNameIndex.value.get('existing table')?.id).toBe('dt-a');
		});

		test('a later write promotes a previously-listed resource into producedArtifacts', async () => {
			const { messages, producedArtifacts, resourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'workflows',
								args: { action: 'list' },
								result: { workflows: [{ id: 'wf-1', name: 'Existing' }] },
							}),
							makeToolCall({
								toolName: 'build-workflow',
								args: { patches: [{ op: 'replace' }] },
								result: { workflowId: 'wf-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.size).toBe(1);
			// Produced entry keeps the 'Existing' name via fallback-to-untitled
			// avoidance — the patch call has no name of its own.
			expect(producedArtifacts.value.get('wf-1')?.name).toBe('Untitled');
			// Name index still resolves 'existing'
			expect(resourceNameIndex.value.get('existing')?.id).toBe('wf-1');
		});
	});

	describe('workflowNameLookup enrichment', () => {
		test('enriches fallback name from store lookup', async () => {
			const lookup = (id: string) => (id === 'wf-3' ? 'Insert Random City Data' : undefined);
			const { messages, producedArtifacts, resourceNameIndex } = setup(lookup);

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

			expect(producedArtifacts.value.get('wf-3')?.name).toBe('Insert Random City Data');
			expect(resourceNameIndex.value.get('insert random city data')?.id).toBe('wf-3');
			expect(resourceNameIndex.value.get('untitled')).toBeUndefined();
		});

		test('keeps original name when lookup returns undefined', async () => {
			const lookup = () => undefined;
			const { messages, producedArtifacts } = setup(lookup);

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

			expect(producedArtifacts.value.get('wf-4')?.name).toBe('Original Name');
		});

		test('does not enrich data-table entries', async () => {
			const lookup = () => 'Should Not Apply';
			const { messages, producedArtifacts } = setup(lookup);

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

			expect(producedArtifacts.value.get('dt-1')?.name).toBe('cities1');
		});
	});

	describe('data table mutation artifact metadata', () => {
		test.each(['insert-data-table-rows', 'update-data-table-rows', 'delete-data-table-rows'])(
			'registers data table from %s result with name and projectId',
			async (toolName) => {
				const { messages, producedArtifacts } = setup();

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

				const entry = producedArtifacts.value.get('dt-mut-1') as ResourceEntry;
				expect(entry).toEqual({
					type: 'data-table',
					id: 'dt-mut-1',
					name: 'Orders',
					projectId: 'proj-1',
				});
			},
		);

		test('uses dataTableId as fallback name when tableName is missing', async () => {
			const { messages, producedArtifacts } = setup();

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

			expect(producedArtifacts.value.get('dt-no-name')).toEqual({
				type: 'data-table',
				id: 'dt-no-name',
				name: 'dt-no-name',
				projectId: 'proj-3',
			});
		});
	});

	describe('workflow references', () => {
		test('workflows(action="setup") result lands tables in referencedArtifacts and credentials in referencedArtifacts', async () => {
			const { messages, producedArtifacts, referencedArtifacts } = setup();
			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'workflows',
								result: {
									success: true,
									references: {
										workflowId: 'wf-1',
										referencedDataTables: [{ id: 'dt-1', name: 'Customers', projectId: 'proj-1' }],
										appliedCredentials: [
											{ id: 'c-1', name: 'Prod Slack', credentialType: 'slackApi' },
										],
									},
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(referencedArtifacts.value.get('dt-1')).toEqual({
				type: 'data-table',
				id: 'dt-1',
				name: 'Customers',
				projectId: 'proj-1',
			} satisfies ResourceEntry);
			expect(referencedArtifacts.value.get('c-1')).toEqual({
				type: 'credential',
				id: 'c-1',
				name: 'Prod Slack',
			} satisfies ResourceEntry);
			expect(producedArtifacts.value.has('dt-1')).toBe(false);
			expect(producedArtifacts.value.has('c-1')).toBe(false);
		});

		test('a later emission for the same workflow replaces the earlier reference set', async () => {
			const { messages, referencedArtifacts } = setup();
			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-early',
								toolName: 'build-workflow',
								startedAt: '2026-04-20T10:00:00Z',
								result: {
									success: true,
									workflowId: 'wf-1',
									references: {
										workflowId: 'wf-1',
										referencedDataTables: [{ id: 'dt-old', name: 'Old', projectId: 'p' }],
										appliedCredentials: [],
									},
								},
							}),
							makeToolCall({
								toolCallId: 'tc-late',
								toolName: 'build-workflow',
								startedAt: '2026-04-20T11:00:00Z',
								result: {
									success: true,
									workflowId: 'wf-1',
									references: {
										workflowId: 'wf-1',
										referencedDataTables: [{ id: 'dt-new', name: 'New', projectId: 'p' }],
										appliedCredentials: [],
									},
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(referencedArtifacts.value.has('dt-old')).toBe(false);
			expect(referencedArtifacts.value.get('dt-new')?.name).toBe('New');
		});

		test('startedAt sorts emissions globally across parent and child agents', async () => {
			const { messages, referencedArtifacts } = setup();
			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'parent-late',
								toolName: 'workflows',
								startedAt: '2026-04-20T12:00:00Z',
								result: {
									references: {
										workflowId: 'wf-1',
										referencedDataTables: [{ id: 'dt-parent', name: 'Parent', projectId: 'p' }],
										appliedCredentials: [],
									},
								},
							}),
						],
						children: [
							makeAgentNode({
								agentId: 'child',
								toolCalls: [
									makeToolCall({
										toolCallId: 'child-later',
										toolName: 'submit-workflow',
										startedAt: '2026-04-20T13:00:00Z',
										result: {
											success: true,
											workflowId: 'wf-1',
											references: {
												workflowId: 'wf-1',
												referencedDataTables: [{ id: 'dt-child', name: 'Child', projectId: 'p' }],
												appliedCredentials: [],
											},
										},
									}),
								],
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(referencedArtifacts.value.has('dt-parent')).toBe(false);
			expect(referencedArtifacts.value.get('dt-child')?.name).toBe('Child');
		});

		test('produced wins over referenced when the same id appears in both', async () => {
			const { messages, producedArtifacts, referencedArtifacts } = setup();
			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								result: {
									table: { id: 'dt-shared', name: 'Shared', projectId: 'p' },
								},
							}),
							makeToolCall({
								toolName: 'workflows',
								result: {
									references: {
										workflowId: 'wf-1',
										referencedDataTables: [{ id: 'dt-shared', name: 'Shared', projectId: 'p' }],
										appliedCredentials: [],
									},
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.value.has('dt-shared')).toBe(true);
			expect(referencedArtifacts.value.has('dt-shared')).toBe(false);
		});
	});
});
