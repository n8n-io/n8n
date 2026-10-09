import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import type { CredentialsService } from '@/credentials/credentials.service';

import { TeamsCatalogService } from '../teams-catalog.service';
import type { GraphResponse, TeamsGraphService } from '../teams-graph.service';
import type { TeamsManagerTokenService } from '../teams-manager-token.service';
import type { TeamsManifestService } from '../teams-manifest.service';
import type { TeamsSetupService } from '../teams-setup.service';

const user = mock<User>({ id: 'user-1' });
const EXTERNAL_ID = 'external-1';
const TEAMS_APP_ID = 'teams-app-1';
const ARCHIVE = Buffer.from('zip');

const scope = {
	user,
	projectId: 'project-1',
	agentId: 'agent-1',
	managerCredentialId: 'manager-1',
};
const publishOptions = { ...scope, credentialId: 'bot-cred-1' };

const ok = (body: unknown = {}): GraphResponse => ({ statusCode: 200, body, ok: true });
const failed = (statusCode: number, code?: string, message?: string): GraphResponse => ({
	statusCode,
	body: code ? { error: { code, ...(message ? { message } : {}) } } : {},
	ok: false,
});

/** The catalogue listing Graph answers with, for a given review state. */
const catalogListing = (publishingState: string | null) =>
	ok({
		value: [
			{
				id: TEAMS_APP_ID,
				externalId: EXTERNAL_ID,
				appDefinitions: publishingState ? [{ publishingState }] : [],
			},
		],
	});

