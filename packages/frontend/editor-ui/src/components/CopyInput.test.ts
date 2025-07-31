import merge from 'lodash/merge';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';

import { createTestingPinia } from '@pinia/testing';
import CopyInput from '@/components/CopyInput.vue';
import { createComponentRenderer } from '@/__tests__/render';

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
			},
		},
	}),
	props: {
		copyButtonText: 'Click to copy',
		label: 'Copy Input test',
	},
};

const renderComponent = createComponentRenderer(CopyInput, DEFAULT_SETUP);

describe('BannerStack', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render default configuration', async () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('input-label')).toHaveTextContent('Copy Input test');
		expect(getByTestId('copy-input')).toHaveTextContent('Click to copy');
	});

	it('should render redacted version', async () => {
		const { getByTestId } = renderComponent(
			merge(DEFAULT_SETUP, {
				props: {
					redactValue: true,
				},
			}),
		);
		expect(getByTestId('copy-input')).toHaveClass('ph-no-capture');
	});
});
