import SourceControlPullModalEe from './SourceControlPullModal.ee.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import userEvent from '@testing-library/user-event';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor } from '@testing-library/dom';

const eventBus = createEventBus();

const DynamicScrollerStub = {
	props: {
		items: Array,
	},
	template: '<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
	methods: {
		scrollToItem: vi.fn(),
	},
};

const DynamicScrollerItemStub = {
	template: '<slot></slot>',
};

const renderModal = createComponentRenderer(SourceControlPullModalEe, {
	global: {
		stubs: {
			DynamicScroller: DynamicScrollerStub,
			DynamicScrollerItem: DynamicScrollerItemStub,
			Modal: {
				template: `
					<div>
						<slot name="header" />
						<slot name="title" />
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

const sampleFiles = [
	{
		id: '014da93897f146d2b880-baa374b9d02d',
		name: 'vuelfow2',
		type: 'workflow',
		status: 'created',
		location: 'remote',
		conflict: false,
		file: '/014da93897f146d2b880-baa374b9d02d.json',
		updatedAt: '2025-01-09T13:12:24.580Z',
	},
	{
		id: 'a102c0b9-28ac-43cb-950e-195723a56d54',
		name: 'Gmail account',
		type: 'credential',
		status: 'created',
		location: 'remote',
		conflict: false,
		file: '/a102c0b9-28ac-43cb-950e-195723a56d54.json',
		updatedAt: '2025-01-09T13:12:24.586Z',
	},
];

describe('SourceControlPushModal', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('mounts', () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					status: [],
				},
			},
		});
		expect(getByText('Pull and override')).toBeInTheDocument();
	});

	it('should renders the changes', () => {
		const { getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		expect(getAllByTestId('pull-modal-item-header').length).toBe(2);
		expect(getAllByTestId('pull-modal-item').length).toBe(2);
	});

	it('should force pull', async () => {
		const sourceControlStore = mockedStore(useSourceControlStore);
		const { getByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		await userEvent.click(getByTestId('force-pull'));

		await waitFor(() => expect(sourceControlStore.pullWorkfolder).toHaveBeenCalledWith(true));
	});
});
