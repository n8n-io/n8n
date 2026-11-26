import { useI18n } from '@n8n/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import EngineV2CompatibilityButton from './EngineV2CompatibilityButton.vue';

function reason(severity: EngineCompatibilityReason['severity']): EngineCompatibilityReason {
	return { code: 'ERROR_WORKFLOW', kind: 'temporary', severity, message: 'Package message.' };
}

function buttonIcon() {
	return screen
		.getByTestId('engine-v2-compatibility-button')
		.querySelector('[data-icon]')
		?.getAttribute('data-icon');
}

describe('EngineV2CompatibilityButton', () => {
	const i18n = useI18n();

	it('shows the blocking icon when a reason blocks', () => {
		render(EngineV2CompatibilityButton, {
			props: { reasons: [reason('warning'), reason('blocking')] },
		});

		expect(buttonIcon()).toBe('circle-x');
	});

	it('shows the warning icon when every reason is a warning', () => {
		render(EngineV2CompatibilityButton, {
			props: { reasons: [reason('warning'), reason('warning')] },
		});

		expect(buttonIcon()).toBe('triangle-alert');
	});

	it.each([
		[1, '1 Engine v2 issue'],
		[3, '3 Engine v2 issues'],
	])('counts %i reasons', (count, label) => {
		render(EngineV2CompatibilityButton, {
			props: { reasons: Array.from({ length: count }, () => reason('blocking')) },
		});

		expect(screen.getByTestId('engine-v2-compatibility-button')).toHaveTextContent(label);
	});

	it('opens the dialog with every reason, and keeps the button when the dialog closes', async () => {
		render(EngineV2CompatibilityButton, {
			props: { reasons: [reason('blocking'), reason('warning')] },
		});
		expect(screen.queryByTestId('engine-v2-compatibility-dialog')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('engine-v2-compatibility-button'));

		const dialog = await screen.findByTestId('engine-v2-compatibility-dialog');
		expect(dialog).toHaveTextContent(i18n.baseText('engineV2Compatibility.dialog.title'));
		expect(screen.getAllByTestId('engine-v2-compatibility-reason')).toHaveLength(2);

		await fireEvent.keyDown(dialog, { key: 'Escape' });

		await waitFor(() =>
			expect(screen.queryByTestId('engine-v2-compatibility-dialog')).not.toBeInTheDocument(),
		);
		expect(screen.getByTestId('engine-v2-compatibility-button')).toBeInTheDocument();
	});
});
