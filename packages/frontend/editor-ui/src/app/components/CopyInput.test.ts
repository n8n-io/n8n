import merge from 'lodash/merge';
import userEvent from '@testing-library/user-event';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';

import { createTestingPinia } from '@pinia/testing';
import CopyInput from '@/app/components/CopyInput.vue';
import { createComponentRenderer } from '@/__tests__/render';

const { copySpy } = vi.hoisted(() => ({ copySpy: vi.fn() }));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: copySpy }),
}));

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

	it('copies the value when the field is activated from the keyboard', async () => {
		const deployKey = 'ssh-ed25519 AAA';
		const { getByTestId } = renderComponent({ props: { value: deployKey } });
		const field = getByTestId('copy-input');
		field.focus();

		await userEvent.keyboard('{Enter}');
		expect(copySpy).toHaveBeenCalledWith(deployKey);

		copySpy.mockClear();
		await userEvent.keyboard(' ');
		expect(copySpy).toHaveBeenCalledWith(deployKey);
	});

	it('does not scroll the page when the field is activated with the space key', async () => {
		const { getByTestId } = renderComponent();
		const field = getByTestId('copy-input');
		const spaceKeydown = new KeyboardEvent('keydown', {
			key: ' ',
			bubbles: true,
			cancelable: true,
		});

		field.dispatchEvent(spaceKeydown);

		expect(spaceKeydown.defaultPrevented).toBe(true);
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
