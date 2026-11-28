import type { INodeProperties } from 'n8n-workflow';

import { actionNodeOptions } from '../descriptions';

import {
	chatCompletionsOptions,
	RESPONSES_FORMAT,
} from '@utils/custom-model-endpoint/descriptions';

describe('actionNodeOptions', () => {
	const offered = actionNodeOptions.options as INodeProperties[];

	it('carries every shared gateway option it does not replace', () => {
		const inherited = chatCompletionsOptions.filter(
			({ name }) => !['maxTokens', 'maxRetries'].includes(name),
		);

		expect(offered).toEqual(expect.arrayContaining(inherited));
	});

	// This node sends Chat Completions alone, so a Responses option added to the shared
	// list later must not reach it: the gate reads `/apiFormat`, which this node has not got
	it('offers no option that belongs to the Responses format', () => {
		const responsesOnly = offered.filter((option) =>
			option.displayOptions?.show?.['/apiFormat']?.includes(RESPONSES_FORMAT),
		);

		expect(responsesOnly.map(({ name }) => name)).toEqual([]);
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
