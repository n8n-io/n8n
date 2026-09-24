import type { AiPreferenceDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
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
		[new ConflictError('dup'), 'duplicate', 'dup'],
		[new BadRequestError('cap'), 'scope_full', 'cap'],
		[new ForbiddenError('no'), 'not_permitted', 'no'],
		[new Error('boom'), 'failed', 'The preference could not be saved.'],
	])('maps %s to reason %s and fires write_rejected only', async (error, reason, message) => {
		const { aiPreferenceService, telemetry, logger, write } = build();
		aiPreferenceService.create.mockRejectedValue(error);

		const result = await write('mcp');

		expect(result).toEqual({ ok: false, reason, message });
		expect(telemetry.track).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
			{
				surface: 'mcp',
				reason,
				scope_type: 'user',
				text_length: 19,
			},
		);
		expect(logger.error).toHaveBeenCalledTimes(reason === 'failed' ? 1 : 0);
	});

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
	it('reads a not-found as a generic failure: the shared write never addresses a row', () => {
		expect(toAiPreferenceWriteRejection(new NotFoundError('gone'))).toEqual({
			reason: 'failed',
			message: 'The preference could not be saved.',
		});
	});
});
