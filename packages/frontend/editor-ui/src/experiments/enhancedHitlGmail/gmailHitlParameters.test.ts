import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { filterGmailHitlParameters } from './gmailHitlParameters';

const advancedEmail: INodeProperties = {
	displayName: 'Advanced Email Options',
	name: 'advancedEmail',
	type: 'boolean',
	default: false,
};

const firstResponseNotice: INodeProperties = {
	displayName: 'The workflow resumes with the first response',
	name: 'firstResponseNotice',
	type: 'notice',
	default: '',
};

const advancedEmailOptions: INodeProperties = {
	displayName: 'Email Options',
	name: 'advancedEmailOptions',
	type: 'collection',
	default: {},
};

const confirmationPage: INodeProperties = {
	displayName: 'Show Confirmation Page',
	name: 'confirmationPage',
	type: 'boolean',
	default: false,
};

const sendTo: INodeProperties = {
	displayName: 'To',
	name: 'sendTo',
	type: 'string',
	default: '',
};

describe('filterGmailHitlParameters', () => {
	it('removes all advanced HITL parameters', () => {
		const result = filterGmailHitlParameters([
			sendTo,
			advancedEmail,
			firstResponseNotice,
			advancedEmailOptions,
			confirmationPage,
		]);

		expect(result).toEqual([sendTo]);
	});

	it('leaves unrelated parameters untouched', () => {
		const result = filterGmailHitlParameters([sendTo]);

		expect(result).toEqual([sendTo]);
	});

	it('returns an empty array when given no parameters', () => {
		expect(filterGmailHitlParameters([])).toEqual([]);
	});
});
