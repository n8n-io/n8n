import { renderComponent } from '@/__tests__/render';
import type { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import type { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { useSettingsStore } from '@/stores/settings.store';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';
import ParameterInputFull from './ParameterInputFull.vue';
import { FROM_AI_AUTO_GENERATED_MARKER } from 'n8n-workflow';

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
	};
	mockNodeTypesState = {
		allNodeTypes: [],
	};
	mockSettingsState = {
		settings: {
			releaseChannel: 'stable',
		} as never,
		isEnterpriseFeatureEnabled: { externalSecrets: false } as never,
	};
	createAppModals();
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

describe('ParameterInputFull.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
	});

	it('should render basic parameter', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({});
		const { getByTestId } = renderComponent(ParameterInputFull, {
			pinia: createTestingPinia(),
			props: {
				path: 'myParam',
				parameter: {
					displayName: 'My Param',
					name: 'myParam',
					type: 'string',
				},
			},
		});
		expect(getByTestId('parameter-input')).toBeInTheDocument();
	});

	it('should render parameter with override button inline', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent(ParameterInputFull, {
			pinia: createTestingPinia(),
			props: {
				path: 'myParam',
				parameter: {
					displayName: 'My Param',
					name: 'myParam',
					type: 'string',
				},
				value: '',
			},
		});
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
		const { getByTestId } = renderComponent(ParameterInputFull, {
			pinia: createTestingPinia(),
			props: {
				path: 'myParam',
				parameter: {
					displayName: 'My Param',
					name: 'myParam',
					type: 'string',
				},
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
		const { queryByTestId, getByTestId } = renderComponent(ParameterInputFull, {
			pinia: createTestingPinia(),
			props: {
				path: 'myParam',
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
				parameter: {
					displayName: 'My Param',
					name: 'myParam',
					type: 'string',
				},
			},
		});
		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('override-button')).not.toBeInTheDocument();
	});
});
