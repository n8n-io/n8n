import { mockDeep } from 'vitest-mock-extended';
import type { IPollFunctions } from 'n8n-workflow';

import { AirtableTrigger } from '../AirtableTrigger.node';

describe('AirtableTrigger', () => {
	const parameters: Record<string, unknown> = {
		authentication: 'airtableTokenApi',
		downloadAttachments: false,
		additionalFields: {},
		baseId: 'appB7xQ3mK9pL2nR4',
		tableId: 'tblR8kQ2mN4pL6sT0',
		triggerField: 'Last Modified',
	};

	const setup = (tableId: string) => {
		const pollFunctions = mockDeep<IPollFunctions>();
		pollFunctions.getNodeParameter.mockImplementation(
			(name: string) => ({ ...parameters, tableId })[name] as never,
		);
		pollFunctions.getWorkflowStaticData.mockReturnValue({});
		pollFunctions.getMode.mockReturnValue('trigger');
		pollFunctions.helpers.requestWithAuthentication.mockResolvedValue({ records: [] });
		return pollFunctions;
	};

	const requestedUri = (pollFunctions: IPollFunctions) =>
		String(vi.mocked(pollFunctions.helpers.requestWithAuthentication).mock.calls[0][1].uri);

	it('should request the records of the table', async () => {
		const pollFunctions = setup('tblR8kQ2mN4pL6sT0');

		await new AirtableTrigger().poll.call(pollFunctions);

		expect(requestedUri(pollFunctions)).toBe(
			'https://api.airtable.com/v0/appB7xQ3mK9pL2nR4/tblR8kQ2mN4pL6sT0',
		);
	});

	it('should encode the table ID in the request URL', async () => {
		const pollFunctions = setup('tbl/table');

		await new AirtableTrigger().poll.call(pollFunctions);

		expect(requestedUri(pollFunctions)).toBe(
			'https://api.airtable.com/v0/appB7xQ3mK9pL2nR4/tbl%2Ftable',
		);
	});

	it('should reject a dot-segment table ID before the request', async () => {
		const pollFunctions = setup('..');

		await expect(new AirtableTrigger().poll.call(pollFunctions)).rejects.toThrow(
			'Invalid identifier',
		);

		expect(pollFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
