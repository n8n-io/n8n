import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import { TeamsCatalogService } from '../teams-catalog.service';
import type { GraphResponse, TeamsGraphService } from '../teams-graph.service';
import type { TeamsManagerTokenService } from '../teams-manager-token.service';
import type { TeamsManifestService } from '../teams-manifest.service';

const user = mock<User>({ id: 'user-1' });
const EXTERNAL_ID = 'external-1';

const scope = {
	user,
	projectId: 'project-1',
	agentId: 'agent-1',
	managerCredentialId: 'manager-1',
};

const ok = (body: unknown = {}): GraphResponse => ({ statusCode: 200, body, ok: true });

describe('TeamsCatalogService', () => {
	let graph: ReturnType<typeof mock<TeamsGraphService>>;
	let tokens: ReturnType<typeof mock<TeamsManagerTokenService>>;
	let credentialsFinderService: ReturnType<typeof mock<CredentialsFinderService>>;
	let service: TeamsCatalogService;

	beforeEach(() => {
		graph = mock<TeamsGraphService>();
		tokens = mock<TeamsManagerTokenService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		const manifestService = mock<TeamsManifestService>();
		manifestService.buildManifestId.mockReturnValue(EXTERNAL_ID);

		service = new TeamsCatalogService(
			graph,
			tokens,
			manifestService,
			credentialsFinderService,
			mock<Logger>(),
		);

		tokens.acquire.mockResolvedValue('graph-token');
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({
				id: 'manager-1',
				type: 'microsoftTeamsManagerOAuth2Api',
			}) as never,
		);
	});

	describe('findUserInstall', () => {
		/**
		 * An app uploaded in the Teams client is a catalogue entry of its own, so
		 * no id n8n holds ever matches it. The id in the manifest does, and every
		 * package built for this agent carries the same one.
		 */
		it('finds an app the user uploaded themselves, by the id in the manifest', async () => {
			graph.request.mockResolvedValue(
				ok({
					value: [
						{ teamsApp: { id: 'other-app', externalId: 'someone-elses' } },
						{ teamsApp: { id: 'sideloaded-app', externalId: EXTERNAL_ID } },
					],
				}),
			);

			await expect(service.findUserInstall(scope)).resolves.toBe(true);
		});

		it('reports nothing installed when the app is not among them', async () => {
			graph.request.mockResolvedValue(
				ok({ value: [{ teamsApp: { id: 'other-app', externalId: 'someone-elses' } }] }),
			);

			await expect(service.findUserInstall(scope)).resolves.toBe(false);
		});

		it('expands the app, since the install alone carries no external id', async () => {
			graph.request.mockResolvedValue(ok({ value: [] }));

			await service.findUserInstall(scope);

			expect(graph.request).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/me/teamwork/installedApps?$expand=teamsApp',
			);
		});

		// The poll runs on a timer while the user uploads the app by hand, so a
		// refused read is one more miss rather than a failure to report.
		it('reports nothing installed when Graph refuses the read', async () => {
			graph.request.mockResolvedValue({ statusCode: 403, body: {}, ok: false });

			await expect(service.findUserInstall(scope)).resolves.toBe(false);
		});

		it('refuses without a Microsoft sign-in', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null as never);

			await expect(service.findUserInstall(scope)).rejects.toThrow(BadRequestError);
		});
	});
});
