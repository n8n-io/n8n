import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type {
	InstanceAiContext,
	InstanceAiPreferenceService,
	InstanceAiPreferenceWriteResult,
} from '../../types';
import {
	createSaveUserPreferenceTool,
	SAVE_USER_PREFERENCE_DESCRIPTION,
} from '../save-user-preference.tool';

const DESCRIPTION =
	'Saves a durable preference for this user: a node or credential choice, a naming rule, how they organize their work, or a pattern to avoid. ' +
	'Call this when the user states something they want you to keep following in later conversations, not a one-off instruction for the current task. ' +
	'The saved text appears in the chat, where the user can edit or undo it. If this preference conflicts with one already saved, say so and let the user decide.';

const saved: InstanceAiPreferenceWriteResult = {
	ok: true,
	preference: { id: 'pref-1', content: 'Keep replies short.', scope: 'user' },
};

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.aiPreferenceService = { create: vi.fn().mockResolvedValue(saved) };
	context.permissions = undefined;
	Object.assign(context, overrides);
	return context;
}

describe('save_user_preference tool', () => {
	it('carries the agreed description verbatim', () => {
		const tool = createSaveUserPreferenceTool(makeContext());
		expect(tool.description).toBe(DESCRIPTION);
		expect(SAVE_USER_PREFERENCE_DESCRIPTION).toBe(DESCRIPTION);
	});

	it('is named save_user_preference', () => {
		expect(createSaveUserPreferenceTool(makeContext()).name).toBe('save_user_preference');
	});

	it('throws plainly when preferences are not enabled on the instance', async () => {
		const context = makeContext({ aiPreferenceService: undefined });
		await expect(
			executeTool(createSaveUserPreferenceTool(context), { content: 'x', scope: 'user' }),
		).rejects.toThrow('Saved preferences are not enabled on this instance.');
	});

	it('returns blocked_by_admin without calling the service', async () => {
		const context = makeContext();
		context.permissions = mock<NonNullable<InstanceAiContext['permissions']>>({
			createPreference: 'blocked',
		});
		const result = await executeTool(createSaveUserPreferenceTool(context), {
			content: 'Keep replies short.',
			scope: 'user',
		});
		expect(result).toMatchObject({ ok: false, reason: 'blocked_by_admin' });
		expect(context.aiPreferenceService?.create).not.toHaveBeenCalled();
	});

	it('returns too_long for text over the cap without calling the service', async () => {
		const context = makeContext();
		const result = await executeTool(createSaveUserPreferenceTool(context), {
			content: 'x'.repeat(2001),
			scope: 'user',
		});
		expect(result).toMatchObject({ ok: false, reason: 'too_long' });
		expect(context.aiPreferenceService?.create).not.toHaveBeenCalled();
	});

	it('returns failed for blank text without calling the service', async () => {
		const context = makeContext();
		const result = await executeTool(createSaveUserPreferenceTool(context), {
			content: '   ',
			scope: 'user',
		});
		expect(result).toMatchObject({ ok: false, reason: 'failed' });
		expect(context.aiPreferenceService?.create).not.toHaveBeenCalled();
	});

	it('writes the trimmed text and returns the service result', async () => {
		const context = makeContext();
		const result = await executeTool(createSaveUserPreferenceTool(context), {
			content: '  Keep replies short.  ',
			scope: 'user',
		});
		expect(context.aiPreferenceService?.create).toHaveBeenCalledWith({
			content: 'Keep replies short.',
			scope: 'user',
		});
		expect(result).toEqual(saved);
	});

	it('passes a service rejection through unchanged', async () => {
		const rejected: InstanceAiPreferenceWriteResult = {
			ok: false,
			reason: 'duplicate',
			message: 'This user already has a preference with the same text',
		};
		const service: InstanceAiPreferenceService = { create: vi.fn().mockResolvedValue(rejected) };
		const result = await executeTool(
			createSaveUserPreferenceTool(makeContext({ aiPreferenceService: service })),
			{
				content: 'Keep replies short.',
				scope: 'user',
			},
		);
		expect(result).toEqual(rejected);
	});

	it('treats a stray require_approval as always_allow, because it never pauses', async () => {
		const context = makeContext();
		context.permissions = mock<NonNullable<InstanceAiContext['permissions']>>({
			createPreference: 'require_approval',
		});
		const result = await executeTool(createSaveUserPreferenceTool(context), {
			content: 'Keep replies short.',
			scope: 'user',
		});
		expect(result).toEqual(saved);
	});
});
