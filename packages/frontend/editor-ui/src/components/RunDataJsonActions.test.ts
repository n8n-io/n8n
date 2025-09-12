import { reactive } from 'vue';
import { mock } from 'vitest-mock-extended';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor, cleanup, fireEvent, within, screen } from '@testing-library/vue';

import RunDataJsonActions from './RunDataJsonActions.vue';
import { nonExistingJsonPath, VIEWS } from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { defaultNodeDescriptions, mockNodes } from '@/__tests__/mocks';
import { useI18n } from '@n8n/i18n';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => reactive({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

const copy = vi.fn();
vi.mock('@/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy,
	}),
}));

const i18n = useI18n();

async function createPiniaWithActiveNode() {
	const node = mockNodes[0];
	const workflow = mock<IWorkflowDb>({
		id: '1',
		name: 'Test Workflow',
		versionId: '1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		active: true,
		connections: {},
		nodes: [node],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
	workflowsStore.workflow = workflow;
	workflowsStore.nodeMetadata[node.name] = { pristine: true };
	workflowsStore.workflowExecutionData = {
		id: '1',
		finished: true,
		mode: 'trigger',
		status: 'success',
		createdAt: new Date(),
		startedAt: new Date(),
		workflowData: workflow,
		data: {
			resultData: {
				runData: {
					[node.name]: [
						{
							startTime: Date.now(),
							executionIndex: 0,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: {
												id: 1,
												name: 'First run 1',
											},
										},
										{
											json: {
												id: 2,
												name: 'First run 2',
											},
										},
									],
								],
							},
							source: [null],
						},
						{
							startTime: Date.now(),
							executionIndex: 1,
							executionTime: 1,
							data: {
								main: [
									[
										{
											json: {
												id: 3,
												name: 'Second run 1',
											},
										},
									],
								],
							},
							source: [null],
						},
					],
				},
			},
		},
	};

	ndvStore.setActiveNodeName(node.name, 'other');

	return {
		pinia,
		activeNode: ndvStore.activeNode,
	};
}

describe('RunDataJsonActions', () => {
	let server: ReturnType<typeof setupServer>;

	beforeEach(cleanup);

	beforeAll(() => {
		server = setupServer();
	});

	afterEach(() => {
		copy.mockReset();
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should copy unselected JSON output from latest run on click', async () => {
		const { pinia, activeNode } = await createPiniaWithActiveNode();
		const renderComponent = createComponentRenderer(RunDataJsonActions, {
			props: {
				node: activeNode,
				paneType: 'output',
				pushRef: 'ref',
				displayMode: 'json',
				distanceFromActive: 0,
				selectedJsonPath: nonExistingJsonPath,
				jsonData: [
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				outputIndex: 0,
				runIndex: 1,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		const { getByTestId } = renderComponent({
			pinia,
		});

		await waitFor(() => expect(getByTestId('ndv-json-actions')).toBeInTheDocument());

		const button = within(getByTestId('ndv-json-actions')).getByRole('button');

		await fireEvent.click(button);

		expect(copy).toHaveBeenCalledWith(
			JSON.stringify(
				[
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				null,
				2,
			),
		);
	});

	it('should copy unselected JSON output from selected previous run on click', async () => {
		const { pinia, activeNode } = await createPiniaWithActiveNode();
		const renderComponent = createComponentRenderer(RunDataJsonActions, {
			props: {
				node: activeNode,
				paneType: 'output',
				pushRef: 'ref',
				displayMode: 'json',
				distanceFromActive: 0,
				selectedJsonPath: nonExistingJsonPath,
				jsonData: [
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				outputIndex: 0,
				runIndex: 0,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		const { getByTestId } = renderComponent({
			pinia,
		});

		await waitFor(() => expect(getByTestId('ndv-json-actions')).toBeInTheDocument());

		const button = within(getByTestId('ndv-json-actions')).getByRole('button');

		await fireEvent.click(button);

		expect(copy).toHaveBeenCalledWith(
			JSON.stringify(
				[
					{
						id: 1,
						name: 'First run 1',
					},
					{
						id: 2,
						name: 'First run 2',
					},
				],
				null,
				2,
			),
		);
	});

	it("should copy selected JSON value on 'Copy Selection' click", async () => {
		const { pinia, activeNode } = await createPiniaWithActiveNode();
		const renderComponent = createComponentRenderer(RunDataJsonActions, {
			props: {
				node: activeNode,
				paneType: 'output',
				pushRef: 'ref',
				displayMode: 'json',
				distanceFromActive: 0,
				selectedJsonPath: '[0].name',
				jsonData: [
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				outputIndex: 0,
				runIndex: 1,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		renderComponent({
			pinia,
		});

		await waitFor(() =>
			expect(screen.getByText(i18n.baseText('runData.copyValue'))).toBeInTheDocument(),
		);

		const option = screen.getByText(i18n.baseText('runData.copyValue'));

		await fireEvent.click(option);

		expect(copy).toHaveBeenCalledWith('Second run 1');
	});

	it("should copy selected JSON value's item path on 'Copy Item Path' click", async () => {
		const { pinia, activeNode } = await createPiniaWithActiveNode();
		const renderComponent = createComponentRenderer(RunDataJsonActions, {
			props: {
				node: activeNode,
				paneType: 'output',
				pushRef: 'ref',
				displayMode: 'json',
				distanceFromActive: 0,
				selectedJsonPath: '[0].name',
				jsonData: [
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				outputIndex: 0,
				runIndex: 1,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		renderComponent({
			pinia,
		});

		await waitFor(() =>
			expect(screen.getByText(i18n.baseText('runData.copyItemPath'))).toBeInTheDocument(),
		);

		const option = screen.getByText(i18n.baseText('runData.copyItemPath'));

		await fireEvent.click(option);

		expect(copy).toHaveBeenCalledWith('{{ $item("0").$node["Manual Trigger"].json["name"] }}');
	});

	it("should copy selected JSON value's parameter path on 'Copy Parameter Path' click", async () => {
		const { pinia, activeNode } = await createPiniaWithActiveNode();
		const renderComponent = createComponentRenderer(RunDataJsonActions, {
			props: {
				node: activeNode,
				paneType: 'output',
				pushRef: 'ref',
				displayMode: 'json',
				distanceFromActive: 0,
				selectedJsonPath: '[0].name',
				jsonData: [
					{
						id: 3,
						name: 'Second run 1',
					},
				],
				outputIndex: 0,
				runIndex: 1,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		renderComponent({
			pinia,
		});

		await waitFor(() =>
			expect(screen.getByText(i18n.baseText('runData.copyParameterPath'))).toBeInTheDocument(),
		);

		const option = screen.getByText(i18n.baseText('runData.copyParameterPath'));

		await fireEvent.click(option);

		expect(copy).toHaveBeenCalledWith('{{ $node["Manual Trigger"].json["name"] }}');
	});
});
