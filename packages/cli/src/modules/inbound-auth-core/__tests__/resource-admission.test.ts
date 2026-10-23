import type { Logger } from '@n8n/backend-common';
import type {
	AuthenticationPipeline,
	AuthenticationService,
	Extracted,
	ProtectedResource,
} from '@n8n/inbound-auth';
import type { Principal, SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { InboundResourceAdmission } from '../resource-admission';

const RESOURCE_URL = 'https://n8n.test/form/abc';
const GRANT = { audiences: [RESOURCE_URL], executeAccessWorkflowId: 'wf-1' };
const CHALLENGE =
	'Bearer resource_metadata="https://n8n.test/.well-known/oauth-protected-resource/form/abc"';
const REQUEST = { method: 'POST', url: '/form/abc', ip: '203.0.113.7' };

const authorize = vi.fn<ProtectedResource['authorize']>();
const resource: ProtectedResource = {
	id: 'workflow-form:wf-1',
	surface: 'trigger',
	isFirstParty: true,
	getResourceUrl: () => RESOURCE_URL,
	getAudiences: () => [RESOURCE_URL],
	getAcceptedSourceIds: () => ['idp-1'],
	scopes: [],
	authorize,
	getGrant: () => GRANT,
};

const context: SecurityContext = {
	subject: { id: 'user-1', type: 'human', email: 'alice@example.com' } as Principal,
	authMethod: 'oauth-access-token',
	subjectClaim: { sourceId: 'idp-1', issuer: 'https://idp.example', subject: 'idp-alice' },
	tokenScopes: [],
};

const pipeline = mock<AuthenticationPipeline>();
const authenticationService = mock<AuthenticationService>();
const logger = mock<Logger>();
const admission = new InboundResourceAdmission(pipeline, authenticationService, logger);

/** What the pipeline advertises for this resource, as every challenge must name it. */
const advertised = expect.objectContaining({
	surface: 'trigger',
	resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
	acceptedSourceIds: ['idp-1'],
});

beforeEach(() => {
	vi.clearAllMocks();
	authorize.mockResolvedValue(true);
	pipeline.run.mockResolvedValue({ ok: true, value: context });
	authenticationService.advertise.mockResolvedValue({
		authorizationServers: ['https://idp.example'],
		challenges: [CHALLENGE],
	});
});

describe('InboundResourceAdmission', () => {
	describe('admitBearer', () => {
		it('stamps the inbound with the resource and sends the token through the pipeline', async () => {
			const result = await admission.admitBearer(resource, REQUEST, 'the-token');

			expect(result).toEqual({ ok: true, context });
			expect(pipeline.run).toHaveBeenCalledWith({
				surface: 'trigger',
				resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
				acceptedSourceIds: ['idp-1'],
				grant: GRANT,
				request: { ...REQUEST, headers: {} },
				receivedAt: expect.any(Date),
				credential: { kind: 'bearer', token: 'the-token' },
			});
			expect(authorize).toHaveBeenCalledWith(context.subject);
		});

		it('writes no line of its own when the caller is admitted: the pipeline logs its accept', async () => {
			await admission.admitBearer(resource, REQUEST, 'the-token');

			expect(logger.info).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('refuses an empty token with no-credential without running the pipeline', async () => {
			const result = await admission.admitBearer(resource, REQUEST, '');

			expect(result).toEqual({ ok: false, reason: 'no-credential', advertised });
			expect(pipeline.run).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
				surface: 'trigger',
				resource: RESOURCE_URL,
				sourceId: undefined,
				authMethod: undefined,
				userId: undefined,
				reason: 'no-credential',
			});
		});

		it('passes a pipeline rejection through without a line of its own', async () => {
			pipeline.run.mockResolvedValue({ ok: false, reason: 'expired', detail: 'exp 1700000000' });

			const result = await admission.admitBearer(resource, REQUEST, 'the-token');

			expect(result).toEqual({ ok: false, reason: 'expired', advertised });
			expect(authorize).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('refuses a subject the resource does not authorize, with the context the pipeline produced', async () => {
			authorize.mockResolvedValue(false);

			const result = await admission.admitBearer(resource, REQUEST, 'the-token');

			expect(result).toEqual({ ok: false, reason: 'insufficient_scope', advertised, context });
			expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
				surface: 'trigger',
				resource: RESOURCE_URL,
				sourceId: 'idp-1',
				authMethod: 'oauth-access-token',
				userId: 'user-1',
				reason: 'insufficient_scope',
			});
		});

		it('keeps the token out of the log and the result, and the external subject and the email out of the log', async () => {
			authorize.mockResolvedValue(false);

			const result = await admission.admitBearer(resource, REQUEST, 'the-token');

			const logged = JSON.stringify(logger.warn.mock.calls);
			expect(logged).not.toContain('the-token');
			expect(logged).not.toContain('idp-alice');
			expect(logged).not.toContain('alice@example.com');
			expect(JSON.stringify(result)).not.toContain('the-token');
		});
	});

	describe('admit', () => {
		const extracted: Extracted = {
			surface: 'public-api',
			resource: { url: 'https://n8n.test/api/v1', acceptedAudiences: ['https://n8n.test/api/v1'] },
			request: {
				method: 'GET',
				url: '/api/v1/workflows',
				headers: { authorization: 'Bearer the-token' },
				ip: '203.0.113.7',
			},
			receivedAt: new Date(),
			credential: { kind: 'bearer', token: 'the-token' },
		};

		it('runs the pipeline on what the surface extracted, then the resource authorization', async () => {
			const result = await admission.admit(resource, extracted);

			expect(result).toEqual({ ok: true, context });
			expect(pipeline.run).toHaveBeenCalledWith(extracted);
			expect(authorize).toHaveBeenCalledWith(context.subject);
		});

		it('drops the request, and with it the header that carried the token, from a refusal', async () => {
			pipeline.run.mockResolvedValue({ ok: false, reason: 'unknown-issuer' });

			const result = await admission.admit(resource, extracted);

			expect(result).toEqual({
				ok: false,
				reason: 'unknown-issuer',
				advertised: { surface: 'public-api', resource: extracted.resource },
			});
			expect(JSON.stringify(result)).not.toContain('the-token');
		});
	});

	describe('challenge', () => {
		it('names the advertised metadata, error=invalid_token and the reason for a pipeline reject', async () => {
			pipeline.run.mockResolvedValue({ ok: false, reason: 'source-not-accepted' });
			const refused = await admission.admitBearer(resource, REQUEST, 'the-token');
			if (refused.ok) throw new Error('expected a refusal');

			expect(await admission.challenge(refused)).toBe(
				`${CHALLENGE}, error="invalid_token", error_description="source-not-accepted"`,
			);
			expect(authenticationService.advertise).toHaveBeenCalledWith(advertised);
		});

		it('answers error=insufficient_scope when the resource refused the subject', async () => {
			authorize.mockResolvedValue(false);
			const refused = await admission.admitBearer(resource, REQUEST, 'the-token');
			if (refused.ok) throw new Error('expected a refusal');

			expect(await admission.challenge(refused)).toBe(
				`${CHALLENGE}, error="insufficient_scope", error_description="insufficient_scope"`,
			);
		});

		it('falls back to a bare Bearer challenge when no source is advertised', async () => {
			authenticationService.advertise.mockResolvedValue({
				authorizationServers: [],
				challenges: [],
			});
			pipeline.run.mockResolvedValue({ ok: false, reason: 'source-not-accepted' });
			const refused = await admission.admitBearer(resource, REQUEST, 'the-token');
			if (refused.ok) throw new Error('expected a refusal');

			expect(await admission.challenge(refused)).toBe(
				'Bearer, error="invalid_token", error_description="source-not-accepted"',
			);
		});

		it('leaves out the error when the request had no credential (RFC 6750 §3.1)', async () => {
			const refused = await admission.admitBearer(resource, REQUEST, '');
			if (refused.ok) throw new Error('expected a refusal');

			expect(await admission.challenge(refused)).toBe(CHALLENGE);
		});

		it('leaves out the error for a refusal without a reason', async () => {
			const challenge = await admission.challenge({
				advertised: {
					surface: 'trigger',
					resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
				},
			});

			expect(challenge).toBe(CHALLENGE);
		});
	});

	describe('refuse', () => {
		it('writes one denial line with the context and returns the refusal', () => {
			const inbound = {
				surface: 'trigger' as const,
				resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
				request: { ...REQUEST, headers: { authorization: 'Bearer the-token' } },
				receivedAt: new Date(),
			};

			const refused = admission.refuse(inbound, 'unknown-subject', context);

			expect(refused).toEqual({
				ok: false,
				reason: 'unknown-subject',
				advertised: { surface: 'trigger', resource: inbound.resource },
				context,
			});
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
				surface: 'trigger',
				resource: RESOURCE_URL,
				sourceId: 'idp-1',
				authMethod: 'oauth-access-token',
				userId: 'user-1',
				reason: 'unknown-subject',
			});
			expect(JSON.stringify(refused)).not.toContain('the-token');
		});
	});
});