describe('TeamsCatalogService', () => {
	let graph: ReturnType<typeof mock<TeamsGraphService>>;
	let tokens: ReturnType<typeof mock<TeamsManagerTokenService>>;
	let setupService: ReturnType<typeof mock<TeamsSetupService>>;
	let credentialsFinderService: ReturnType<typeof mock<CredentialsFinderService>>;
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let service: TeamsCatalogService;

	/** Makes the channel credential readable, carrying `data`. */
	const withBotCredential = (data: Record<string, unknown>) => {
		credentialsFinderService.findCredentialForUser.mockImplementation((async (id: string) =>
			mock<CredentialsEntity>({
				id,
				type:
					id === 'bot-cred-1'
						? 'microsoftEntraServicePrincipalApi'
						: 'microsoftTeamsManagerOAuth2Api',
			})) as never);
		credentialsService.decrypt.mockResolvedValue(data as never);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);
	};

	/** No app in the catalogue yet, unless a test says otherwise. */
	const withCatalog = (response: GraphResponse = ok({ value: [] })) => {
		graph.request.mockImplementation(async (_token: string, _method: string, path: string) => {
			if (path.startsWith('/appCatalogs/teamsApps?')) return response;
			return ok();
		});
	};

	const zipCallTo = (fragment: string) =>
		graph.postZip.mock.calls.find(([, path]) => String(path).includes(fragment));

	const zipCallToExactly = (path: string) =>
		graph.postZip.mock.calls.find(([, called]) => String(called) === path);

	afterEach(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		graph = mock<TeamsGraphService>();
		tokens = mock<TeamsManagerTokenService>();
		setupService = mock<TeamsSetupService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		credentialsService = mock<CredentialsService>();
		const manifestService = mock<TeamsManifestService>();
		manifestService.buildManifestId.mockReturnValue(EXTERNAL_ID);

		service = new TeamsCatalogService(
			graph,
			tokens,
			setupService,
			manifestService,
			credentialsFinderService,
			credentialsService,
			mock<Logger>(),
		);

		tokens.acquire.mockResolvedValue('graph-token');
		setupService.buildPackage.mockResolvedValue(ARCHIVE);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({
				id: 'manager-1',
				type: 'microsoftTeamsManagerOAuth2Api',
			}) as never,
		);
		graph.postZip.mockResolvedValue(ok({ id: TEAMS_APP_ID }));
		withCatalog();
	});

	describe('publish', () => {
		it('publishes straight to the organisation for a Teams administrator', async () => {
			graph.postZip.mockResolvedValue(ok({ id: TEAMS_APP_ID }));
			let listed = false;
			graph.request.mockImplementation(async (_t: string, _m: string, path: string) => {
				if (!path.startsWith('/appCatalogs/teamsApps?')) return ok();
				const response = listed ? catalogListing('published') : ok({ value: [] });
				listed = true;
				return response;
			});

			await expect(service.publish(publishOptions)).resolves.toEqual({
				status: 'published',
				teamsAppId: TEAMS_APP_ID,
			});
			expect(zipCallTo('requiresReview')).toBeUndefined();
		});

		it('submits for review when the account may not publish directly', async () => {
			let attempt = 0;
			graph.postZip.mockImplementation(async () => {
				attempt += 1;
				return attempt === 1 ? failed(403, 'Forbidden') : ok({ id: TEAMS_APP_ID });
			});
			// Empty before the publish, listed after it — otherwise the service
			// takes the update path and never tries a first publish at all.
			let listed = false;
			graph.request.mockImplementation(async (_t: string, _m: string, path: string) => {
				if (!path.startsWith('/appCatalogs/teamsApps?')) return ok();
				const response = listed ? catalogListing('submitted') : ok({ value: [] });
				listed = true;
				return response;
			});

			await expect(service.publish(publishOptions)).resolves.toEqual({
				status: 'submitted',
				teamsAppId: TEAMS_APP_ID,
			});
			expect(zipCallTo('requiresReview=true')).toBeDefined();
		});

		it('decides the capability from the refusal, not from asking the user', async () => {
			await service.publish(publishOptions);

			// The direct attempt always goes first; nothing asks what role the
			// signed-in account holds.
			expect(graph.postZip.mock.calls[0][1]).toBe('/appCatalogs/teamsApps');
		});

		it('does not retry for review when the refusal was not about permission', async () => {
			graph.postZip.mockResolvedValue(failed(500));

			await expect(service.publish(publishOptions)).rejects.toThrow(
				/would not accept the Teams app/,
			);
			expect(graph.postZip).toHaveBeenCalledTimes(1);
		});

		/**
		 * Microsoft's wording for a rejected package carries request ids and
		 * backend host names. The log gets it; the user gets something readable.
		 */
		it('keeps Microsoft internals out of the message the user sees', async () => {
			graph.postZip.mockResolvedValue({
				statusCode: 400,
				ok: false,
				body: {
					error: {
						code: 'BadRequest',
						message: "Failed to parse manifest: 'name.short' is required.",
						innerError: { code: 'UnableToParseTeamsAppManifest' },
					},
				},
			});

			await expect(service.publish(publishOptions)).rejects.toThrow(
				/Microsoft would not accept the Teams app/,
			);
			await expect(service.publish(publishOptions)).rejects.not.toThrow(/Request Url/);
		});

		/**
		 * A taken name means a publish already landed, most likely a first attempt
		 * whose result never came back. Finishing it beats reporting a clash the
		 * user cannot act on.
		 */
		it('updates the app it already published when the name is taken', async () => {
			// Empty when the publish starts, which is why it creates; present by the
			// time the clash sends it looking.
			let listed = false;
			graph.request.mockImplementation(async (_token: string, _method: string, path: string) => {
				if (path.startsWith('/appCatalogs/teamsApps?')) {
					const value = listed
						? [{ id: TEAMS_APP_ID, appDefinitions: [{ publishingState: 'published' }] }]
						: [];
					listed = true;
					return ok({ value });
				}
				return ok();
			});
			graph.postZip.mockImplementation(async (_token: string, path: string) =>
				path.includes('/appDefinitions') ? ok({ id: TEAMS_APP_ID }) : failed(409, 'Conflict'),
			);

			await expect(service.publish(publishOptions)).resolves.toEqual({
				status: 'published',
				teamsAppId: TEAMS_APP_ID,
			});
			expect(zipCallTo('/appDefinitions')).toBeDefined();
		});

		/**
		 * The clash Microsoft reports names our own manifest id, so the app is
		 * this agent's however little the listing knows about it. Telling the
		 * user to rename the agent would have them rebuild everything over a
		 * delay that clears itself.
		 */
		it('does not blame the agent for a clash with its own app', async () => {
			graph.postZip.mockResolvedValue(
				failed(
					409,
					'Conflict',
					`App with same id already exists in the tenant. ExternalId: '${EXTERNAL_ID}', state: Installed`,
				),
			);
			// Still not listed, which is why the second publish happened at all.
			withCatalog(ok({ value: [] }));

			vi.useFakeTimers();
			// The handler is attached before the clock moves: a promise left
			// unwatched across the retries rejects with nobody listening, and
			// vitest fails the whole run on that.
			const pending = service.publish(publishOptions).catch((error: unknown) => error);
			await vi.advanceTimersByTimeAsync(30_000);

			const error = await pending;
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toMatch(/try again in a few minutes/i);
			expect((error as Error).message).not.toMatch(/Rename the agent/);
		});

		/**
		 * Microsoft words these refusals as it likes, so a message that does not
		 * name our app proves nothing. The copy has to fit both readings rather
		 * than send someone to rename an agent whose own earlier publish took the
		 * name.
		 */
		it('leaves a taken name it cannot attribute open to either cause', async () => {
			graph.postZip.mockResolvedValue(failed(409, 'Conflict'));

			const error = await service.publish(publishOptions).catch((caught: Error) => caught);

			expect((error as Error).message).toMatch(/try again in a few minutes/i);
			expect((error as Error).message).toMatch(/rename the agent/i);
		});

		/**
		 * The catalogue listing is filtered on a value Microsoft indexes after the
		 * write, so a read taken straight after a create can come back empty.
		 * Reporting "not listed yet" for an app just created is what sends someone
		 * round to publish a second one.
		 */
		it('reports the app it just created, not the listing that lags behind', async () => {
			graph.postZip.mockResolvedValue(ok({ id: TEAMS_APP_ID }));
			withCatalog(ok({ value: [] }));

			await expect(service.publish(publishOptions)).resolves.toEqual({
				status: 'published',
				teamsAppId: TEAMS_APP_ID,
			});
		});

		it('tells the user a refusal may pass, because it is often Microsoft-side', async () => {
			graph.postZip.mockResolvedValue(failed(500));

			await expect(service.publish(publishOptions)).rejects.toThrow(/Try again in a few minutes/);
		});

		it('updates the catalogued app instead of adding a second one', async () => {
			withCatalog(catalogListing('published'));

			await service.publish(publishOptions);

			expect(zipCallTo(`/appCatalogs/teamsApps/${TEAMS_APP_ID}/appDefinitions`)).toBeDefined();
			// The create takes the collection path with no query, so an exact match
			// is the only one that would catch a second app being added.
			expect(zipCallToExactly('/appCatalogs/teamsApps')).toBeUndefined();
		});

		/**
		 * Without this a member could publish an app once and never update it:
		 * only an administrator may change a catalogue entry outright, and the
		 * review route is the same one the first publish falls back to.
		 */
		it('sends an update for review when the account may not change the entry', async () => {
			withCatalog(catalogListing('published'));
			const path = `/appCatalogs/teamsApps/${TEAMS_APP_ID}/appDefinitions`;
			graph.postZip.mockImplementation(async (_t: string, called: string) =>
				called.includes('requiresReview=true') ? ok({ id: TEAMS_APP_ID }) : failed(403),
			);

			await service.publish(publishOptions);

			expect(zipCallTo(`${path}?requiresReview=true`)).toBeDefined();
		});

		it('says who has to publish when even a review is refused', async () => {
			withCatalog(catalogListing('published'));
			graph.postZip.mockResolvedValue(failed(403));

			await expect(service.publish(publishOptions)).rejects.toThrow(
				/Teams administrator has to publish/,
			);
		});

		it('builds the package from the settings in the open form', async () => {
			const settings = { sessionIdleTimeoutMinutes: 30 };

			await service.publish({ ...publishOptions, settings });

			expect(setupService.buildPackage).toHaveBeenCalledWith(
				user,
				{ projectId: 'project-1', agentId: 'agent-1' },
				'bot-cred-1',
				settings,
			);
		});

		it('refuses without a Microsoft sign-in', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null as never);

			await expect(service.publish(publishOptions)).rejects.toThrow(BadRequestError);
		});

		/**
		 * The listing still shows the definition that was approved before, so
		 * asking it would report the change as live while it waits for somebody
		 * to approve it.
		 */
		it('reports an update sent for review as submitted, not published', async () => {
			withCatalog(catalogListing('published'));
			graph.postZip.mockImplementation(async (_t: string, path: string) =>
				path.includes('requiresReview=true') ? ok({ id: TEAMS_APP_ID }) : failed(403, 'Forbidden'),
			);

			await expect(service.publish(publishOptions)).resolves.toMatchObject({
				status: 'submitted',
			});
		});
	});

	describe('getState', () => {
		it.each([
			['published', 'published'],
			['submitted', 'submitted'],
			['rejected', 'rejected'],
		])('reports %s back from Microsoft', async (publishingState, expected) => {
			withCatalog(catalogListing(publishingState));

			await expect(service.getState(scope)).resolves.toEqual({
				status: expected,
				teamsAppId: TEAMS_APP_ID,
			});
		});

		it('reports an app that is not listed yet as unknown, never rejected', async () => {
			withCatalog(ok({ value: [] }));

			await expect(service.getState(scope)).resolves.toEqual({
				status: 'unknown',
				teamsAppId: null,
			});
		});

		it('reports an unrecognised state as unknown', async () => {
			withCatalog(catalogListing('somethingNew'));

			await expect(service.getState(scope)).resolves.toMatchObject({ status: 'unknown' });
		});

		/**
		 * Microsoft has no route that reads one app back, and the listing does not
		 * return an app for minutes after a publish -- sometimes for a day. Asked
		 * in that window it answers the same way it answers about an app nobody
		 * published, so a setup reopened in it offered to publish a second time.
		 */
		it('falls back to the publish it recorded when the listing cannot answer', async () => {
			withCatalog(ok({ value: [] }));
			withBotCredential({
				publishedTeamsAppId: TEAMS_APP_ID,
				publishedTeamsAppState: 'published',
				publishedTeamsAppAt: new Date().toISOString(),
			});

			await expect(service.getState({ ...scope, credentialId: 'bot-cred-1' })).resolves.toEqual({
				status: 'published',
				teamsAppId: TEAMS_APP_ID,
			});
		});

		/**
		 * The note only stands in for a listing that has not caught up. Past that
		 * window the catalogue is the better answer: an administrator may have
		 * removed the app, and a note that never expires reports it published
		 * for good, with no way to publish it again.
		 */
		it('stops answering for a publish older than the listing ever lags', async () => {
			withCatalog(ok({ value: [] }));
			withBotCredential({
				publishedTeamsAppId: TEAMS_APP_ID,
				publishedTeamsAppState: 'published',
				publishedTeamsAppAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
			});

			await expect(service.getState({ ...scope, credentialId: 'bot-cred-1' })).resolves.toEqual({
				status: 'unknown',
				teamsAppId: null,
			});
		});

		/** Written before the window existed, so the catalogue answers instead. */
		it('ignores a note with no timestamp', async () => {
			withCatalog(ok({ value: [] }));
			withBotCredential({
				publishedTeamsAppId: TEAMS_APP_ID,
				publishedTeamsAppState: 'published',
			});

			await expect(service.getState({ ...scope, credentialId: 'bot-cred-1' })).resolves.toEqual({
				status: 'unknown',
				teamsAppId: null,
			});
		});

		it('prefers what Microsoft says over what it recorded', async () => {
			withCatalog(catalogListing('rejected'));
			withBotCredential({
				publishedTeamsAppId: TEAMS_APP_ID,
				publishedTeamsAppState: 'published',
				publishedTeamsAppAt: new Date().toISOString(),
			});

			await expect(service.getState({ ...scope, credentialId: 'bot-cred-1' })).resolves.toEqual({
				status: 'rejected',
				teamsAppId: TEAMS_APP_ID,
			});
		});

		it('finds the app by the id in our own manifest, storing nothing', async () => {
			await service.getState(scope);

			const call = graph.request.mock.calls.find(([, , path]) =>
				String(path).startsWith('/appCatalogs/teamsApps?'),
			);
			const filter = new URLSearchParams(String(call?.[2]).split('?')[1]).get('$filter');
			expect(filter).toBe(`externalId eq '${EXTERNAL_ID}'`);
		});
	});

	describe('recording the publish', () => {
		it('writes the app it made onto the channel credential', async () => {
			withBotCredential({ clientId: 'app-1' });
			graph.postZip.mockResolvedValue(ok({ id: TEAMS_APP_ID }));

			await service.publish({ ...publishOptions, settings: undefined });

			expect(credentialsService.update).toHaveBeenCalledWith(
				'bot-cred-1',
				expect.objectContaining({ data: 'encrypted' }),
				{ kind: 'user', user },
				expect.objectContaining({
					clientId: 'app-1',
					publishedTeamsAppId: TEAMS_APP_ID,
					publishedTeamsAppState: 'published',
					publishedTeamsAppAt: expect.any(String),
				}),
			);
		});

		/** Microsoft has the app either way, so losing the note must not undo it. */
		it('still reports the publish when the note cannot be written', async () => {
			withBotCredential({ clientId: 'app-1' });
			credentialsService.update.mockRejectedValue(new Error('database is locked') as never);
			graph.postZip.mockResolvedValue(ok({ id: TEAMS_APP_ID }));

			await expect(service.publish({ ...publishOptions, settings: undefined })).resolves.toEqual({
				status: 'published',
				teamsAppId: TEAMS_APP_ID,
			});
		});
	});

	describe('an app still waiting for an administrator', () => {
		it('reports submitted without failing, so the channel can still connect', async () => {
			withCatalog(catalogListing('submitted'));

			// Nothing here throws or blocks: submitting is about org-wide
			// distribution, and the bot already works for anyone who has the app.
			await expect(service.getState(scope)).resolves.toEqual({
				status: 'submitted',
				teamsAppId: TEAMS_APP_ID,
			});
		});

		it('keeps reporting submitted on a re-check, rather than turning into a failure', async () => {
			withCatalog(catalogListing('submitted'));

			await service.getState(scope);
			await expect(service.getState(scope)).resolves.toMatchObject({ status: 'submitted' });
		});
	});
});
