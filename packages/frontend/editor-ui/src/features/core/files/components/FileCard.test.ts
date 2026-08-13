import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import FileCard from '@/features/core/files/components/FileCard.vue';
import type { FileResource } from '@/features/core/files/files.types';
import { createTestingPinia } from '@pinia/testing';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

vi.mock('@/features/collaboration/projects/projects.store');

let mockHasDependencies = false;

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		hasDependencies: () => mockHasDependencies,
		getTotalCount: vi.fn(() => 0),
	}),
}));

vi.mock('vue-router', async () => {
	const { reactive } = await import('vue');
	const mockRoute = reactive({
		params: {
			projectId: '1',
			id: '1',
		},
		query: {},
	});

	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/files/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn(() => mockRoute),
		RouterLink: vi.fn(),
	};
});

const DEFAULT_FILE: FileResource = {
	id: '1',
	name: 'logo-header.png',
	mimeType: 'image/png',
	sizeBytes: 245760,
	projectId: '1',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'file',
} as const satisfies FileResource;

const renderComponent = createComponentRenderer(FileCard, {
	props: {
		file: DEFAULT_FILE,
		readOnly: false,
		showOwnershipBadge: false,
	},
	global: {
		stubs: {
			TimeAgo: {
				template: '<span>just now</span>',
			},
			ProjectCardBadge: {
				template: '<div data-test-id="project-card-badge" />',
			},
			FileActions: {
				template: '<div data-test-id="file-card-actions" />',
			},
			DependencyPill: {
				template: '<div data-test-id="file-card-dependents" />',
			},
		},
	},
});

describe('FileCard', () => {
	beforeEach(() => {
		createTestingPinia();
		mockHasDependencies = false;
		vi.mocked(useProjectsStore).mockReturnValue({
			personalProject: null,
		} as unknown as ReturnType<typeof useProjectsStore>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render file info correctly', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('file-card-icon')).toBeInTheDocument();
		expect(getByTestId('file-card-name')).toHaveTextContent(DEFAULT_FILE.name);
		expect(getByTestId('file-card-size')).toHaveTextContent('240KB');
		expect(getByTestId('file-card-type')).toHaveTextContent('PNG');
		expect(getByTestId('file-card-last-updated')).toHaveTextContent('Last updated');
		expect(getByTestId('file-card-created')).toHaveTextContent('Created');
	});

	it('should not render readonly badge when not readonly', () => {
		const { queryByText } = renderComponent();
		expect(queryByText('Read only')).not.toBeInTheDocument();
	});

	it('should render readonly badge when readonly', () => {
		const { getByText } = renderComponent({
			props: {
				readOnly: true,
			},
		});
		expect(getByText('Read only')).toBeInTheDocument();
	});

	it('should emit preview when the card is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await fireEvent.click(getByTestId('file-card'));

		expect(emitted().preview).toBeTruthy();
		expect(emitted().preview[0]).toEqual([DEFAULT_FILE]);
	});

	it('should not render the selection checkbox when not selectable', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('file-card-checkbox')).not.toBeInTheDocument();
	});

	it('should emit update:selected when the checkbox is toggled', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				selectable: true,
			},
		});

		const checkbox = getByTestId('file-card-checkbox');
		await fireEvent.click(checkbox.querySelector('input') ?? checkbox);

		expect(emitted()['update:selected']).toBeTruthy();
		expect(emitted()['update:selected'][0]).toEqual([true]);
	});

	it('should not render the dependency pill without dependents', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('file-card-dependents')).not.toBeInTheDocument();
	});

	it('should render the dependency pill when the file has dependents', () => {
		mockHasDependencies = true;
		const { getByTestId } = renderComponent();
		expect(getByTestId('file-card-dependents')).toBeInTheDocument();
	});

	it('should render the ownership badge when requested', () => {
		const { getByTestId } = renderComponent({
			props: {
				showOwnershipBadge: true,
			},
		});
		expect(getByTestId('project-card-badge')).toBeInTheDocument();
	});
});
