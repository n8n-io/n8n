import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentCredentialLookupService } from '../../../agent-credential-lookup.service';
import {
	resolveWhatsAppMetaState,
	type WhatsAppMetaSignals,
} from '../../whatsapp/whatsapp-meta-status';
import { WhatsAppCredentialCheckService } from '../../whatsapp/whatsapp-credential-check.service';

describe('resolveWhatsAppMetaState', () => {
	it.each<[string, WhatsAppMetaSignals, string]>([
		['a working number', { numberStatus: 'CONNECTED', nameStatus: 'APPROVED' }, 'connected'],
		['no signals', {}, 'connected'],
		[
			'the values Meta returns for a test number',
			{
				numberStatus: 'CONNECTED',
				nameStatus: 'AVAILABLE_WITHOUT_REVIEW',
				newNameStatus: 'NONE',
				messagingLimitTier: 'TIER_1K',
				businessVerificationStatus: 'verified',
			},
			'connected',
		],
		['a number that Meta disconnected', { numberStatus: 'DISCONNECTED' }, 'numberUnavailable'],
		['a number that Meta banned', { numberStatus: 'BANNED' }, 'numberUnavailable'],
		['a number that was deleted', { numberStatus: 'DELETED' }, 'numberUnavailable'],
		['a number that moved to another account', { numberStatus: 'MIGRATED' }, 'numberUnavailable'],
		[
			'a number that cannot send, over a name in review',
			{ numberStatus: 'BANNED', nameStatus: 'PENDING_REVIEW' },
			'numberUnavailable',
		],
		['a number status that is not known yet', { numberStatus: 'FLAGGED' }, 'connected'],
		['a number that is not active yet', { numberStatus: 'PENDING' }, 'numberPending'],
		['a number at its daily limit', { numberStatus: 'RESTRICTED' }, 'dailyLimit'],
		['a first name in review', { nameStatus: 'PENDING_REVIEW' }, 'nameInReviewBlocked'],
		['a first name that was declined', { nameStatus: 'DECLINED' }, 'nameDeclinedBlocked'],
		[
			'a changed name in review',
			{ nameStatus: 'APPROVED', newNameStatus: 'PENDING_REVIEW' },
			'nameInReview',
		],
		[
			'a changed name that was declined',
			{ nameStatus: 'APPROVED', newNameStatus: 'DECLINED' },
			'nameDeclined',
		],
		[
			'an unverified business on the lowest tier',
			{ messagingLimitTier: 'TIER_250', businessVerificationStatus: 'not_verified' },
			'businessNotVerified',
		],
		[
			'a business in review on the lowest tier',
			{ messagingLimitTier: 'TIER_250', businessVerificationStatus: 'pending' },
			'businessInReview',
		],
		[
			'a business that Meta calls ineligible, which shows nothing until its meaning is known',
			{ messagingLimitTier: 'TIER_250', businessVerificationStatus: 'ineligible' },
			'connected',
		],
		[
			'an unverified business above the lowest tier',
			{ messagingLimitTier: 'TIER_1K', businessVerificationStatus: 'not_verified' },
			'connected',
		],
	])('maps %s', (_label, signals, expected) => {
		expect(resolveWhatsAppMetaState(signals)).toBe(expected);
	});

	it.each([
		['not_verified', 'businessNotVerified'],
		['pending_submission', 'businessNotVerified'],
		['pending_need_more_info', 'businessNotVerified'],
		['rejected', 'businessNotVerified'],
		['failed', 'businessNotVerified'],
		['revoked', 'businessNotVerified'],
		['expired', 'businessNotVerified'],
		['pending', 'businessInReview'],
		['verified', 'connected'],
		['ineligible', 'connected'],
		['a value Meta adds later', 'connected'],
	])('maps the business verification status %s on the lowest tier', (status, expected) => {
		expect(
			resolveWhatsAppMetaState({
				messagingLimitTier: 'TIER_250',
				businessVerificationStatus: status,
			}),
		).toBe(expected);
	});

	it('shows the most severe state first', () => {
		expect(
			resolveWhatsAppMetaState({
				numberStatus: 'PENDING',
				nameStatus: 'DECLINED',
				messagingLimitTier: 'TIER_250',
				businessVerificationStatus: 'not_verified',
			}),
		).toBe('numberPending');
		expect(
			resolveWhatsAppMetaState({
				numberStatus: 'RESTRICTED',
				newNameStatus: 'DECLINED',
				messagingLimitTier: 'TIER_250',
				businessVerificationStatus: 'not_verified',
			}),
		).toBe('dailyLimit');
	});
});

