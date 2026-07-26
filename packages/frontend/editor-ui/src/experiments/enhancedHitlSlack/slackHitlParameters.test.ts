import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { filterSlackHitlParameters } from './slackHitlParameters';

const captureResponder: INodeProperties = {
	displayName: 'Capture Who Responded',
	name: 'captureResponder',
	type: 'boolean',
	default: false,
};

const approvers: INodeProperties = {
	displayName: 'Approvers',
	name: 'approvers',
	type: 'multiOptions',
	default: [],
};

const channelId: INodeProperties = {
	displayName: 'Channel',
	name: 'channelId',
	type: 'string',
	default: '',
};

describe('filterSlackHitlParameters', () => {
	it('removes captureResponder and approvers', () => {
		const result = filterSlackHitlParameters([captureResponder, approvers, channelId]);

		expect(result).toEqual([channelId]);
	});

	it('leaves unrelated parameters untouched', () => {
		const result = filterSlackHitlParameters([channelId]);

		expect(result).toEqual([channelId]);
	});

	it('returns an empty array when given no parameters', () => {
		expect(filterSlackHitlParameters([])).toEqual([]);
	});
});
