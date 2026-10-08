import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import InstanceAiOnboardingIntro from './InstanceAiOnboardingIntro.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const renderIntro = createComponentRenderer(InstanceAiOnboardingIntro, {
	props: {
		incomplete: false,
		connectModelOnly: false,
		returnVisit: false,
		modelValue: 'Not set',
		sandboxValue: 'Not set',
		searchValue: 'Not set',
	},
});

describe('InstanceAiOnboardingIntro', () => {
	it('renders the initial benefits and emits its actions', async () => {
		const { emitted, getByTestId, getByText, queryByTestId } = renderIntro();

		expect(getByTestId('assistant-setup-intro')).toBeVisible();
		expect(getByText('instanceAi.onboarding.title')).toBeVisible();
		expect(getByText('instanceAi.onboarding.benefit.build')).toBeVisible();
		expect(getByText('instanceAi.onboarding.setUp')).toBeVisible();
		expect(queryByTestId('assistant-turn-off')).toBeNull();

		await fireEvent.click(getByTestId('assistant-setup-cta'));
		await fireEvent.click(getByTestId('assistant-set-up-later'));

		expect(emitted().setup).toEqual([[]]);
		expect(emitted().setupLater).toEqual([[]]);
	});

	it('offers turn-off instead of set-up-later on a return visit', async () => {
		const { emitted, getByTestId, queryByTestId } = renderIntro({
			props: { returnVisit: true },
		});

		expect(queryByTestId('assistant-set-up-later')).toBeNull();

		await fireEvent.click(getByTestId('assistant-turn-off'));

		expect(emitted().turnOff).toEqual([[]]);
	});

	it('uses the connect-model CTA for the compose fast path', () => {
		const { getByText } = renderIntro({ props: { connectModelOnly: true } });

		expect(getByText('instanceAi.onboarding.connectModel')).toBeVisible();
	});

	it('renders setup progress and opens the selected checklist step', async () => {
		const { emitted, getByTestId, getByText } = renderIntro({
			props: {
				incomplete: true,
				modelValue: 'anthropic/claude-opus-5',
				sandboxValue: 'n8n Sandbox',
				searchValue: 'Disabled',
			},
		});

		expect(getByTestId('assistant-setup-incomplete')).toBeVisible();
		expect(getByTestId('settings-row-group')).toBeVisible();
		expect(getByText('instanceAi.onboarding.incomplete.lede')).toBeVisible();
		expect(getByText('anthropic/claude-opus-5')).toBeVisible();
		expect(getByText('n8n Sandbox')).toBeVisible();
		expect(getByText('Disabled')).toBeVisible();

		await fireEvent.click(getByTestId('assistant-setup-checklist-model'));
		await fireEvent.click(getByTestId('assistant-setup-checklist-sandbox'));
		await fireEvent.click(getByTestId('assistant-setup-checklist-search'));
		expect(getByTestId('assistant-set-up-later')).toBeVisible();
		await fireEvent.click(getByTestId('assistant-finish-setup-cta'));

		expect(emitted().openStep).toEqual([['model'], ['sandbox'], ['search']]);
		expect(emitted().setup).toEqual([[]]);
	});
});
