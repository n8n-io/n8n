import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { filterSlackHitlParameters } from './slackHitlParameters';

const advancedInteractivityNotice: INodeProperties = {
	displayName: 'Advanced Interactivity',
	name: 'advancedInteractivityNotice',
	type: 'notice',
	default: '',
};

const captureResponder: INodeProperties = {
	displayName: 'Capture Who Responded',
	name: 'captureResponder',
	type: 'boolean',
	default: false,
};

const approvers: INodeProperties = {
	displayName: 'Restrict Who Can Approve',
	name: 'approvers',
	type: 'multiOptions',
	default: [],
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

const channelId: INodeProperties = {
	displayName: 'Channel',
	name: 'channelId',
	type: 'string',
	default: '',
};

describe('filterSlackHitlParameters', () => {
	it('removes the advanced interactivity notice and all advanced approval fields', () => {
		const result = filterSlackHitlParameters([
			advancedInteractivityNotice,
			captureResponder,
			approvers,
			unauthorizedReplyText,
			postDecisionBehavior,
			channelId,
		]);

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
