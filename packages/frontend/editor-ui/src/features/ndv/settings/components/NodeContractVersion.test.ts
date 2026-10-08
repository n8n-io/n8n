import { createTestNode } from '@/__tests__/mocks';
import { renderComponent } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { INode } from 'n8n-workflow';
import NodeContractVersion from './NodeContractVersion.vue';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/rest-api-client')>()),
	makeRestApiRequest: vi.fn(),
}));

const digest = `sha256:${'a'.repeat(64)}`;
const pin = { version: '3.1.0', digest };
const versions = [
	{ version: '3.2.0', digest, nodeContract: '2.11.0' },
	{ version: '3.1.0', digest, nodeContract: '2.11.0', withdrawn: 'yanked' },
	{ version: '3.0.0', digest, nodeContract: '2.11.0' },
];

const render = (contract: INode['contract']) =>
	renderComponent(NodeContractVersion, {
		pinia: createTestingPinia(),
		props: {
			node: createTestNode({
				type: 'n8n-nodes-base.slack',
				typeVersion: 3,
				parameters: { resource: 'message', operation: 'post' },
				contract,
			}),
		},
	});

describe('NodeContractVersion', () => {
	beforeEach(() => {
		vi.mocked(makeRestApiRequest).mockReset().mockResolvedValue(versions);
	});

	it('shows the lock and asks for the versions of the node', async () => {
		const { getByTestId } = render(pin);

		expect(getByTestId('node-contract-version-lock')).toHaveTextContent('Locked to 3.1.0');
		expect(getByTestId('node-contract-version-range')).toHaveValue('^3.1.0');
		await waitFor(() =>
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/next-nodes/instance/node-versions',
				{ type: 'n8n-nodes-base.slack', typeVersion: 3, resource: 'message', operation: 'post' },
			),
		);
	});

	it('writes the pin with the range that the user enters', async () => {
		const { getByTestId, emitted } = render({ ...pin, range: '^3.1.0' });
		const input = getByTestId('node-contract-version-range');

		await userEvent.clear(input);
		await userEvent.type(input, '~3.0.0{Enter}');

		expect(emitted('change')).toEqual([[{ ...pin, range: '~3.0.0' }]]);
	});

	it('writes only the range when the node has no lock', async () => {
		const { getByTestId, emitted } = render({ range: '^3.0.0' });
		const input = getByTestId('node-contract-version-range');

		expect(getByTestId('node-contract-version-lock')).toHaveTextContent('Save to lock a version');
		await userEvent.clear(input);
		await userEvent.type(input, '3.2.0{Enter}');

		expect(emitted('change')).toEqual([[{ range: '3.2.0' }]]);
	});

	it.each([
		['3.x.y.z', 'Enter a valid version range, like ^3.0.0'],
		['^4.0.0', 'Keep the range inside version 3'],
		['>=3.0.0', 'Keep the range inside version 3'],
		['3.1.0', 'No available version matches this range'],
	])('shows an error and writes nothing for the range %s', async (range, message) => {
		const { getByTestId, emitted } = render(pin);
		await waitFor(() => expect(makeRestApiRequest).toHaveBeenCalled());
		const input = getByTestId('node-contract-version-range');

		await userEvent.clear(input);
		await userEvent.type(input, `${range}{Enter}`);

		expect(getByTestId('node-contract-version-error')).toHaveTextContent(message);
		expect(emitted('change')).toBeUndefined();
	});

	it('lists each version as exact, ^ and ~, and a withdrawn version as disabled', async () => {
		const { getByTestId, emitted } = render(pin);
		await waitFor(() => expect(makeRestApiRequest).toHaveBeenCalled());

		const items = await getDropdownItems(getByTestId('node-contract-version-select'));
		const labels = Array.from(items).map((item) => item.textContent?.trim());

		expect(labels).toEqual([
			'3.2.0',
			'^3.2.0',
			'~3.2.0',
			'3.1.0 (yanked)',
			'3.0.0',
			'^3.0.0',
			'~3.0.0',
		]);
		expect(items[3]).toHaveClass('is-disabled');

		await userEvent.click(items[1]);

		expect(emitted('change')).toEqual([[{ ...pin, range: '^3.2.0' }]]);
	});
});
