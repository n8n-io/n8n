import { createComponentRenderer } from '@/__tests__/render';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUIStore } from '@/app/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import * as vueRouter from 'vue-router';
import type { MockInstance } from 'vitest';

const telemetryTrackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackMock }),
}));

vi.mock('vue-router', () => {
	const resolve = vi.fn().mockReturnValue({ href: '/mock-href' });
	return {
		useRouter: () => ({ resolve }),
		useRoute: () => ({ params: {} }),
		RouterLink: vi.fn(),
	};
});

let mockDepsResult:
	| {
			dependencies: Array<{ type: string; id: string; name: string; projectId?: string }>;
			inaccessibleCount: number;
	  }
	| undefined;

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		getDependencies: () => mockDepsResult,
		fetchDependencies: vi.fn(),
		getTotalCount: () => 0,
	}),
}));

let capturedSelectHandler: ((value: string) => void) | undefined;
let capturedOpenHandler: ((open: boolean) => void) | undefined;
let capturedItems: unknown[] = [];
let capturedSearchable: boolean | undefined;

vi.mock('@n8n/design-system/v2/components/DropdownMenu', () => ({
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		props: [
			'items',
			'trigger',
			'placement',
			'loading',
			'searchable',
			'searchPlaceholder',
			'emptyText',
			'maxHeight',
			'dataTestId',
			'extraPopperClass',
		],
		emits: ['select', 'search', 'update:modelValue'],
		setup(
			props: { items: unknown[]; searchable: boolean },
			{ emit }: { emit: (e: string, v: unknown) => void },
		) {
			capturedItems = props.items;
			capturedSearchable = props.searchable;
			capturedSelectHandler = (value: string) => emit('select', value);
			capturedOpenHandler = (open: boolean) => emit('update:modelValue', open);
		},
		template:
			'<div data-test-id="mock-dropdown"><slot name="trigger" /><slot name="footer" /></div>',
	},
}));

const renderComponent = createComponentRenderer(DependencyPill, {
	pinia: createTestingPinia(),
});

const createDepsResult = (inaccessibleCount = 0) => ({
	dependencies: [
		{ type: 'credentialId', id: 'cred-1', name: 'My API Key' },
		{ type: 'dataTableId', id: 'dt-1', name: 'Users Table', projectId: 'proj-1' },
		{ type: 'workflowCall', id: 'wf-1', name: 'Sub-Workflow A' },
		{ type: 'workflowParent', id: 'wf-2', name: 'Parent Workflow B' },
	],
	inaccessibleCount,
});

const defaultProps = {
	resourceType: 'workflow' as const,
	resourceId: 'wf-test',
	source: 'workflow_card' as const,
};

