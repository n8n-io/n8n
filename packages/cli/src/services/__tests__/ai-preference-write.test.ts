import type { AiPreferenceDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import { AiPreferenceScopeFullError } from '@/errors/response-errors/ai-preference-scope-full.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	toAiPreferenceWriteRejection,
	writeAssistantPreference,
} from '@/services/ai-preference-write';
import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

const user = mock<User>({ id: 'user-1' });
const saved = { id: 'pref-1', content: 'Keep replies short.' } as AiPreferenceDto;

const build = () => {
	const aiPreferenceService = mock<AiPreferenceService>();
	const telemetry = mock<Telemetry>();
	const logger = mock<Logger>();
	const write = async (surface: 'aia' | 'mcp' = 'mcp') =>
		await writeAssistantPreference({
			aiPreferenceService,
			telemetry,
			logger,
			user,
			surface,
			content: 'Keep replies short.',
			scope: 'user',
		});
	return { aiPreferenceService, telemetry, logger, write };
};

/** One write for both assistant surfaces, so the events and the refusals cannot drift. */
describe('writeAssistantPreference', () => {
	it.each(['aia', 'mcp'] as const)('writes with the surface as source (%s)', async (surface) => {
		const { aiPreferenceService, write } = build();
		aiPreferenceService.create.mockResolvedValue(saved);

		const result = await write(surface);

		expect(aiPreferenceService.create).toHaveBeenCalledWith(
			user,
			{ content: 'Keep replies short.', scope: 'user' },
			surface,
		);
		expect(result).toEqual({ ok: true, preference: saved });
	});

	it('fires shown, resolved(accepted), scope_accepted and saved with the write', async () => {
		const { aiPreferenceService, telemetry, write } = build();
		aiPreferenceService.create.mockResolvedValue(saved);

		await write('mcp');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_SHOWN,
			{ surface: 'mcp', scope_type: 'user', text_length: 19 },
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
			{ surface: 'mcp', outcome: 'accepted', scope_type: 'user', text_length: 19 },
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			{
				surface: 'mcp',
				offered_scope: 'user',
				accepted_scope: 'user',
				scope_changed: false,
			},
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE,
			{ surface: 'mcp', scope_type: 'user', text_length: 19, replaced_existing: false },
		);
	});

	it.each([
		[new ConflictError('dup'), { reason: 'duplicate', message: 'dup' }],
		[
			new AiPreferenceScopeFullError('user', { limit: 50, actual: 50 }),
			{
				reason: 'scope_full',
				message: 'A user cannot hold more than 50 preferences',
				limit: 50,
				actual: 50,
			},
		],
		[new ForbiddenError('no'), { reason: 'not_permitted', message: 'no' }],
		// Any other 4xx is a refusal written for a person, so its text passes through.
		[new BadRequestError('no project'), { reason: 'failed', message: 'no project' }],
	])(
		'maps %s to a refusal and fires write_rejected only, without logging',
		async (error, expected) => {
			const { aiPreferenceService, telemetry, logger, write } = build();
			aiPreferenceService.create.mockRejectedValue(error);

			const result = await write('mcp');

			expect(result).toEqual({ ok: false, ...expected });
			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
				{
					surface: 'mcp',
					reason: expected.reason,
					scope_type: 'user',
					text_length: 19,
				},
			);
			expect(logger.error).not.toHaveBeenCalled();
		},
	);

	it.each([new Error('boom'), new InternalServerError('db down')])(
		'keeps the message of an unexpected fault internal and logs it: %s',
		async (error) => {
			const { aiPreferenceService, logger, write } = build();
			aiPreferenceService.create.mockRejectedValue(error);

			const result = await write('mcp');

			expect(result).toEqual({
				ok: false,
				reason: 'failed',
				message: 'The preference could not be saved.',
			});
			expect(logger.error).toHaveBeenCalledWith(
				'Saving an AI preference from the assistant failed',
				{ error },
			);
		},
	);

	// The row is committed before any event fires, so a telemetry fault must not turn a saved
	// preference into a failed one that the model retries into a duplicate.
	it('still reports the write as saved when telemetry throws afterwards', async () => {
		const { aiPreferenceService, telemetry, logger, write } = build();
		aiPreferenceService.create.mockResolvedValue(saved);
		telemetry.track.mockImplementation(() => {
			throw new Error('telemetry down');
		});

		const result = await write('aia');

		expect(result).toEqual({ ok: true, preference: saved });
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});
});

describe('toAiPreferenceWriteRejection', () => {
	it('passes a not-found message through as a failure: a 4xx is written for a person', () => {
		expect(toAiPreferenceWriteRejection(new NotFoundError('gone'))).toEqual({
			reason: 'failed',
			message: 'gone',
		});
	});
});
