import { useMessage } from '@n8n/design-system';
import { render } from '@testing-library/vue';
import type { VNode } from 'vue';

import { confirmEngineV2Switch } from './confirmEngineV2Switch';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const confirm = vi.fn();
	return {
		...(await importOriginal<object>()),
		useMessage: () => ({ confirm }),
	};
});

const confirm = vi.mocked(useMessage().confirm);

/** The text of the message that the confirmation got, one entry for each line. */
function messageLines(): string[] {
	const [message] = confirm.mock.calls[0];
	const { container } = render({ render: () => message as VNode });
	return [...container.querySelectorAll('p')].map((line) => line.textContent ?? '');
}

describe('confirmEngineV2Switch', () => {
	beforeEach(() => confirm.mockReset().mockResolvedValue('confirm'));

	it.each([
		['confirm', true],
		['cancel', false],
		['close', false],
	] as const)('returns %s as %s', async (action, expected) => {
		confirm.mockResolvedValue(action);

		await expect(
			confirmEngineV2Switch({ count: 2, hasBlocking: true, hasPublishedVersion: false }),
		).resolves.toBe(expected);
	});

	it('names the buttons "Switch and fix issues" and "Keep Engine v1"', async () => {
		await confirmEngineV2Switch({ count: 1, hasBlocking: true, hasPublishedVersion: false });

		expect(confirm).toHaveBeenCalledWith(expect.anything(), 'Switch to Engine v2?', {
			confirmButtonText: 'Switch and fix issues',
			cancelButtonText: 'Keep Engine v1',
		});
	});

	it('says that publishing stays off when an issue blocks', async () => {
		await confirmEngineV2Switch({ count: 2, hasBlocking: true, hasPublishedVersion: false });

		expect(messageLines()).toEqual([
			"This workflow has 2 compatibility issues with Engine v2. You can't publish it on Engine v2 until you fix the blocking issues.",
		]);
	});

	it('says that the user can still publish when every issue is a warning', async () => {
		await confirmEngineV2Switch({ count: 1, hasBlocking: false, hasPublishedVersion: false });

		expect(messageLines()).toEqual([
			'This workflow has 1 compatibility issue with Engine v2. You can still publish it, but some parts might not work as expected.',
		]);
	});

	it('adds the published version line only when the workflow has a published version', async () => {
		await confirmEngineV2Switch({ count: 2, hasBlocking: true, hasPublishedVersion: true });

		expect(messageLines()[1]).toBe(
			'The published version keeps running on its current engine until you publish again.',
		);
	});
});
