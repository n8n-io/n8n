import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { filterTelegramHitlParameters } from './telegramHitlParameters';

const advancedInteractivityNotice: INodeProperties = {
	displayName: 'Advanced Interactivity',
	name: 'advancedInteractivityNotice',
	type: 'notice',
	default: '',
};

const chatApproval: INodeProperties = {
	displayName: 'Approve Within Chat',
	name: 'chatApproval',
	type: 'boolean',
	default: false,
};

const approverIds: INodeProperties = {
	displayName: 'Restrict Who Can Approve',
	name: 'approverIds',
	type: 'string',
	default: '',
};

const unauthorizedReplyText: INodeProperties = {
	displayName: 'Unauthorized Reply',
	name: 'unauthorizedReplyText',
	type: 'string',
	default: '',
};

const postDecisionBehavior: INodeProperties = {
	displayName: 'After Decision',
	name: 'postDecisionBehavior',
	type: 'options',
	default: 'showOutcome',
};

const chatId: INodeProperties = {
	displayName: 'Chat ID',
	name: 'chatId',
	type: 'string',
	default: '',
};

describe('filterTelegramHitlParameters', () => {
	it('removes the advanced interactivity notice, chatApproval and the flat approval fields', () => {
		const result = filterTelegramHitlParameters([
			advancedInteractivityNotice,
			chatApproval,
			approverIds,
			unauthorizedReplyText,
			postDecisionBehavior,
			chatId,
		]);

		expect(result).toEqual([chatId]);
	});

	it('leaves unrelated parameters untouched', () => {
		const result = filterTelegramHitlParameters([chatId]);

		expect(result).toEqual([chatId]);
	});

	it('returns an empty array when given no parameters', () => {
		expect(filterTelegramHitlParameters([])).toEqual([]);
	});
});
