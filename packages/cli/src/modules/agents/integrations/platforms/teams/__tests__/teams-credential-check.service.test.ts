import { mock } from 'vitest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';

import type { CredentialsService } from '@/credentials/credentials.service';

import { TeamsCredentialCheckService } from '../teams-credential-check.service';

const PROJECT_ID = 'project-1';
const CREDENTIAL_ID = 'cred-1';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';

const workingCredential = {
	tenantId: TENANT_ID,
	clientId: CLIENT_ID,
	clientSecret: 'a-secret',
};

describe('TeamsCredentialCheckService', () => {
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let request: ReturnType<typeof vi.fn>;
	let service: TeamsCredentialCheckService;

	const withCredential = (
		data: Record<string, string>,
		type = 'microsoftEntraServicePrincipalApi',
	) => {
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type }),
		]);
		credentialsService.decrypt.mockResolvedValue(data);
	};

	beforeEach(() => {
		credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
		request = vi.fn();
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);
		service = new TeamsCredentialCheckService(credentialsService, outboundHttp, mock<Logger>());
	});

	it('passes when Microsoft issues a token', async () => {
		withCredential(workingCredential);
		request.mockResolvedValue({ statusCode: 200, body: { access_token: 'a-token' } });

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'ok',
			clientId: CLIENT_ID,
		});
	});

	it('asks for a Bot Framework token, which is what the channel needs', async () => {
		withCredential(workingCredential);
		request.mockResolvedValue({ statusCode: 200, body: { access_token: 'a-token' } });

		await service.check(PROJECT_ID, CREDENTIAL_ID);

		const [options] = request.mock.calls[0] as [{ url: string; body: string }];
		expect(options.url).toContain(TENANT_ID);
		expect(options.body).toContain('scope=https%3A%2F%2Fapi.botframework.com%2F.default');
		expect(options.body).toContain('grant_type=client_credentials');
	});

	it('fails when Microsoft refuses the details', async () => {
		withCredential(workingCredential);
		request.mockResolvedValue({ statusCode: 401, body: { error: 'invalid_client' } });

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'rejected',
		});
	});

	it('fails when a 200 carries no token, rather than reporting success', async () => {
		withCredential(workingCredential);
		request.mockResolvedValue({ statusCode: 200, body: {} });

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toMatchObject({ status: 'failed' });
	});

	it('reports being unable to reach Microsoft separately from a refusal', async () => {
		withCredential(workingCredential);
		request.mockRejectedValue(new Error('ENOTFOUND'));

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'unreachable',
		});
	});

	it('rejects certificate mode without asking Microsoft, since it stores no secret', async () => {
		withCredential({ ...workingCredential, authentication: 'certificate' });

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'certificate',
		});
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['tenant', { clientId: CLIENT_ID, clientSecret: 'a-secret' }],
		['client ID', { tenantId: TENANT_ID, clientSecret: 'a-secret' }],
		['client secret', { tenantId: TENANT_ID, clientId: CLIENT_ID }],
	])('reports a credential missing its %s without asking Microsoft', async (_label, data) => {
		withCredential(data);

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'incomplete',
		});
		expect(request).not.toHaveBeenCalled();
	});

	it('refuses a credential of the wrong type', async () => {
		withCredential(workingCredential, 'slackApi');

		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'incomplete',
		});
	});

	it('refuses a credential outside the project', async () => {
		expect(await service.check(PROJECT_ID, CREDENTIAL_ID)).toEqual({
			status: 'failed',
			reason: 'incomplete',
		});
		expect(request).not.toHaveBeenCalled();
	});

	it('never returns the client secret', async () => {
		withCredential(workingCredential);
		request.mockResolvedValue({ statusCode: 200, body: { access_token: 'a-token' } });

		expect(JSON.stringify(await service.check(PROJECT_ID, CREDENTIAL_ID))).not.toContain(
			'a-secret',
		);
	});
});
