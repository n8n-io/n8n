import { describe, test, expect } from 'vitest';
import { ref, nextTick, watchEffect } from 'vue';
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

function setup(
	workflowNameLookup?: (id: string) => string | undefined,
	agentBuilderTarget?: () => { agentId: string; projectId: string } | undefined,
) {
	const messages = ref<InstanceAiMessage[]>([]);
	const { producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = useResourceRegistry(
		() => messages.value,
		workflowNameLookup,
		undefined,
		agentBuilderTarget,
	);
	return { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useResourceRegistry', () => {
	describe('producedArtifacts — workflow registration', () => {
		test('registers workflow with workflowName from result', async () => {
			const { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = setup();

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

			expect(producedArtifacts.get('wf-1')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-1', name: 'My Workflow' }),
			);
			expect(resourceNameIndex.get('my workflow')?.id).toBe('wf-1');
			expect(linkableResourceNameIndex.get('my workflow')?.id).toBe('wf-1');
		});

		test('falls back to args.name when result has no workflowName', async () => {
			const { messages, producedArtifacts, linkableResourceNameIndex } = setup();

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

			expect(producedArtifacts.get('wf-2')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-2', name: 'From Args' }),
			);
			expect(linkableResourceNameIndex.get('from args')?.id).toBe('wf-2');
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

			expect(producedArtifacts.get('wf-3')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-3', name: 'Untitled' }),
			);
		});

		test('registers successful workflow updates from workflowId in args', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'workflows',
								args: { action: 'update', workflowId: 'wf-update', name: 'Updated Workflow' },
								result: { success: true },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('wf-update')).toEqual(
				expect.objectContaining({
					type: 'workflow',
					id: 'wf-update',
					name: 'Updated Workflow',
				}),
			);
		});

		test('registers workflow document returned by workflows get-json', async () => {
			const { messages, producedArtifacts, resourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'workflows',
								args: { action: 'get-json', workflowId: 'wf-existing' },
								result: {
									id: 'wf-existing',
									name: 'Existing Workflow',
									nodes: [],
									connections: {},
									settings: {},
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('wf-existing')).toEqual(
				expect.objectContaining({
					type: 'workflow',
					id: 'wf-existing',
					name: 'Existing Workflow',
				}),
			);
			expect(resourceNameIndex.get('existing workflow')?.id).toBe('wf-existing');
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

			expect(producedArtifacts.get('wf-a')?.id).toBe('wf-a');
			expect(producedArtifacts.get('wf-b')?.id).toBe('wf-b');
		});
	});

	describe('producedArtifacts — targetResource registration', () => {
		test('registers a builder sub-agent targetResource as a produced workflow', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						children: [
							makeAgentNode({
								agentId: 'agent-builder-1',
								role: 'workflow-builder',
								kind: 'builder',
								status: 'active',
								targetResource: { type: 'workflow', id: 'wf-edit', name: 'Existing WF' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('wf-edit')).toEqual(
				expect.objectContaining({ type: 'workflow', id: 'wf-edit', name: 'Existing WF' }),
			);
		});

		test('ignores targetResource without an id (create flow)', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						children: [
							makeAgentNode({
								agentId: 'agent-builder-1',
								role: 'workflow-builder',
								kind: 'builder',
								status: 'active',
								targetResource: { type: 'workflow' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.size).toBe(0);
		});

		test('ignores credential targetResource (not surfaced in the artifacts panel)', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						children: [
							makeAgentNode({
								agentId: 'agent-cred-1',
								role: 'credential-setup',
								kind: 'builder',
								status: 'active',
								targetResource: { type: 'credential', id: 'cred-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.size).toBe(0);
		});

		test('falls back to Untitled when targetResource has no name', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						children: [
							makeAgentNode({
								agentId: 'agent-builder-1',
								role: 'workflow-builder',
								kind: 'builder',
								status: 'active',
								targetResource: { type: 'workflow', id: 'wf-edit' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('wf-edit')?.name).toBe('Untitled');
		});

		test('later build-workflow result overwrites the placeholder name', async () => {
			const { messages, producedArtifacts } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						children: [
							makeAgentNode({
								agentId: 'agent-builder-1',
								role: 'workflow-builder',
								kind: 'builder',
								status: 'completed',
								targetResource: { type: 'workflow', id: 'wf-edit' },
								toolCalls: [
									makeToolCall({
										toolName: 'submit-workflow',
										result: { workflowId: 'wf-edit', workflowName: 'Renamed' },
									}),
								],
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.size).toBe(1);
			expect(producedArtifacts.get('wf-edit')?.name).toBe('Renamed');
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

			expect(producedArtifacts.size).toBe(1);
			expect(producedArtifacts.get('wf-1')?.name).toBe('Renamed');
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

			expect(producedArtifacts.get('wf-1')?.name).toBe('Keep Me');
		});

		test('mutation result enriches an existing data-table entry with projectId', async () => {
			const { messages, producedArtifacts, linkableResourceNameIndex } = setup();

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

			expect(producedArtifacts.size).toBe(1);
			expect(producedArtifacts.get('dt-1')).toEqual(
				expect.objectContaining({
					type: 'data-table',
					id: 'dt-1',
					name: 'Signups',
					projectId: 'proj-2',
				}),
			);
			expect(linkableResourceNameIndex.get('signups')?.id).toBe('dt-1');
		});
	});

	describe('producedArtifacts — agent registration', () => {
		test('registers an agent from agent_builder create_agent result', async () => {
			const { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'agent_builder',
								args: { action: 'create_agent', name: 'SEO Auditor' },
								result: {
									ok: true,
									agentId: 'agent-1',
									projectId: 'project-1',
									name: 'SEO Auditor',
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('agent-1')).toEqual({
				type: 'agent',
				id: 'agent-1',
				name: 'SEO Auditor',
				projectId: 'project-1',
			});
			expect(resourceNameIndex.get('seo auditor')?.id).toBe('agent-1');
			expect(linkableResourceNameIndex.get('seo auditor')?.id).toBe('agent-1');
		});

		test('does not promote list_agents results into produced artifacts', async () => {
			const { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = setup();

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'agent_builder',
								args: { action: 'list_agents' },
								result: {
									agents: [
										{ id: 'agent-existing', name: 'Existing Agent', projectId: 'project-1' },
									],
								},
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.size).toBe(0);
			expect(resourceNameIndex.get('existing agent')?.id).toBe('agent-existing');
			expect(linkableResourceNameIndex.get('existing agent')).toBeUndefined();
		});

		test('hydrates projectId from the persisted agent-builder target', async () => {
			const { messages, producedArtifacts } = setup(undefined, () => ({
				agentId: 'agent-1',
				projectId: 'project-1',
			}));

			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'agent_builder',
								args: { action: 'create_agent', name: 'Legacy Agent' },
								result: { ok: true, agentId: 'agent-1', name: 'Legacy Agent' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(producedArtifacts.get('agent-1')).toEqual({
				type: 'agent',
				id: 'agent-1',
				name: 'Legacy Agent',
				projectId: 'project-1',
			});
		});
	});

	describe('list results do not populate producedArtifacts', () => {
		test('workflows action=list result is indexed by name only, never in producedArtifacts', async () => {
			const { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = setup();

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

			expect(producedArtifacts.size).toBe(0);
			expect(resourceNameIndex.get('workspace workflow 1')?.id).toBe('wf-list-1');
			expect(resourceNameIndex.get('workspace workflow 2')?.id).toBe('wf-list-2');
			expect(linkableResourceNameIndex.size).toBe(0);
		});

		test('data-tables action=list result is indexed by name only', async () => {
			const { messages, producedArtifacts, resourceNameIndex, linkableResourceNameIndex } = setup();

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

			expect(producedArtifacts.size).toBe(0);
			expect(resourceNameIndex.get('existing table')?.id).toBe('dt-a');
			expect(linkableResourceNameIndex.get('existing table')).toBeUndefined();
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

			expect(producedArtifacts.size).toBe(1);
			// Produced entry keeps the 'Existing' name via fallback-to-untitled
			// avoidance — the patch call has no name of its own.
			expect(producedArtifacts.get('wf-1')?.name).toBe('Untitled');
			// Name index still resolves 'existing'
			expect(resourceNameIndex.get('existing')?.id).toBe('wf-1');
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

			expect(producedArtifacts.get('wf-3')?.name).toBe('Insert Random City Data');
			expect(resourceNameIndex.get('insert random city data')?.id).toBe('wf-3');
			expect(resourceNameIndex.get('untitled')).toBeUndefined();
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

			expect(producedArtifacts.get('wf-4')?.name).toBe('Original Name');
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

			expect(producedArtifacts.get('dt-1')?.name).toBe('cities1');
		});
	});

	describe('data table mutation artifact metadata', () => {
		test.each(['insert-data-table-rows', 'update-data-table-rows', 'delete-data-table-rows'])(
			'registers data table from %s result with name and projectId',
			async (toolName) => {
				const { messages, producedArtifacts, linkableResourceNameIndex } = setup();

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

				const entry = producedArtifacts.get('dt-mut-1') as ResourceEntry;
				expect(entry).toEqual({
					type: 'data-table',
					id: 'dt-mut-1',
					name: 'Orders',
					projectId: 'proj-1',
				});
				expect(linkableResourceNameIndex.get('orders')?.id).toBe('dt-mut-1');
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

			expect(producedArtifacts.get('dt-no-name')).toEqual({
				type: 'data-table',
				id: 'dt-no-name',
				name: 'dt-no-name',
				projectId: 'proj-3',
			});
		});

		test.each(['schema', 'query'] as const)(
			'registers data table from data-tables %s result with resolved metadata',
			async (action) => {
				const { messages, producedArtifacts, linkableResourceNameIndex } = setup();

				messages.value = [
					makeMessage({
						agentTree: makeAgentNode({
							toolCalls: [
								makeToolCall({
									toolName: 'data-tables',
									args: { action, dataTableId: 'Signups' },
									result: {
										dataTableId: 'dt-signups',
										dataTableName: 'Signups',
										projectId: 'proj-4',
										...(action === 'schema' ? { columns: [] } : { count: 0, data: [] }),
									},
								}),
							],
						}),
					}),
				];
				await nextTick();

				expect(producedArtifacts.get('dt-signups')).toEqual({
					type: 'data-table',
					id: 'dt-signups',
					name: 'Signups',
					projectId: 'proj-4',
				});
				expect(linkableResourceNameIndex.get('signups')).toBeUndefined();
			},
		);
	});

	describe('in-place reactivity contract', () => {
		function setupWithArtifact() {
			const result = setup();
			result.messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								result: { workflowId: 'wf-1', workflowName: 'Pipeline' },
							}),
						],
					}),
				}),
			];
			return result;
		}

		test('entry objects keep their identity across rebuilds', async () => {
			const { messages, producedArtifacts } = setupWithArtifact();
			await nextTick();
			const entryBefore = producedArtifacts.get('wf-1');
			expect(entryBefore).toBeDefined();

			messages.value[0].agentTree!.toolCalls.push(
				makeToolCall({ toolCallId: 'tc-2', toolName: 'search' }),
			);
			await nextTick();

			expect(producedArtifacts.get('wf-1')).toBe(entryBefore);
		});

		test('rebuilds that change nothing do not notify subscribers', async () => {
			const { messages, resourceNameIndex } = setupWithArtifact();
			let runs = 0;
			const stop = watchEffect(() => {
				void [...resourceNameIndex.values()];
				runs++;
			});
			await nextTick();
			const runsAfterSetup = runs;

			// Structural event that does not change the registry: the derivation
			// re-runs, the reconcile produces zero writes, nobody is notified.
			messages.value[0].agentTree!.toolCalls.push(
				makeToolCall({ toolCallId: 'tc-2', toolName: 'search' }),
			);
			await nextTick();
			expect(runs).toBe(runsAfterSetup);

			// A real registry change notifies.
			messages.value[0].agentTree!.toolCalls.push(
				makeToolCall({
					toolCallId: 'tc-3',
					toolName: 'build-workflow',
					result: { workflowId: 'wf-2', workflowName: 'Second Pipeline' },
				}),
			);
			await nextTick();
			expect(runs).toBe(runsAfterSetup + 1);
			expect(resourceNameIndex.get('second pipeline')?.id).toBe('wf-2');

			stop();
		});

		test('field-level changes notify field readers, and removed fields are swept', async () => {
			const messages = ref<InstanceAiMessage[]>([]);
			const archived = ref<ReadonlySet<string>>(new Set());
			const { producedArtifacts } = useResourceRegistry(
				() => messages.value,
				undefined,
				() => archived.value,
			);
			messages.value = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'build-workflow',
								result: { workflowId: 'wf-1', workflowName: 'Pipeline' },
							}),
						],
					}),
				}),
			];

			let observed: boolean | undefined;
			const stop = watchEffect(() => {
				observed = producedArtifacts.get('wf-1')?.archived;
			});
			await nextTick();
			expect(observed).toBeUndefined();

			archived.value = new Set(['wf-1']);
			await nextTick();
			expect(observed).toBe(true);

			// Un-archiving rebuilds the entry WITHOUT the field — the reconcile's
			// removed-field sweep must delete it, not leave a stale true behind.
			archived.value = new Set();
			await nextTick();
			expect(observed).toBeUndefined();
			expect(Object.keys(producedArtifacts.get('wf-1') ?? {})).not.toContain('archived');

			stop();
		});
	});
});
