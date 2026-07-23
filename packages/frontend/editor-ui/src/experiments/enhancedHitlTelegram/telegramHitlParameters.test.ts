import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { filterTelegramHitlParameters } from './telegramHitlParameters';

const chatApproval: INodeProperties = {
	displayName: 'Approve Within Chat',
	name: 'chatApproval',
	type: 'boolean',
	default: false,
};

const chatApprovalOptions: INodeProperties = {
	displayName: 'Chat Approval Options',
	name: 'chatApprovalOptions',
	type: 'collection',
	default: {},
};

const chatId: INodeProperties = {
	displayName: 'Chat ID',
	name: 'chatId',
	type: 'string',
	default: '',
};

describe('filterTelegramHitlParameters', () => {
	it('removes chatApproval and chatApprovalOptions', () => {
		const result = filterTelegramHitlParameters([chatApproval, chatApprovalOptions, chatId]);

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
