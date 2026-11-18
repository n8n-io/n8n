import type { OutboundHttp } from '@n8n/backend-network';
import type { CredentialsFinderService, UrlService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { BadRequestError, NotFoundError, OperationalError } from '@n8n/errors';
import type { ICredentialType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import type { CredentialsService } from '../../credentials.service';
import { VaultCaptureService } from '../vault-capture.service';
import { VaultCredentialsConfig } from '../vault-credentials.config';

describe('VaultCaptureService', () => {
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();
	const finder = mock<CredentialsFinderService>();
	const credentialsService = mock<CredentialsService>();
	const credentialTypes = mock<CredentialTypes>();
	const urlService = mock<UrlService>();
	const user = mock<User>({ id: 'user1' });

	const slackType = {
		name: 'slackApi',
		displayName: 'Slack API',
		properties: [
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
			{
				displayName: 'Signature Secret',
				name: 'signatureSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
			{ displayName: 'Base URL', name: 'url', type: 'hidden', default: 'https://slack.com' },
		],
	} as ICredentialType;

	const credential = mock<CredentialsEntity>({
		id: 'cred1',
		name: 'Slack account',
		type: 'slackApi',
		isManaged: false,
	});

	const configured = Object.assign(new VaultCredentialsConfig(), {
		brokerUrl: 'http://broker.test:8787',
		vaultUrl: 'http://vault.test:8200',
		captureKey: 'capture-key',
	});

	let service: VaultCaptureService;

	beforeEach(() => {
		vi.resetAllMocks();
		outboundHttp.requests.mockReturnValue({ request } as never);
		finder.findCredentialForUser.mockResolvedValue(credential);
		credentialTypes.getByName.mockReturnValue(slackType);
		credentialsService.decrypt.mockResolvedValue({
			url: 'https://slack.com',
			accessToken: 'old-token',
			signatureSecret: 'old-secret',
		});
		credentialsService.createEncryptedData.mockResolvedValue({} as never);
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678/');
		request.mockResolvedValue({ statusCode: 200, body: { ticket: 'ticket-1' } });
		service = new VaultCaptureService(
			configured,
			outboundHttp,
			finder,
			credentialsService,
			credentialTypes,
			urlService,
		);
	});

	describe('isEnabled', () => {
		it('needs the broker, the vault and the capture key', () => {
			expect(service.isEnabled()).toBe(true);
			for (const missing of ['brokerUrl', 'vaultUrl', 'captureKey'] as const) {
				const config = Object.assign(new VaultCredentialsConfig(), configured, { [missing]: '' });
				const partial = new VaultCaptureService(
					config,
					outboundHttp,
					finder,
					credentialsService,
					credentialTypes,
					urlService,
				);
				expect(partial.isEnabled()).toBe(false);
			}
		});
	});

	describe('startCapture', () => {
		it('stores a reference and the non-secret fields, then returns the entry page', async () => {
			const result = await service.startCapture(user, 'cred1');

			expect(credentialsService.createEncryptedData).toHaveBeenCalledWith({
				id: 'cred1',
				name: 'Slack account',
				type: 'slackApi',
				data: { url: 'https://slack.com', $vault: 'kv/creds/cred1' },
			});
			expect(credentialsService.update).toHaveBeenCalledWith('cred1', expect.anything(), {
				kind: 'user',
				user: { id: 'user1' },
			});
			expect(result).toEqual({
				captureUrl: 'http://broker.test:8787/capture?ticket=ticket-1',
				captureOrigin: 'http://broker.test:8787',
			});
		});

		it('asks the broker for the secret fields of the credential type and pins the editor origin', async () => {
			await service.startCapture(user, 'cred1');

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'http://broker.test:8787/capture-tickets',
					headers: { 'x-capture-key': 'capture-key' },
					body: {
						credentialId: 'cred1',
						credentialName: 'Slack account',
						title: 'Slack API',
						fields: [
							{ name: 'accessToken', label: 'Access Token' },
							{ name: 'signatureSecret', label: 'Signature Secret' },
						],
						parentOrigin: 'http://localhost:5678',
					},
				}),
			);
		});

		it('uses the public broker URL for the entry page when one is set', async () => {
			const config = Object.assign(new VaultCredentialsConfig(), configured, {
				brokerPublicUrl: 'https://vault-entry.example.com/',
			});
			const withPublicUrl = new VaultCaptureService(
				config,
				outboundHttp,
				finder,
				credentialsService,
				credentialTypes,
				urlService,
			);

			await expect(withPublicUrl.startCapture(user, 'cred1')).resolves.toEqual({
				captureUrl: 'https://vault-entry.example.com/capture?ticket=ticket-1',
				captureOrigin: 'https://vault-entry.example.com',
			});
		});

		it('refuses when vault entry is not configured', async () => {
			const unconfigured = new VaultCaptureService(
				new VaultCredentialsConfig(),
				outboundHttp,
				finder,
				credentialsService,
				credentialTypes,
				urlService,
			);

			await expect(unconfigured.startCapture(user, 'cred1')).rejects.toThrow(BadRequestError);
			expect(request).not.toHaveBeenCalled();
		});

		it('refuses a credential the user cannot update', async () => {
			finder.findCredentialForUser.mockResolvedValue(null);

			await expect(service.startCapture(user, 'cred1')).rejects.toThrow(NotFoundError);
			expect(finder.findCredentialForUser).toHaveBeenCalledWith('cred1', user, [
				'credential:update',
			]);
			expect(request).not.toHaveBeenCalled();
		});

		it('refuses a managed credential', async () => {
			finder.findCredentialForUser.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'cred1', isManaged: true }),
			);

			await expect(service.startCapture(user, 'cred1')).rejects.toThrow(BadRequestError);
		});

		it('refuses a credential type without secret fields', async () => {
			credentialTypes.getByName.mockReturnValue({
				...slackType,
				properties: [{ displayName: 'Base URL', name: 'url', type: 'string', default: '' }],
			});

			await expect(service.startCapture(user, 'cred1')).rejects.toThrow(BadRequestError);
			expect(credentialsService.update).not.toHaveBeenCalled();
		});

		it('stops when the broker does not issue a ticket', async () => {
			request.mockResolvedValue({ statusCode: 401, body: {} });

			await expect(service.startCapture(user, 'cred1')).rejects.toThrow(OperationalError);
		});

		it('stops when the broker cannot be reached', async () => {
			request.mockRejectedValue(new Error('connect ECONNREFUSED'));

			await expect(service.startCapture(user, 'cred1')).rejects.toThrow(OperationalError);
		});
	});
});
