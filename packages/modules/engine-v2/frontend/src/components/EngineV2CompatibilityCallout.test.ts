import { useI18n } from '@n8n/i18n';
import { render } from '@testing-library/vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import EngineV2CompatibilityCallout from './EngineV2CompatibilityCallout.vue';

function renderCallout(reasons: EngineCompatibilityReason[]) {
	return render(EngineV2CompatibilityCallout, { props: { reasons } });
}

function reasonTexts(getAllByTestId: (id: string) => HTMLElement[]) {
	return getAllByTestId('engine-v2-compatibility-reason').map((item) => item.textContent?.trim());
}

describe('EngineV2CompatibilityCallout', () => {
	const i18n = useI18n();

	it('lists every reason', () => {
		const { getAllByTestId } = renderCallout([
			{ code: 'error-workflow', severity: 'blocking', message: 'a' },
			{ code: 'redaction-policy', severity: 'blocking', message: 'b' },
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			i18n.baseText('engineV2Compatibility.reason.errorWorkflow'),
			i18n.baseText('engineV2Compatibility.reason.redactionPolicy'),
		]);
	});

	it('shows the node name before the text when the reason has one', () => {
		const { getAllByTestId } = renderCallout([
			{
				code: 'trigger-external-identity',
				severity: 'blocking',
				nodeId: 'node-1',
				nodeName: 'Incoming webhook',
				message: 'fallback',
			},
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			`Incoming webhook: ${i18n.baseText('engineV2Compatibility.reason.triggerExternalIdentity')}`,
		]);
	});

	it.each([
		['error-workflow', 'engineV2Compatibility.reason.errorWorkflow'],
		['redaction-policy', 'engineV2Compatibility.reason.redactionPolicy'],
		['end-user-credentials', 'engineV2Compatibility.reason.endUserCredentials'],
		['trigger-external-identity', 'engineV2Compatibility.reason.triggerExternalIdentity'],
	] as const)('shows its own text for the known code %s', (code, key) => {
		const { getAllByTestId } = renderCallout([
			{ code, severity: 'blocking', message: 'English fallback from the package' },
		]);

		const text = i18n.baseText(key);
		expect(text).not.toBe(key);
		expect(reasonTexts(getAllByTestId)).toEqual([text]);
	});

	it('shows the package message for an unknown code', () => {
		const { getAllByTestId } = renderCallout([
			// A newer check can return a code that this editor does not know.
			{
				code: 'future-code' as EngineCompatibilityReason['code'],
				severity: 'blocking',
				message: 'Engine v2 does not support this yet.',
			},
		]);

		expect(reasonTexts(getAllByTestId)).toEqual(['Engine v2 does not support this yet.']);
	});

	it('uses the blocking title and theme when a reason blocks', () => {
		const { getByTestId } = renderCallout([
			{ code: 'error-workflow', severity: 'warning', message: 'a' },
			{ code: 'redaction-policy', severity: 'blocking', message: 'b' },
		]);

		const callout = getByTestId('engine-v2-compatibility-callout');
		expect(callout).toHaveTextContent(i18n.baseText('engineV2Compatibility.callout.title'));
		expect(callout.className).toMatch(/danger/);
	});

	it('uses the warning title and theme when no reason blocks', () => {
		const { getByTestId } = renderCallout([
			{ code: 'error-workflow', severity: 'warning', message: 'a' },
		]);

		const callout = getByTestId('engine-v2-compatibility-callout');
		expect(callout).toHaveTextContent(i18n.baseText('engineV2Compatibility.callout.titleWarnings'));
		expect(callout.className).toMatch(/warning/);
	});
});
