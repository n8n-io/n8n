import { nextTick } from 'vue';
import type { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import type { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { useSettingsStore } from '@/stores/settings.store';
import ParameterInputFull from './ParameterInputFull.vue';
import { FROM_AI_AUTO_GENERATED_MARKER } from 'n8n-workflow';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

let mockNdvState: Partial<ReturnType<typeof useNDVStore>>;
let mockNodeTypesState: Writeable<Partial<ReturnType<typeof useNodeTypesStore>>>;
let mockSettingsState: Writeable<Partial<ReturnType<typeof useSettingsStore>>>;

beforeEach(() => {
	mockNdvState = {
		hasInputData: true,
		activeNode: {
			id: '123',
			name: 'myParam',
			parameters: {},
			position: [0, 0],
			type: 'test',
			typeVersion: 1,
		},
		isInputPanelEmpty: false,
		isOutputPanelEmpty: false,
		ndvInputDataWithPinnedData: [],
		getHoveringItem: undefined,
		expressionOutputItemIndex: 0,
		isTableHoverOnboarded: false,
		setHighlightDraggables: vi.fn(),
	};
	mockNodeTypesState = {
		allNodeTypes: [],
		getNodeType: vi.fn().mockReturnValue({}),
	};
	mockSettingsState = {
		settings: {
			releaseChannel: 'stable',
		} as never,
		isEnterpriseFeatureEnabled: { externalSecrets: false } as never,
	};
});

vi.mock('@/stores/ndv.store', () => {
	return {
		useNDVStore: vi.fn(() => mockNdvState),
	};
});

vi.mock('@/stores/nodeTypes.store', () => {
	return {
		useNodeTypesStore: vi.fn(() => mockNodeTypesState),
	};
});

vi.mock('@/stores/settings.store', () => {
	return {
		useSettingsStore: vi.fn(() => mockSettingsState),
	};
});

const renderComponent = createComponentRenderer(ParameterInputFull, {
	pinia: createTestingPinia(),
	props: {
		path: 'myParam',
		value: '',
		parameter: {
			displayName: 'My Param',
			name: 'myParam',
			type: 'string',
		},
	},
});

describe('ParameterInputFull.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render basic parameter', async () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('parameter-input')).toBeInTheDocument();
	});

	it('should render parameter with override button inline', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent();
		expect(getByTestId('parameter-input')).toBeInTheDocument();
		expect(getByTestId('from-ai-override-button')).toBeInTheDocument();
	});

	it('should render parameter with override button in options', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent({
			props: {
				value: `={{
					'and the air is free'


				}}`,
			},
		});
		expect(getByTestId('parameter-input')).toBeInTheDocument();
		expect(getByTestId('from-ai-override-button')).toBeInTheDocument();
	});

	it('should render parameter with active override', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { queryByTestId, getByTestId } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
			},
		});
		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('override-button')).not.toBeInTheDocument();
	});

	it('should emit on wrapper hover', async () => {
		const { getByTestId, emitted } = renderComponent();
		const wrapper = getByTestId('input-label');

		await fireEvent.mouseEnter(wrapper);
		await nextTick();

		expect(emitted().hover).toEqual([[true]]);

		await fireEvent.mouseLeave(wrapper);
		await nextTick();

		expect(emitted().hover).toEqual([[true], [false]]);
	});
});
