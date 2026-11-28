import { fireEvent, render, screen } from '@testing-library/vue';

import { useEngineV2FindingsDialog } from '../composables/useEngineV2FindingsDialog';
import type { EngineCompatibilityReason } from '../engineV2Check';
import { groupEngineV2Reasons } from '../engineV2Findings';
import EngineV2CompatibilityButton from './EngineV2CompatibilityButton.vue';

function reason(
	severity: EngineCompatibilityReason['severity'],
	nodeId?: string,
): EngineCompatibilityReason {
	return {
		code: 'RETRY_ON_FAIL',
		kind: 'temporary',
		severity,
		nodeId,
		nodeName: nodeId,
		message: 'Package message.',
	};
}

function renderButton(reasons: EngineCompatibilityReason[]) {
	return render(EngineV2CompatibilityButton, {
		props: { groups: groupEngineV2Reasons(reasons) },
	});
}

const button = () => screen.getByTestId('engine-v2-compatibility-button');
const badge = () => screen.getByTestId('engine-v2-compatibility-button-count');
const label = () => screen.getByTestId('engine-v2-compatibility-button-label');

describe('EngineV2CompatibilityButton', () => {
	afterEach(() => useEngineV2FindingsDialog().close());

	it('counts nodes, not reasons: three reasons on two nodes are two issues', () => {
		renderButton([reason('blocking', 'a'), reason('blocking', 'a'), reason('warning', 'b')]);

		expect(button()).toHaveAccessibleName('2 compatibility issues');
		expect(label()).toHaveTextContent(/^Compatibility issues$/);
		expect(badge()).toHaveTextContent('2');
	});

	it('uses the singular for one issue', () => {
		renderButton([reason('blocking', 'a')]);

		expect(button()).toHaveAccessibleName('1 compatibility issue');
		expect(label()).toHaveTextContent(/^Compatibility issue$/);
		expect(badge()).toHaveTextContent('1');
	});

	it('shows a danger badge and the blocking icon when an issue blocks', () => {
		renderButton([reason('warning', 'a'), reason('blocking', 'b')]);

		expect(badge().className).toMatch(/danger/);
		expect(button().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('circle-x');
	});

	it('shows a warning badge and the warning icon when every issue is a warning', () => {
		renderButton([reason('warning', 'a'), reason('warning', 'b')]);

		expect(badge().className).toMatch(/warning/);
		expect(button().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('triangle-alert');
	});

	it('opens the shared findings dialog', async () => {
		const { isOpen } = useEngineV2FindingsDialog();
		renderButton([reason('blocking', 'a')]);
		expect(isOpen.value).toBe(false);

		await fireEvent.click(button());

		expect(isOpen.value).toBe(true);
	});
});