describe('DependencyPill', () => {
	let windowOpenSpy: MockInstance;
	let router: ReturnType<typeof vueRouter.useRouter>;

	beforeEach(() => {
		router = vueRouter.useRouter();
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		capturedSelectHandler = undefined;
		capturedOpenHandler = undefined;
		capturedItems = [];
		capturedSearchable = undefined;
		mockDepsResult = undefined;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render badge with dependency count', () => {
		mockDepsResult = createDepsResult();
		const { getByText } = renderComponent({ props: defaultProps });

		expect(getByText(String(mockDepsResult.dependencies.length))).toBeInTheDocument();
	});

	it('should render badge with zero count when no dependencies', () => {
		const { getByText } = renderComponent({ props: defaultProps });

		expect(getByText('0')).toBeInTheDocument();
	});

	it('should build menu items grouped by type', () => {
		mockDepsResult = createDepsResult();
		renderComponent({ props: defaultProps });

		const items = capturedItems as Array<{ id: string; label: string; disabled?: boolean }>;

		// Should have 4 headers + 4 items = 8 total
		expect(items).toHaveLength(8);

		// First group: credentials header + item
		expect(items[0].id).toBe('header-credentialId');
		expect(items[0].disabled).toBe(true);
		expect(items[1].id).toBe('credentialId:cred-1');

		// Second group: data tables header + item (should have divider)
		expect(items[2].id).toBe('header-dataTableId');
		expect(items[3].id).toBe('dataTableId:dt-1');

		// Third group: sub-workflows
		expect(items[4].id).toBe('header-workflowCall');
		expect(items[5].id).toBe('workflowCall:wf-1');

		// Fourth group: parent workflows
		expect(items[6].id).toBe('header-workflowParent');
		expect(items[7].id).toBe('workflowParent:wf-2');
	});

	it('should open credential on select', () => {
		mockDepsResult = {
			dependencies: [{ type: 'credentialId', id: 'cred-1', name: 'My Key' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });
		const uiStore = mockedStore(useUIStore);

		capturedSelectHandler?.('credentialId:cred-1');

		expect(uiStore.openExistingCredential).toHaveBeenCalledWith('cred-1');
	});

	it('should open workflow in new tab on select', () => {
		mockDepsResult = {
			dependencies: [{ type: 'workflowCall', id: 'wf-1', name: 'Sub WF' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('workflowCall:wf-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'wf-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should open parent workflow in new tab on select', () => {
		mockDepsResult = {
			dependencies: [{ type: 'workflowParent', id: 'wf-2', name: 'Parent WF' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('workflowParent:wf-2');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'wf-2' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should open data table in new tab on select', () => {
		mockDepsResult = {
			dependencies: [{ type: 'dataTableId', id: 'dt-1', name: 'My Table', projectId: 'proj-1' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('dataTableId:dt-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: DATA_TABLE_DETAILS,
			params: { projectId: 'proj-1', id: 'dt-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should not open data table without projectId', () => {
		mockDepsResult = {
			dependencies: [{ type: 'dataTableId', id: 'dt-1', name: 'My Table' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('dataTableId:dt-1');

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should ignore select with invalid value', () => {
		mockDepsResult = createDepsResult();
		renderComponent({ props: defaultProps });
		const uiStore = mockedStore(useUIStore);

		capturedSelectHandler?.('invalid');

		expect(uiStore.openExistingCredential).not.toHaveBeenCalled();
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should hide search when fewer than 6 dependencies', () => {
		mockDepsResult = createDepsResult(); // 4 items
		renderComponent({ props: defaultProps });

		expect(capturedSearchable).toBe(false);
	});

	it('should show search when 6 or more dependencies', () => {
		mockDepsResult = {
			dependencies: [
				{ type: 'credentialId', id: 'c-1', name: 'Cred 1' },
				{ type: 'credentialId', id: 'c-2', name: 'Cred 2' },
				{ type: 'credentialId', id: 'c-3', name: 'Cred 3' },
				{ type: 'workflowCall', id: 'w-1', name: 'WF 1' },
				{ type: 'workflowCall', id: 'w-2', name: 'WF 2' },
				{ type: 'workflowCall', id: 'w-3', name: 'WF 3' },
			],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		expect(capturedSearchable).toBe(true);
	});

	it('should track telemetry when dropdown opens', () => {
		mockDepsResult = createDepsResult();
		renderComponent({ props: { ...defaultProps, source: 'credential_card' } });

		capturedOpenHandler?.(true);

		expect(telemetryTrackMock).toHaveBeenCalledWith('User opened dependency pill', {
			source: 'credential_card',
			dependency_count: mockDepsResult.dependencies.length,
		});
	});

	it('should not track telemetry when dropdown closes', () => {
		mockDepsResult = createDepsResult();
		renderComponent({ props: defaultProps });

		capturedOpenHandler?.(false);

		expect(telemetryTrackMock).not.toHaveBeenCalled();
	});

	it('should include inaccessible count in badge total', () => {
		mockDepsResult = {
			dependencies: [{ type: 'credentialId', id: 'cred-1', name: 'My API Key' }],
			inaccessibleCount: 2,
		};
		const { getByText } = renderComponent({ props: defaultProps });

		// Badge should show 1 accessible + 2 inaccessible = 3
		expect(getByText('3')).toBeInTheDocument();
	});

	it('should show hidden notice with count when inaccessibleCount > 0', () => {
		mockDepsResult = {
			dependencies: [{ type: 'credentialId', id: 'cred-1', name: 'My API Key' }],
			inaccessibleCount: 1,
		};
		const { getByText } = renderComponent({ props: defaultProps });

		expect(getByText('+1 not accessible to you')).toBeInTheDocument();
	});

	it('should pluralize hidden notice for multiple inaccessible deps', () => {
		mockDepsResult = {
			dependencies: [{ type: 'credentialId', id: 'cred-1', name: 'My API Key' }],
			inaccessibleCount: 3,
		};
		const { getByText } = renderComponent({ props: defaultProps });

		expect(getByText('+3 not accessible to you')).toBeInTheDocument();
	});

	it('should not show hidden notice when inaccessibleCount is 0', () => {
		mockDepsResult = createDepsResult();
		const { queryByText } = renderComponent({ props: defaultProps });

		expect(queryByText(/not accessible to you/)).not.toBeInTheDocument();
	});

	it('should open error workflow in new tab on select', () => {
		mockDepsResult = {
			dependencies: [{ type: 'errorWorkflow', id: 'err-wf-1', name: 'Error Handler' }],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('errorWorkflow:err-wf-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'err-wf-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should open error workflow parent in new tab on select', () => {
		mockDepsResult = {
			dependencies: [
				{ type: 'errorWorkflowParent', id: 'parent-wf-1', name: 'Parent Using Error Handler' },
			],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		capturedSelectHandler?.('errorWorkflowParent:parent-wf-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'parent-wf-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should group error workflow dependencies in menu items', () => {
		mockDepsResult = {
			dependencies: [
				{ type: 'errorWorkflow', id: 'err-wf-1', name: 'Error Handler' },
				{ type: 'errorWorkflowParent', id: 'parent-wf-1', name: 'Parent WF' },
			],
			inaccessibleCount: 0,
		};
		renderComponent({ props: defaultProps });

		const items = capturedItems as Array<{ id: string; label: string; disabled?: boolean }>;

		// Should have 2 headers + 2 items = 4 total
		expect(items).toHaveLength(4);
		expect(items[0].id).toBe('header-errorWorkflow');
		expect(items[0].disabled).toBe(true);
		expect(items[1].id).toBe('errorWorkflow:err-wf-1');
		expect(items[2].id).toBe('header-errorWorkflowParent');
		expect(items[3].id).toBe('errorWorkflowParent:parent-wf-1');
	});
});
