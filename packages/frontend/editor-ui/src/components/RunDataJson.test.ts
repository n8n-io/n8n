import { createTestingPinia } from '@pinia/testing';
import { screen, cleanup } from '@testing-library/vue';
import RunDataJson from '@/components/RunDataJson.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useElementSize } from '@vueuse/core'; // Import the composable to mock

vi.mock('@vueuse/core', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const originalModule = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core');

	return {
		...originalModule, // Keep all original exports
		useElementSize: vi.fn(), // Mock useElementSize
	};
});

(useElementSize as jest.Mock).mockReturnValue({
	height: 500, // Mocked height value
	width: 300, // Mocked width value
});

const renderComponent = createComponentRenderer(RunDataJson, {
	props: {
		mappingEnabled: true,
		editMode: { enabled: false },
		inputData: [
			{
				json: {
					list: [1, 2, 3],
					record: { name: 'Joe' },
					myNumber: 123,
					myStringNumber: '456',
					myStringText: 'abc',
					nil: null,
					d: undefined,
				},
			},
		],
		node: {
			parameters: {
				keepOnlySet: false,
				values: {},
				options: {},
			},
			id: '820ea733-d8a6-4379-8e73-88a2347ea003',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [380, 1060],
			disabled: false,
		},
	},
});

describe('RunDataJson.vue', () => {
	beforeEach(cleanup);

	it('renders json values properly', () => {
		const { container } = renderComponent({
			global: {
				plugins: [createTestingPinia()],
			},
		});
		expect(container).toMatchSnapshot();

		expect(screen.getByText('123')).toBeInTheDocument();
		expect(screen.getByText('"456"')).toBeInTheDocument();
		expect(screen.getByText('"abc"')).toBeInTheDocument();
		expect(screen.getByText('null')).toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});
});
