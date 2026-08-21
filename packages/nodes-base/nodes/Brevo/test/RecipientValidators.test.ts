import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

import { BrevoNode } from '../GenericFunctions';

type EmailEntry = { email: string; name?: string };

function makeContext(overrides: {
	typeVersion: number;
	params: Record<string, unknown>;
}): IExecuteSingleFunctions {
	const getNodeParameter = vi.fn((name: string) => overrides.params[name]);

	return {
		getNodeParameter,
		getNode: vi.fn().mockReturnValue({ typeVersion: overrides.typeVersion } as INode),
	} as unknown as IExecuteSingleFunctions;
}

describe('Brevo - validateAndCompileRecipientEmails', () => {
	const validate = BrevoNode.Validators.validateAndCompileRecipientEmails;

	it('reads the legacy misspelled "receipients" parameter on node version 1', async () => {
		const ctx = makeContext({
			typeVersion: 1,
			params: { receipients: 'user@example.com' },
		});

		const requestOptions: IHttpRequestOptions = { url: '', body: {} };
		const result = await validate.call(ctx, requestOptions);

		const to = (result.body as { to: EmailEntry[] }).to;
		expect(to).toEqual([{ email: 'user@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith('receipients');
	});

	it('reads the correctly spelled "recipients" parameter on node version 2', async () => {
		const ctx = makeContext({
			typeVersion: 2,
			params: { recipients: 'user@example.com' },
		});

		const result = await validate.call(ctx, { url: '', body: {} });

		const to = (result.body as { to: EmailEntry[] }).to;
		expect(to).toEqual([{ email: 'user@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith('recipients');
	});
});

describe('Brevo - validateAndCompileCCEmails', () => {
	const validate = BrevoNode.Validators.validateAndCompileCCEmails;

	it('reads the legacy misspelled path on node version 1', async () => {
		const ctx = makeContext({
			typeVersion: 1,
			params: {
				'additionalFields.receipientsCC.receipientCc': { cc: 'cc@example.com' },
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });

		const cc = (result.body as { cc: EmailEntry[] }).cc;
		expect(cc).toEqual([{ email: 'cc@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith(
			'additionalFields.receipientsCC.receipientCc',
		);
	});

	it('reads the correctly spelled path on node version 2', async () => {
		const ctx = makeContext({
			typeVersion: 2,
			params: {
				'additionalFields.recipientsCC.recipientCc': { cc: 'cc@example.com' },
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });

		const cc = (result.body as { cc: EmailEntry[] }).cc;
		expect(cc).toEqual([{ email: 'cc@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith('additionalFields.recipientsCC.recipientCc');
	});
});

describe('Brevo - validateAndCompileBCCEmails', () => {
	const validate = BrevoNode.Validators.validateAndCompileBCCEmails;

	it('reads the legacy misspelled path on node version 1', async () => {
		const ctx = makeContext({
			typeVersion: 1,
			params: {
				'additionalFields.receipientsBCC.receipientBcc': { bcc: 'bcc@example.com' },
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });

		const bcc = (result.body as { bcc: EmailEntry[] }).bcc;
		expect(bcc).toEqual([{ email: 'bcc@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith(
			'additionalFields.receipientsBCC.receipientBcc',
		);
	});

	it('reads the correctly spelled path on node version 2', async () => {
		const ctx = makeContext({
			typeVersion: 2,
			params: {
				'additionalFields.recipientsBCC.recipientBcc': { bcc: 'bcc@example.com' },
			},
		});

		const result = await validate.call(ctx, { url: '', body: {} });

		const bcc = (result.body as { bcc: EmailEntry[] }).bcc;
		expect(bcc).toEqual([{ email: 'bcc@example.com' }]);
		expect(ctx.getNodeParameter).toHaveBeenCalledWith(
			'additionalFields.recipientsBCC.recipientBcc',
		);
	});
});
