import type { CreateCredentialPublicDto, UpdateCredentialPublicDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { CredentialsFinderService, EventService } from '@n8n/backend-services';
import { CredentialsEntity } from '@n8n/db';
import type { OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CredentialDescriptionsService } from '@/credentials/credential-descriptions.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsHelper } from '@/credentials-helper';
import type { PublicApiRequest } from '@/public-api/public-api-client';

import { CredentialsPublicController } from '../credentials.public.controller';

describe('CredentialsPublicController', () => {
	let controller: CredentialsPublicController;
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsHelper = mock<CredentialsHelper>();
	const eventService = mock<EventService>();
	const credentialDescriptions = mock<CredentialDescriptionsService>();

	const credential = Object.assign(new CredentialsEntity(), {
		id: 'credential-id',
		name: 'My credential',
		type: 'httpBasicAuth',
		data: 'encrypted-value',
		isManaged: false,
		isGlobal: false,
		isResolvable: false,
		usageScope: 'project',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-02T00:00:00.000Z'),
	});

	beforeEach(() => {
		vi.clearAllMocks();
		credentialsHelper.getCredentialsProperties.mockReturnValue([]);
		credentialDescriptions.isEnabled.mockResolvedValue(false);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ ...credential, scopes: [] });
		credentialsService.findCredentialOwningProject.mockResolvedValue(undefined);
		credentialsService.update.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue({});
		credentialsService.delete.mockResolvedValue(true);
		credentialsFinderService.findById.mockResolvedValue(credential);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);

		controller = new CredentialsPublicController(
			credentialsService,
			credentialsFinderService,
			mock(), // credentialTypes
			credentialsHelper,
			mock<LicenseState>(),
			eventService,
			mock(), // enterpriseCredentialsService
			credentialDescriptions,
			mock(), // credentialsOverwrites
			mock(), // workflowDependencyQueryService
		);
	});

	const emittedLoginId = (eventName: string) => {
		const call = eventService.emit.mock.calls.find(([name]) => name === eventName);
		expect(call).toBeDefined();
		return (call?.[1] as { loginId?: string }).loginId;
	};

	const requestWith = (ctx?: OperationContext) =>
		Object.assign(mock<PublicApiRequest>(), { ctx, publicApiClient: 'other' as const });

	type EmittingRoute = {
		route: string;
		call: (req: PublicApiRequest) => Promise<unknown>;
		event: string;
	};

	const emittingRoutes: EmittingRoute[] = [
		{
			route: 'createCredential',
			call: async (req) =>
				await controller.createCredential(req, mock<Response>(), {
					type: 'httpBasicAuth',
					name: 'My credential',
					data: {},
				} as CreateCredentialPublicDto),
			event: 'credentials-created',
		},
		{
			route: 'updateCredential',
			call: async (req) =>
				await controller.updateCredential(req, mock<Response>(), 'credential-id', {
					name: 'Renamed',
				} as UpdateCredentialPublicDto),
			event: 'credentials-updated',
		},
	];

	it.each(emittingRoutes)('$route emits the login id of a service account', async (route) => {
		const security = mock<SecurityContext>({ subIdentityId: 'login-1' });

		await route.call(requestWith({ security }));

		expect(emittedLoginId(route.event)).toBe('login-1');
	});

	it.each(emittingRoutes)(
		'$route emits no login id when the request has no operation context',
		async (route) => {
			await route.call(requestWith(undefined));

			expect(emittedLoginId(route.event)).toBeUndefined();
		},
	);

	describe('deleteCredential', () => {
		it('passes the operation context of the request to the service', async () => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await controller.deleteCredential(requestWith(ctx), mock<Response>(), 'credential-id');

			expect(credentialsService.delete.mock.calls[0][3]).toBe(ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await controller.deleteCredential(requestWith(undefined), mock<Response>(), 'credential-id');

			expect(credentialsService.delete.mock.calls[0][3]).toBeUndefined();
		});
	});
});
