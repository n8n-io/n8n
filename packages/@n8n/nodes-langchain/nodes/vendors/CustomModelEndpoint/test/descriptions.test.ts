import type { INodeProperties } from 'n8n-workflow';

import { actionNodeOptions } from '../descriptions';

import { sharedOptions } from '@utils/custom-model-endpoint/descriptions';

describe('actionNodeOptions', () => {
	const offered = actionNodeOptions.options as INodeProperties[];

	it('carries every shared gateway option it does not replace', () => {
		const inherited = sharedOptions.filter(
			({ name }) => !['maxTokens', 'maxRetries'].includes(name),
		);

		expect(offered).toEqual(expect.arrayContaining(inherited));
	});

	it('replaces the one auto-switching cap with two, and drops the retry count', () => {
		// Alphabetical by display name, which is the order the editor shows them in
		expect(offered.map(({ name }) => name)).toEqual([
			'frequencyPenalty',
			'maxCompletionTokens',
			'maxTokens',
			'presencePenalty',
			'temperature',
			'seed',
			'stop',
			'timeout',
			'topP',
		]);
	});
});
