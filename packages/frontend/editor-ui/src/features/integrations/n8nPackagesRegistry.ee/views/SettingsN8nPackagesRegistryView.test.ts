import { createTestingPinia } from '@pinia/testing';
import type { SourceControlledFile } from '@n8n/api-types';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';

import SettingsN8nPackagesRegistryView from './SettingsN8nPackagesRegistryView.vue';

const apiMocks = vi.hoisted(() => ({
	fetchRegistries: vi.fn(),
	fetchImportableChanges: vi.fn(),
	importProjectChanges: vi.fn(),
}));

vi.mock('../n8nPackagesRegistry.api', () => apiMocks);

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

function makeChange(overrides: Partial<SourceControlledFile> = {}): SourceControlledFile {
	return {
		file: '/tmp/folders.json',
		id: 'folders',
		name: 'folders.json',
		type: 'folders',
		status: 'modified',
		location: 'remote',
		conflict: false,
		updatedAt: '2026-06-10T00:00:00.000Z',
		owner: {
			type: 'team',
			projectId: 'project-1',
			projectName: 'Folder Project',
		},
		...overrides,
	};
}

const renderComponent = createComponentRenderer(SettingsN8nPackagesRegistryView, {
	global: {
		stubs: {
			N8nBadge: {
				template: '<span><slot /></span>',
			},
			N8nButton: {
				inheritAttrs: false,
				props: {
					disabled: Boolean,
					loading: Boolean,
				},
				template: '<button v-bind="$attrs" :disabled="disabled || loading"><slot /></button>',
			},
			N8nCallout: {
				template: '<div><slot /></div>',
			},
			N8nCard: {
				template: `
					<div v-bind="$attrs">
						<slot name="prepend" />
						<slot name="header" />
						<slot />
						<slot name="append" />
					</div>
				`,
			},
			N8nDataTableServer: {
				props: {
					items: { type: Array, required: true },
				},
				template: `
					<div data-test-id="n8n-packages-registry-table">
						<div v-for="item in items" :key="item.rowId">
							<slot name="item.project" :item="item" />
							<slot name="item.projectType" :item="item" />
							<slot name="item.changeCount" :item="item" />
							<slot name="item.resources" :item="item" />
							<slot name="item.actions" :item="item" />
						</div>
					</div>
				`,
			},
			N8nHeading: {
				props: {
					tag: String,
				},
				template: '<component :is="tag || \'h1\'"><slot /></component>',
			},
			N8nIcon: {
				template: '<span />',
			},
			N8nTooltip: {
				template: '<span><slot /><slot name="content" /></span>',
			},
			Modal: {
				template: '<div><slot name="content" /></div>',
			},
			ProjectIcon: {
				template: '<span />',
			},
			N8nText: {
				props: {
					tag: String,
				},
				template: '<component :is="tag || \'span\'"><slot /></component>',
			},
		},
	},
});

describe('SettingsN8nPackagesRegistryView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiMocks.fetchRegistries.mockResolvedValue([
			{
				id: 'source-control',
				type: 'source-control',
				name: 'Source control',
				enabled: true,
				readonly: true,
			},
		]);
	});

	it('enables project import when the only supported changes are folders', async () => {
		apiMocks.fetchImportableChanges.mockResolvedValue([
			{
				project: {
					id: 'project-1',
					name: 'Folder Project',
					type: 'team',
				},
				changes: [makeChange()],
			},
		]);

		const { getByTestId, getByText } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
		});

		await vi.waitFor(() =>
			expect(getByTestId('n8n-packages-registry-card-source-control')).toBeInTheDocument(),
		);
		await fireEvent.click(getByTestId('n8n-packages-registry-card-source-control'));

		await vi.waitFor(() => expect(getByText('Folder Project')).toBeInTheDocument());

		expect(getByText('1 folder')).toBeInTheDocument();
		expect(getByTestId('n8n-packages-registry-import-project')).not.toBeDisabled();
	});
});
