import { createComponentRenderer } from '@/__tests__/render';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUIStore } from '@/app/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import * as vueRouter from 'vue-router';
import type { MockInstance } from 'vitest';

vi.mock('vue-router', () => {
	const resolve = vi.fn().mockReturnValue({ href: '/mock-href' });
	return {
		useRouter: () => ({ resolve }),
		useRoute: () => ({ params: {} }),
		RouterLink: vi.fn(),
	};
});

let capturedSelectHandler: ((value: string) => void) | undefined;
let capturedItems: unknown[] = [];

vi.mock('@n8n/design-system/v2/components/DropdownMenu', () => ({
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		props: [
			'items',
			'trigger',
			'placement',
			'searchable',
			'searchPlaceholder',
			'emptyText',
			'maxHeight',
			'dataTestId',
			'extraPopperClass',
		],
		emits: ['select', 'search'],
		setup(props: { items: unknown[] }, { emit }: { emit: (e: string, v: string) => void }) {
			capturedItems = props.items;
			capturedSelectHandler = (value: string) => emit('select', value);
		},
		template: '<div data-test-id="mock-dropdown"><slot name="trigger" /></div>',
	},
}));

const renderComponent = createComponentRenderer(DependencyPill, {
	pinia: createTestingPinia(),
});

const createDependencies = () => [
	{ type: 'credentialId', id: 'cred-1', name: 'My API Key' },
	{ type: 'dataTableId', id: 'dt-1', name: 'Users Table', projectId: 'proj-1' },
	{ type: 'workflowCall', id: 'wf-1', name: 'Sub-Workflow A' },
	{ type: 'workflowParent', id: 'wf-2', name: 'Parent Workflow B' },
];

describe('DependencyPill', () => {
	let windowOpenSpy: MockInstance;
	let router: ReturnType<typeof vueRouter.useRouter>;

	beforeEach(() => {
		router = vueRouter.useRouter();
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		capturedSelectHandler = undefined;
		capturedItems = [];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render badge with dependency count', () => {
		const dependencies = createDependencies();
		const { getByText } = renderComponent({ props: { dependencies } });

		expect(getByText(String(dependencies.length))).toBeInTheDocument();
	});

	it('should render badge with zero count when no dependencies', () => {
		const { getByText } = renderComponent({ props: { dependencies: [] } });

		expect(getByText('0')).toBeInTheDocument();
	});

	it('should build menu items grouped by type', () => {
		const dependencies = createDependencies();
		renderComponent({ props: { dependencies } });

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
		const dependencies = [{ type: 'credentialId', id: 'cred-1', name: 'My Key' }];
		renderComponent({ props: { dependencies } });
		const uiStore = mockedStore(useUIStore);

		capturedSelectHandler?.('credentialId:cred-1');

		expect(uiStore.openExistingCredential).toHaveBeenCalledWith('cred-1');
	});

	it('should open workflow in new tab on select', () => {
		const dependencies = [{ type: 'workflowCall', id: 'wf-1', name: 'Sub WF' }];
		renderComponent({ props: { dependencies } });

		capturedSelectHandler?.('workflowCall:wf-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'wf-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should open parent workflow in new tab on select', () => {
		const dependencies = [{ type: 'workflowParent', id: 'wf-2', name: 'Parent WF' }];
		renderComponent({ props: { dependencies } });

		capturedSelectHandler?.('workflowParent:wf-2');

		expect(router.resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'wf-2' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should open data table in new tab on select', () => {
		const dependencies = [
			{ type: 'dataTableId', id: 'dt-1', name: 'My Table', projectId: 'proj-1' },
		];
		renderComponent({ props: { dependencies } });

		capturedSelectHandler?.('dataTableId:dt-1');

		expect(router.resolve).toHaveBeenCalledWith({
			name: DATA_TABLE_DETAILS,
			params: { projectId: 'proj-1', id: 'dt-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/mock-href', '_blank');
	});

	it('should not open data table without projectId', () => {
		const dependencies = [{ type: 'dataTableId', id: 'dt-1', name: 'My Table' }];
		renderComponent({ props: { dependencies } });

		capturedSelectHandler?.('dataTableId:dt-1');

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should ignore select with invalid value', () => {
		const dependencies = createDependencies();
		renderComponent({ props: { dependencies } });
		const uiStore = mockedStore(useUIStore);

		capturedSelectHandler?.('invalid');

		expect(uiStore.openExistingCredential).not.toHaveBeenCalled();
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});
});
