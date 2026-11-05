import fc from 'fast-check';

import { extractJsonCandidate } from './extract-json';

// Prose an LLM wraps around a payload: bracketed links and notes included.
const proseArb = fc
	.array(
		fc.constantFrom(
			'See',
			'[the docs]',
			'[link](https://x.test)',
			'then:',
			'result',
			'(note)',
			'Example',
			'-',
			'done.',
		),
		{ maxLength: 6 },
	)
	.map((words) => words.join(' '));
const containerArb = fc.oneof(fc.dictionary(fc.string(), fc.jsonValue()), fc.array(fc.jsonValue()));
const renderArb = fc.constantFrom<(json: string) => string>(
	(json) => json,
	(json) => '```json\n' + json + '\n```',
	(json) => '```\n' + json + '\n```',
);
const separatorArb = fc.constantFrom(' ', '\n', ': ', '\n\n');

describe('extractJsonCandidate properties', () => {
	it('recovers any JSON container from surrounding prose, fenced or bare', () => {
		fc.assert(
			fc.property(
				containerArb,
				fc.boolean(),
				renderArb,
				proseArb,
				proseArb,
				separatorArb,
				(value, pretty, render, before, after, separator) => {
					const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
					// A fence inside a string value closes the outer fence early; known limit.
					fc.pre(!json.includes('```'));
					const input = `${before}${separator}${render(json)}${separator}${after}`;
					let parsed: unknown;
					try {
						parsed = JSON.parse(extractJsonCandidate(input));
					} catch {
						return false;
					}
					return JSON.stringify(parsed) === JSON.stringify(value);
				},
			),
		);
	});
});