describe('WhatsAppCredentialCheckService.getMetaStatus', () => {
	const user = mock<User>({ id: 'user-1' });
	const credential = {
		accessToken: 'token',
		phoneNumberId: '111',
		businessAccountId: '222',
		appSecret: 'secret',
	};

	let credentialLookup: ReturnType<typeof mock<AgentCredentialLookupService>>;
	let request: ReturnType<typeof vi.fn>;
	let service: WhatsAppCredentialCheckService;

	beforeEach(() => {
		credentialLookup = mock<AgentCredentialLookupService>();
		credentialLookup.decryptForUser.mockResolvedValue(credential);
		request = vi.fn(async ({ url }: { url: string }) =>
			url.endsWith('/222')
				? { statusCode: 200, body: { business_verification_status: 'not_verified' } }
				: {
						statusCode: 200,
						body: {
							status: 'CONNECTED',
							name_status: 'APPROVED',
							messaging_limit_tier: 'TIER_250',
							verified_name: 'Acme Support',
							display_phone_number: '+1 555-184-1090',
						},
					},
		);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);
		service = new WhatsAppCredentialCheckService(
			credentialLookup,
			outboundHttp,
			mock<Logger>(),
			mock<AgentsConfig>(),
		);
	});

	it('combines the number and business account into one state', async () => {
		expect(await service.getMetaStatus(user, 'project-1', 'cred-1')).toEqual({
			state: 'businessNotVerified',
			displayName: 'Acme Support',
			displayPhoneNumber: '+1 555-184-1090',
		});
	});

	it('still reports the number state when the business request fails to reach Meta', async () => {
		request.mockImplementation(async ({ url }: { url: string }) => {
			if (url.endsWith('/222')) throw new Error('socket hang up');
			return {
				statusCode: 200,
				body: {
					status: 'RESTRICTED',
					verified_name: 'Acme Support',
					display_phone_number: '+1 555',
				},
			};
		});

		expect(await service.getMetaStatus(user, 'project-1', 'cred-1')).toEqual({
			state: 'dailyLimit',
			displayName: 'Acme Support',
			displayPhoneNumber: '+1 555',
		});
	});

	it('still reports the number state when the business account cannot be read', async () => {
		request.mockImplementation(async ({ url }: { url: string }) =>
			url.endsWith('/222')
				? { statusCode: 403, body: {} }
				: { statusCode: 200, body: { status: 'RESTRICTED' } },
		);

		expect((await service.getMetaStatus(user, 'project-1', 'cred-1')).state).toBe('dailyLimit');
	});

	it.each([
		['Meta refuses the number request', async () => ({ statusCode: 400, body: {} })],
		[
			'Meta cannot be reached',
			async () => {
				throw new Error('socket hang up');
			},
		],
	])('gives unknown when %s', async (_label, reply) => {
		request.mockImplementation(reply);

		expect(await service.getMetaStatus(user, 'project-1', 'cred-1')).toEqual({ state: 'unknown' });
	});

	it('gives unknown without asking Meta when the credential is incomplete', async () => {
		credentialLookup.decryptForUser.mockResolvedValue({ ...credential, appSecret: ' ' });

		expect(await service.getMetaStatus(user, 'project-1', 'cred-1')).toEqual({ state: 'unknown' });
		expect(request).not.toHaveBeenCalled();
	});

	describe('cache', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('asks Meta once for repeated asks within the cache time', async () => {
			await service.getMetaStatus(user, 'project-1', 'cred-1');
			const callsAfterFirst = request.mock.calls.length;

			const second = await service.getMetaStatus(user, 'project-1', 'cred-1');

			expect(request.mock.calls.length).toBe(callsAfterFirst);
			expect(second.state).toBe('businessNotVerified');
		});

		it('asks Meta again once the cache time has passed', async () => {
			vi.useFakeTimers();
			await service.getMetaStatus(user, 'project-1', 'cred-1');
			const callsAfterFirst = request.mock.calls.length;

			await vi.advanceTimersByTimeAsync(30_001);
			await service.getMetaStatus(user, 'project-1', 'cred-1');

			expect(request.mock.calls.length).toBeGreaterThan(callsAfterFirst);
		});

		it('shares one Meta read between asks that overlap', async () => {
			const [first, second] = await Promise.all([
				service.getMetaStatus(user, 'project-1', 'cred-1'),
				service.getMetaStatus(user, 'project-1', 'cred-1'),
			]);

			// One read is two Meta requests: the number and the business account.
			expect(request).toHaveBeenCalledTimes(2);
			expect(second).toEqual(first);
		});

		it('does not keep a failed read', async () => {
			request.mockRejectedValueOnce(new Error('socket hang up'));
			expect(await service.getMetaStatus(user, 'project-1', 'cred-1')).toEqual({
				state: 'unknown',
			});

			const retry = await service.getMetaStatus(user, 'project-1', 'cred-1');

			expect(retry.state).toBe('businessNotVerified');
		});

		it('checks the caller on every ask, even when the answer is cached', async () => {
			await service.getMetaStatus(user, 'project-1', 'cred-1');
			credentialLookup.decryptForUser.mockResolvedValue(null);

			await expect(service.getMetaStatus(user, 'project-1', 'cred-1')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('does not give one number the answer for another', async () => {
			await service.getMetaStatus(user, 'project-1', 'cred-1');
			const callsAfterFirst = request.mock.calls.length;
			credentialLookup.decryptForUser.mockResolvedValue({ ...credential, phoneNumberId: '999' });

			await service.getMetaStatus(user, 'project-1', 'cred-1');

			expect(request.mock.calls.length).toBeGreaterThan(callsAfterFirst);
		});

		it('does not give one credential the answer for another that holds the same ids', async () => {
			await service.getMetaStatus(user, 'project-1', 'cred-1');
			const callsAfterFirst = request.mock.calls.length;
			credentialLookup.decryptForUser.mockResolvedValue({ ...credential, accessToken: 'junk' });

			await service.getMetaStatus(user, 'project-2', 'cred-2');

			expect(request.mock.calls.length).toBeGreaterThan(callsAfterFirst);
		});
	});

	it('throws NotFoundError when the caller cannot use the credential', async () => {
		credentialLookup.decryptForUser.mockResolvedValue(null);

		await expect(service.getMetaStatus(user, 'project-1', 'cred-1')).rejects.toThrow(NotFoundError);
	});
});
