import type { Logger } from '@n8n/backend-common';
import type {
	AuthenticationService,
	Extracted,
	IdentityService,
	Reject,
	TrustedSource,
	Verified,
} from '@n8n/inbound-auth';
import type { Principal, SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { InboundAuthPipeline } from '../authentication-pipeline';

const RESOURCE = 'https://n8n.example/mcp';
const TOKEN = 'secret.bearer.token';
const SOURCE_ID = 'source-1';

const extracted: Extracted = {
	surface: 'instance-mcp',
	resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
	request: {
		method: 'POST',
		url: '/mcp',
		headers: { authorization: `Bearer ${TOKEN}` },
		ip: '203.0.113.7',
	},
	receivedAt: new Date('2026-10-12T10:00:00.000Z'),
	credential: { kind: 'bearer', token: TOKEN },
};

const verified: Verified = {
	surface: extracted.surface,
	resource: extracted.resource,
	request: { method: 'POST', url: '/mcp', ip: '203.0.113.7' },
	receivedAt: extracted.receivedAt,
	credentialKind: 'bearer',
	source: { id: SOURCE_ID, issuer: 'https://idp.example' } as TrustedSource,
	claims: { sub: 'alice' },
	expiresAt: new Date('2026-10-12T11:00:00.000Z'),
};

const context: SecurityContext = {
	subject: { id: 'user-1', type: 'human' } as Principal,
	authMethod: 'oauth-access-token',
	subjectClaim: { sourceId: SOURCE_ID, issuer: 'https://idp.example', subject: 'alice' },
};

const logger = mock<Logger>();
const authentication = mock<AuthenticationService>();
const identity = mock<IdentityService>();

let pipeline: InboundAuthPipeline;

beforeEach(() => {
	vi.clearAllMocks();
	pipeline = new InboundAuthPipeline(logger, authentication, identity);
});

describe('InboundAuthPipeline', () => {
	it('returns the identity result when both steps pass, without logging', async () => {
		authentication.authenticate.mockResolvedValue({ ok: true, value: verified });
		identity.identify.mockResolvedValue({ ok: true, value: context });

		const result = await pipeline.run(extracted);

		expect(result).toEqual({ ok: true, value: context });
		expect(authentication.authenticate).toHaveBeenCalledWith(extracted);
		expect(identity.identify).toHaveBeenCalledWith(verified);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('returns the authentication reject and skips the identity step', async () => {
		const reject: Reject = { ok: false, reason: 'signature-invalid', detail: 'bad sig' };
		authentication.authenticate.mockResolvedValue(reject);

		const result = await pipeline.run(extracted);

		expect(result).toEqual(reject);
		expect(identity.identify).not.toHaveBeenCalled();
	});

	it('returns the identity reject unchanged', async () => {
		const reject: Reject = { ok: false, reason: 'binding-inactive' };
		authentication.authenticate.mockResolvedValue({ ok: true, value: verified });
		identity.identify.mockResolvedValue(reject);

		const result = await pipeline.run(extracted);

		expect(result).toEqual(reject);
	});

	describe('reject log line', () => {
		const cases: {
			step: string;
			arrange: (reject: Reject) => void;
			reject: Reject;
			sourceId?: string;
		}[] = [
			{
				step: 'authentication',
				reject: { ok: false, reason: 'signature-invalid', detail: 'bad sig' },
				arrange(reject) {
					authentication.authenticate.mockResolvedValue(reject);
				},
			},
			{
				step: 'identity',
				reject: { ok: false, reason: 'binding-inactive', detail: 'suspended' },
				sourceId: SOURCE_ID,
				arrange(reject) {
					authentication.authenticate.mockResolvedValue({ ok: true, value: verified });
					identity.identify.mockResolvedValue(reject);
				},
			},
		];

		it.each(cases)(
			'logs one warn line for an $step reject with surface, resource, reason and detail',
			async ({ arrange, reject, sourceId }) => {
				arrange(reject);

				await pipeline.run(extracted);

				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						surface: 'instance-mcp',
						resource: RESOURCE,
						reason: reject.reason,
						detail: reject.detail,
						sourceId,
					}),
				);
			},
		);

		it.each(cases)(
			'never writes the bearer token on an $step reject',
			async ({ arrange, reject }) => {
				arrange(reject);

				await pipeline.run(extracted);

				expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(TOKEN);
			},
		);
	});
});
