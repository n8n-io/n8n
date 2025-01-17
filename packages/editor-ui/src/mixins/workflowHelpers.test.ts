import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { setupServer } from '@/__tests__/server';
import { executeData } from '@/composables/useWorkflowHelpers';
import type { IExecutionResponse } from '@/Interface';

describe('workflowHelpers', () => {
	let server: ReturnType<typeof setupServer>;
	let pinia: ReturnType<typeof createPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();

		await settingsStore.getSettings();
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('executeData()', () => {
		it('should return empty execute data if no parent nodes', () => {
			const parentNodes: string[] = [];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;

			const result = executeData(parentNodes, currentNode, inputName, runIndex);

			expect(result).toEqual({
				node: {},
				data: {},
				source: null,
			});
		});

		it('should return the correct execution data with one parent node', () => {
			const parentNodes = ['Start'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;
			const jsonData = {
				name: 'Test',
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[0]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonData,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(parentNodes, currentNode, inputName, runIndex);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonData,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[0],
						},
					],
				},
			});
		});

		it('should return the correct execution data with multiple parent nodes, only one with execution data', () => {
			const parentNodes = ['Parent A', 'Parent B'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;
			const jsonData = {
				name: 'Test',
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[1]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonData,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(parentNodes, currentNode, inputName, runIndex);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonData,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[1],
						},
					],
				},
			});
		});

		it('should return the correct execution data with multiple parent nodes, all with execution data', () => {
			const parentNodes = ['Parent A', 'Parent B'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;

			const jsonDataA = {
				name: 'Test A',
			};

			const jsonDataB = {
				name: 'Test B',
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[0]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonDataA,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
							[parentNodes[1]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonDataB,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(parentNodes, currentNode, inputName, runIndex);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonDataA,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[0],
						},
					],
				},
			});
		});
	});
});
