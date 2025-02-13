/* eslint-disable n8n-local-rules/no-unneeded-backticks */
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type FrontendSettings } from '@n8n/api-types';
import { uniq } from 'lodash-es';
import { type IConnections, type IRunData, NodeConnectionType } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { type RouteLocationNormalizedLoaded } from 'vue-router';

describe(useNodeDirtiness, () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();

		// Enable new partial execution
		settingsStore.settings = {
			partialExecution: { version: 2, enforce: true },
		} as FrontendSettings;
	});

	it('should mark nodes with run data older than the last update time as dirty', async () => {
		expect(
			await calculateDirtiness({
				workflow: `
				a✅
				b✅
				c✅
				`,
				action: () => workflowsStore.setNodeParameters({ name: 'a', value: 1 }),
			}),
		).toMatchInlineSnapshot(`
				{
				  "a": "parameters-updated",
				}
			`);
	});

	it('should mark nodes with a dirty node somewhere in its upstream as upstream-dirty', async () => {
		expect(
			await calculateDirtiness({
				workflow: `
				a✅ -> b✅
				b -> c✅
				c -> d
				`,
				action: () => workflowsStore.setNodeParameters({ name: 'b', value: 1 }),
			}),
		).toMatchInlineSnapshot(`
				{
				  "b": "parameters-updated",
				  "c": "upstream-dirty",
				}
			`);
	});

	it('should return even if the connections forms a loop', async () => {
		expect(
			await calculateDirtiness({
				workflow: `
				a✅ -> b✅
				b -> c✅
				c -> d
				d -> e✅
				e -> b
				`,
				action: () => workflowsStore.setNodeParameters({ name: 'a', value: 1 }),
			}),
		).toMatchInlineSnapshot(`
				{
				  "a": "parameters-updated",
				  "b": "upstream-dirty",
				  "c": "upstream-dirty",
				  "e": "upstream-dirty",
				}
			`);
	});

	it('should mark downstream nodes of a disabled node dirty', async () => {
		expect(
			await calculateDirtiness({
				workflow: `
				a✅ -> b✅
				b -> c✅
				`,
				action: () =>
					useNodeHelpers().disableNodes([workflowsStore.nodesByName.b], { trackHistory: true }),
			}),
		).toMatchInlineSnapshot(`
			{
			  "c": "incoming-connections-updated",
			}
		`);
	});

	it('should restore original dirtiness after undoing a command', async () => {
		expect(
			await calculateDirtiness({
				workflow: `
				a✅ -> b✅
				b -> c✅
				`,
				action: async () => {
					useNodeHelpers().disableNodes([workflowsStore.nodesByName.b], { trackHistory: true });
					await useHistoryHelper({} as RouteLocationNormalizedLoaded).undo();
				},
			}),
		).toMatchInlineSnapshot(`{}`);
	});

	async function calculateDirtiness({
		workflow,
		action,
	}: { workflow: string; action: () => Promise<void> | void }) {
		const parsedConnections = workflow
			.split('\n')
			.filter((line) => line.trim() !== '')
			.map((line) =>
				line.split('->').flatMap((node) => {
					const [name, second] = node.trim().split('✅');

					return name ? [{ name, hasData: second !== undefined }] : [];
				}),
			);
		const nodes = uniq(parsedConnections?.flat()).map(({ name }) => createTestNode({ name }));
		const connections = parsedConnections?.reduce<IConnections>((conn, [from, to]) => {
			if (!to) {
				return conn;
			}

			const conns = conn[from.name]?.[NodeConnectionType.Main]?.[0] ?? [];

			conn[from.name] = {
				...conn[from.name],
				[NodeConnectionType.Main]: [
					[...conns, { node: to.name, type: NodeConnectionType.Main, index: conns.length }],
					...(conn[from.name]?.Main?.slice(1) ?? []),
				],
			};
			return conn;
		}, {});
		const wf = createTestWorkflow({ nodes, connections });

		workflowsStore.setNodes(wf.nodes);
		workflowsStore.setConnections(wf.connections);

		workflowsStore.setWorkflowExecutionData({
			id: wf.id,
			finished: true,
			mode: 'manual',
			status: 'success',
			workflowData: wf,
			startedAt: new Date(0),
			createdAt: new Date(0),
			data: {
				resultData: {
					runData: nodes.reduce<IRunData>((acc, node) => {
						if (parsedConnections.some((c) => c.some((n) => n.name === node.name && n.hasData))) {
							acc[node.name] = [
								{
									startTime: +new Date('2025-01-01'), // ran before parameter update
									executionTime: 0,
									executionStatus: 'success',
									source: [],
								},
							];
						}

						return acc;
					}, {}),
				},
			},
		});

		vi.setSystemTime(new Date('2025-01-02'));
		await action();

		const { dirtinessByName } = useNodeDirtiness();

		return dirtinessByName.value;
	}
});
