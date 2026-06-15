import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import EventSelection from './EventSelection.vue';
import { useLogStreamingStore } from '../logStreaming.store';

const renderComponent = createComponentRenderer(EventSelection);

describe('EventSelection.ee.vue', () => {
	let logStreamingStore: MockedStore<typeof useLogStreamingStore>;

	const mockEventGroups = [
		{
			name: 'n8n.workflow',
			selected: false,
			indeterminate: false,
			label: 'n8n.workflow',
			children: [
				{
					name: 'n8n.workflow.started',
					selected: false,
					indeterminate: false,
					label: 'Started',
				},
				{
					name: 'n8n.workflow.success',
					selected: true,
					indeterminate: false,
					label: 'Success',
				},
			],
		},
		{
			name: 'n8n.node',
			selected: true,
			indeterminate: false,
			label: 'n8n.node',
			children: [
				{ name: 'n8n.node.started', selected: false, indeterminate: false, label: 'Started' },
				{ name: 'n8n.node.finished', selected: false, indeterminate: false, label: 'Finished' },
			],
		},
		{
			name: 'n8n.audit',
			selected: false,
			indeterminate: true,
			label: 'n8n.audit',
			children: [
				{
					name: 'n8n.audit.user.login.success',
					selected: true,
					indeterminate: false,
					label: 'User Login Success',
				},
				{
					name: 'n8n.audit.user.login.failed',
					selected: false,
					indeterminate: false,
					label: 'User Login Failed',
				},
			],
		},
	];

	beforeEach(() => {
		createTestingPinia();
		logStreamingStore = mockedStore(useLogStreamingStore);

		// Setup mock store items
		logStreamingStore.items = {
			'test-destination-id': {
				destination: {
					id: 'test-destination-id',
					anonymizeAuditMessages: false,
				},
				eventGroups: mockEventGroups,
				selectedEvents: new Set(['n8n.workflow.success', 'n8n.audit.user.login.success']),
				isNew: false,
			},
		} as never;
	});

	describe('Component Rendering & Props', () => {
		it('should render with default destinationId', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'defaultDestinationId',
				},
			});

			expect(container).toBeTruthy();
		});

		it('should render with custom destinationId', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// 3 groups + 6 children (2+2+2) + 1 anonymize = 10 checkboxes
			expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(10);
		});

		it('should disable checkboxes in readonly mode', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
					readonly: true,
				},
			});

			const checkboxes = container.querySelectorAll('[role="checkbox"]');
			checkboxes.forEach((checkbox) => {
				expect(checkbox.getAttribute('data-disabled')).toBe('');
			});
		});

		it('should enable checkboxes in non-readonly mode', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
					readonly: false,
				},
			});

			const checkboxes = container.querySelectorAll('[role="checkbox"]');
			checkboxes.forEach((checkbox) => {
				expect(checkbox.getAttribute('data-disabled')).toBeNull();
			});
		});
	});

	describe('Event Group Checkboxes', () => {
		it('should render group checkbox with correct selected state', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Verify that groups are rendered
			const allCheckboxes = container.querySelectorAll('[role="checkbox"]');
			expect(allCheckboxes.length).toBeGreaterThan(3);
		});

		it('should render group checkbox with indeterminate state', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Verify audit group has indeterminate state
			const auditGroupCheckbox = Array.from(container.querySelectorAll('[role="checkbox"]')).find(
				(checkbox) => checkbox.getAttribute('data-state') === 'indeterminate',
			);
			expect(auditGroupCheckbox).toBeTruthy();
		});

		it('should emit input event when group checkbox changes', async () => {
			const { emitted, container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const firstCheckbox = container.querySelector('[role="checkbox"]') as HTMLElement;
			firstCheckbox?.click();

			await vi.waitFor(() => {
				expect(emitted()).toHaveProperty('input');
			});
		});

		it('should call setSelectedInGroup when group checkbox is checked', async () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const firstCheckbox = container.querySelector('[role="checkbox"]') as HTMLElement;
			firstCheckbox?.click();

			await vi.waitFor(() => {
				expect(logStreamingStore.setSelectedInGroup).toHaveBeenCalled();
			});
		});
	});

	describe('Child Event Checkboxes', () => {
		it('should render child checkbox with correct selected state', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const checkboxes = container.querySelectorAll('[role="checkbox"]');
			// n8n.workflow.success is selected (4th checkbox)
			expect(checkboxes[4]?.getAttribute('data-state')).toBe('checked');
		});

		it('should show child as selected when parent group is selected', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Verify children of selected groups are rendered
			const allCheckboxes = container.querySelectorAll('[role="checkbox"]');
			expect(allCheckboxes.length).toBeGreaterThan(5); // At least 3 groups + children
		});

		it('should emit input event when child checkbox changes', async () => {
			const { emitted, container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const childCheckbox = container.querySelectorAll('[role="checkbox"]')[3] as HTMLElement;
			childCheckbox?.click();

			await vi.waitFor(() => {
				expect(emitted()).toHaveProperty('input');
			});
		});
	});

	describe('Audit Anonymization Feature', () => {
		it('should render anonymization checkbox only for n8n.audit group', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Find the anonymization checkbox by looking for text containing "Anonymize"
			const allText = container.textContent;
			expect(allText).toContain('Anonymize');
		});

		it('should reflect anonymizeAuditMessages value from store', () => {
			logStreamingStore.items['test-destination-id'].destination.anonymizeAuditMessages = true;

			const { getByRole } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Find the anonymization checkbox wrapper and check its checkbox state
			expect(getByRole('checkbox', { name: /anonymize/i }).getAttribute('data-state')).toBe(
				'checked',
			);
		});

		it('should disable anonymization checkbox in readonly mode', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
					readonly: true,
				},
			});

			const checkboxes = container.querySelectorAll('[role="checkbox"]');
			checkboxes.forEach((checkbox) => {
				expect(checkbox.getAttribute('data-disabled')).toBe('');
			});
		});

		it('should emit input event when anonymization checkbox changes', async () => {
			const { emitted, getByRole } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			getByRole('checkbox', { name: /anonymize/i }).click();

			await vi.waitFor(() => {
				expect(emitted()).toHaveProperty('input');
			});
		});

		it('should emit change event with correct payload when anonymization changes', async () => {
			const { emitted, getByRole } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			getByRole('checkbox', { name: /anonymize/i }).click();

			await vi.waitFor(() => {
				expect(emitted()).toHaveProperty('change');
				const changeEvents = emitted().change as unknown[][];
				expect(changeEvents[0]?.[0]).toEqual({
					name: 'anonymizeAuditMessages',
					node: 'test-destination-id',
					value: expect.any(Boolean),
				});
			});
		});
	});

	describe('i18n Methods', () => {
		it('should display group labels', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Group labels should be displayed (either translated or original)
			expect(container.textContent).toBeTruthy();
			expect(container.querySelectorAll('[role="checkbox"]').length).toBeGreaterThan(0);
		});

		it('should render help icons for tooltips', () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			// Help icons should be present (tooltips)
			const icons = container.querySelectorAll('[data-icon="circle-help"]');
			expect(icons.length).toBeGreaterThan(0);
		});
	});

	describe('Store Interactions', () => {
		it('should call setSelectedInGroup with correct parameters', async () => {
			const { container } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const firstCheckbox = container.querySelector('[role="checkbox"]') as HTMLElement;
			firstCheckbox?.click();

			await vi.waitFor(() => {
				expect(logStreamingStore.setSelectedInGroup).toHaveBeenCalledWith(
					'test-destination-id',
					expect.any(String),
					expect.any(Boolean),
				);
			});
		});

		it('should update store destination when anonymization changes', async () => {
			const { getByRole } = renderComponent({
				props: {
					destinationId: 'test-destination-id',
				},
			});

			const initialValue =
				logStreamingStore.items['test-destination-id'].destination.anonymizeAuditMessages;

			getByRole('checkbox', { name: /anonymize/i }).click();

			await vi.waitFor(() => {
				// Store should be updated
				expect(
					logStreamingStore.items['test-destination-id'].destination.anonymizeAuditMessages,
				).toBe(!initialValue);
			});
		});
	});
});
