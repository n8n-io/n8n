/**
 * The estimator exists to answer one question: will this text fit? So it is
 * pinned to what the editor actually renders, not to itself.
 *
 * MEASURED_SAMPLES are real `scrollHeight` readings taken from the rendered
 * canvas (a workflow of stickies at fixed widths, measured in a browser). The
 * contract is one-directional: the estimate must never come in UNDER the real
 * height, because the sticky text area is `overflow: hidden` and anything that
 * does not fit is silently clipped. Over-estimating only wastes canvas.
 *
 * To re-measure after a CSS change: create one sticky per (content, width) pair
 * with a generous height, open the workflow, and read
 * `sticky > [class*=wrapper] > :first-child` `.scrollHeight`.
 */

import {
	estimateStickyHeightForContent,
	estimateStickyTextHeight,
	estimateStickyWidth,
	expandMultiBreaks,
	STICKY_AUTO_MAX_HEADER_WIDTH,
	STICKY_AUTO_MIN_WIDTH,
} from './sticky-text-sizing';

interface MeasuredSample {
	sample: string;
	width: number;
	/** Real rendered content height, in px, read from the browser. */
	rendered: number;
	content: string;
}

const MEASURED_SAMPLES: MeasuredSample[] = [
	{
		sample: 'h3_short',
		width: 160,
		rendered: 124,
		content:
			'### Logging\nEvery answered turn is written to the analytics database so we can review quality later.',
	},
	{
		sample: 'h3_short',
		width: 240,
		rendered: 86,
		content:
			'### Logging\nEvery answered turn is written to the analytics database so we can review quality later.',
	},
	{
		sample: 'h3_short',
		width: 384,
		rendered: 67,
		content:
			'### Logging\nEvery answered turn is written to the analytics database so we can review quality later.',
	},
	{
		sample: 'h3_short',
		width: 640,
		rendered: 48,
		content:
			'### Logging\nEvery answered turn is written to the analytics database so we can review quality later.',
	},
	{
		sample: 'h2_two_sent',
		width: 160,
		rendered: 224,
		content:
			'## 2. Validate the email\nA regex check on the normalized address. Anything that fails goes straight to the 400 response and never reaches the database.',
	},
	{
		sample: 'h2_two_sent',
		width: 240,
		rendered: 167,
		content:
			'## 2. Validate the email\nA regex check on the normalized address. Anything that fails goes straight to the 400 response and never reaches the database.',
	},
	{
		sample: 'h2_two_sent',
		width: 384,
		rendered: 97,
		content:
			'## 2. Validate the email\nA regex check on the normalized address. Anything that fails goes straight to the 400 response and never reaches the database.',
	},
	{
		sample: 'h2_two_sent',
		width: 640,
		rendered: 78,
		content:
			'## 2. Validate the email\nA regex check on the normalized address. Anything that fails goes straight to the 400 response and never reaches the database.',
	},
	{ sample: 'h1_only', width: 160, rendered: 97, content: '# Overview' },
	{ sample: 'h1_only', width: 240, rendered: 49, content: '# Overview' },
	{ sample: 'h1_only', width: 384, rendered: 49, content: '# Overview' },
	{ sample: 'h1_only', width: 640, rendered: 49, content: '# Overview' },
	{
		sample: 'long_para',
		width: 160,
		rendered: 246,
		content:
			'This workflow pulls open support tickets from the API every Monday morning, keeps only the ones that have been waiting longer than seven days, groups them into themes, and posts a digest to Slack for the on-call engineer to triage.',
	},
	{
		sample: 'long_para',
		width: 240,
		rendered: 151,
		content:
			'This workflow pulls open support tickets from the API every Monday morning, keeps only the ones that have been waiting longer than seven days, groups them into themes, and posts a digest to Slack for the on-call engineer to triage.',
	},
	{
		sample: 'long_para',
		width: 384,
		rendered: 94,
		content:
			'This workflow pulls open support tickets from the API every Monday morning, keeps only the ones that have been waiting longer than seven days, groups them into themes, and posts a digest to Slack for the on-call engineer to triage.',
	},
	{
		sample: 'long_para',
		width: 640,
		rendered: 57,
		content:
			'This workflow pulls open support tickets from the API every Monday morning, keeps only the ones that have been waiting longer than seven days, groups them into themes, and posts a digest to Slack for the on-call engineer to triage.',
	},
	{
		sample: 'list',
		width: 160,
		rendered: 160,
		content:
			'## Steps\n- Fetch the tickets\n- Filter the stale ones\n- Summarize by theme\n- Post to Slack',
	},
	{
		sample: 'list',
		width: 240,
		rendered: 124,
		content:
			'## Steps\n- Fetch the tickets\n- Filter the stale ones\n- Summarize by theme\n- Post to Slack',
	},
	{
		sample: 'list',
		width: 384,
		rendered: 124,
		content:
			'## Steps\n- Fetch the tickets\n- Filter the stale ones\n- Summarize by theme\n- Post to Slack',
	},
	{
		sample: 'list',
		width: 640,
		rendered: 124,
		content:
			'## Steps\n- Fetch the tickets\n- Filter the stale ones\n- Summarize by theme\n- Post to Slack',
	},
	{
		sample: 'code_fence',
		width: 160,
		rendered: 151,
		content: '## Payload\n```json\n{\n  "email": "a@b.c",\n  "plan": "pro"\n}\n```',
	},
	{
		sample: 'code_fence',
		width: 240,
		rendered: 151,
		content: '## Payload\n```json\n{\n  "email": "a@b.c",\n  "plan": "pro"\n}\n```',
	},
	{
		sample: 'code_fence',
		width: 384,
		rendered: 136,
		content: '## Payload\n```json\n{\n  "email": "a@b.c",\n  "plan": "pro"\n}\n```',
	},
	{
		sample: 'code_fence',
		width: 640,
		rendered: 136,
		content: '## Payload\n```json\n{\n  "email": "a@b.c",\n  "plan": "pro"\n}\n```',
	},
	{
		sample: 'blank_run',
		width: 160,
		rendered: 116,
		content: '## Spaced\n\n\n\nAfter three blank lines.',
	},
	{
		sample: 'blank_run',
		width: 240,
		rendered: 97,
		content: '## Spaced\n\n\n\nAfter three blank lines.',
	},
	{
		sample: 'blank_run',
		width: 384,
		rendered: 97,
		content: '## Spaced\n\n\n\nAfter three blank lines.',
	},
	{
		sample: 'blank_run',
		width: 640,
		rendered: 97,
		content: '## Spaced\n\n\n\nAfter three blank lines.',
	},
	{
		sample: 'cjk',
		width: 160,
		rendered: 154,
		content:
			'## \u6982\u8981\n\u3053\u306e\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u306f\u6bce\u9031\u6708\u66dc\u65e5\u306b\u30b5\u30dd\u30fc\u30c8\u30c1\u30b1\u30c3\u30c8\u3092\u53d6\u5f97\u3057\u30017\u65e5\u4ee5\u4e0a\u7d4c\u904e\u3057\u305f\u3082\u306e\u3060\u3051\u3092\u6b8b\u3057\u3066\u8981\u7d04\u3057\u307e\u3059\u3002',
	},
	{
		sample: 'cjk',
		width: 240,
		rendered: 116,
		content:
			'## \u6982\u8981\n\u3053\u306e\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u306f\u6bce\u9031\u6708\u66dc\u65e5\u306b\u30b5\u30dd\u30fc\u30c8\u30c1\u30b1\u30c3\u30c8\u3092\u53d6\u5f97\u3057\u30017\u65e5\u4ee5\u4e0a\u7d4c\u904e\u3057\u305f\u3082\u306e\u3060\u3051\u3092\u6b8b\u3057\u3066\u8981\u7d04\u3057\u307e\u3059\u3002',
	},
	{
		sample: 'cjk',
		width: 384,
		rendered: 78,
		content:
			'## \u6982\u8981\n\u3053\u306e\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u306f\u6bce\u9031\u6708\u66dc\u65e5\u306b\u30b5\u30dd\u30fc\u30c8\u30c1\u30b1\u30c3\u30c8\u3092\u53d6\u5f97\u3057\u30017\u65e5\u4ee5\u4e0a\u7d4c\u904e\u3057\u305f\u3082\u306e\u3060\u3051\u3092\u6b8b\u3057\u3066\u8981\u7d04\u3057\u307e\u3059\u3002',
	},
	{
		sample: 'cjk',
		width: 640,
		rendered: 78,
		content:
			'## \u6982\u8981\n\u3053\u306e\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u306f\u6bce\u9031\u6708\u66dc\u65e5\u306b\u30b5\u30dd\u30fc\u30c8\u30c1\u30b1\u30c3\u30c8\u3092\u53d6\u5f97\u3057\u30017\u65e5\u4ee5\u4e0a\u7d4c\u904e\u3057\u305f\u3082\u306e\u3060\u3051\u3092\u6b8b\u3057\u3066\u8981\u7d04\u3057\u307e\u3059\u3002',
	},
	{ sample: 'tiny', width: 160, rendered: 32, content: '## Hi' },
	{ sample: 'tiny', width: 240, rendered: 32, content: '## Hi' },
	{ sample: 'tiny', width: 384, rendered: 32, content: '## Hi' },
	{ sample: 'tiny', width: 640, rendered: 32, content: '## Hi' },
];

/** Head-room we tolerate before an over-estimate counts as waste, not safety. */
const MAX_OVERSHOOT = 96;

describe('sticky text sizing', () => {
	describe('against measured browser output', () => {
		it.each(MEASURED_SAMPLES)(
			'never under-estimates $sample at width $width',
			({ content, width, rendered }) => {
				expect(estimateStickyTextHeight(content, width)).toBeGreaterThanOrEqual(rendered);
			},
		);

		it.each(MEASURED_SAMPLES)(
			'does not wildly over-estimate $sample at width $width',
			({ content, width, rendered }) => {
				expect(estimateStickyTextHeight(content, width)).toBeLessThanOrEqual(
					rendered + MAX_OVERSHOOT,
				);
			},
		);
	});

	describe('estimateStickyTextHeight', () => {
		it('is zero for no content', () => {
			expect(estimateStickyTextHeight(undefined, 240)).toBe(0);
			expect(estimateStickyTextHeight('', 240)).toBe(0);
		});

		it('reserves more room for a bigger heading', () => {
			const h1 = estimateStickyTextHeight('# Title', 240);
			const h2 = estimateStickyTextHeight('## Title', 240);
			const h3 = estimateStickyTextHeight('### Title', 240);
			expect(h1).toBeGreaterThan(h2);
			expect(h2).toBeGreaterThan(h3);
		});

		it('gets taller as the sticky gets narrower', () => {
			const text = 'A sentence long enough that it has to wrap more than once.';
			expect(estimateStickyTextHeight(text, 160)).toBeGreaterThan(
				estimateStickyTextHeight(text, 640),
			);
		});

		it('counts full-width characters as wider than Latin ones', () => {
			// Same character count, but the CJK line occupies about twice the advance.
			const latin = estimateStickyTextHeight('aaaaaaaaaaaaaaaaaaaa', 160);
			const cjk = estimateStickyTextHeight('あああああああああああああああああああ', 160);
			expect(cjk).toBeGreaterThan(latin);
		});
	});

	describe('expandMultiBreaks', () => {
		it('turns extra blank lines into rendered spacer lines', () => {
			expect(expandMultiBreaks('a\n\n\n\nb')).toBe('a\n\n&nbsp;\n&nbsp;\nb');
		});

		it('leaves a single blank line alone', () => {
			expect(expandMultiBreaks('a\n\nb')).toBe('a\n\nb');
		});

		it('does not touch blank lines inside a code fence', () => {
			const fenced = '```\ncode\n\n\n\nmore\n```';
			expect(expandMultiBreaks(fenced)).toBe(fenced);
		});
	});

	describe('estimateStickyWidth', () => {
		it('never comes in under the wrapped node group', () => {
			expect(estimateStickyWidth('## Hi', 600, 32)).toBeGreaterThanOrEqual(600 + 64);
		});

		it('floors at the auto minimum for a tiny group', () => {
			expect(estimateStickyWidth('## Hi', 0, 0)).toBe(STICKY_AUTO_MIN_WIDTH);
		});

		it('caps how far a long heading can stretch it', () => {
			const wide = estimateStickyWidth(`## ${'word '.repeat(60)}`, 0, 0);
			expect(wide).toBeLessThanOrEqual(STICKY_AUTO_MAX_HEADER_WIDTH);
		});
	});

	describe('estimateStickyHeightForContent', () => {
		it('adds the container chrome to the text height', () => {
			const text = '## Title\nA line of body copy.';
			expect(estimateStickyHeightForContent(text, 240)).toBeGreaterThan(
				estimateStickyTextHeight(text, 240),
			);
		});
	});
});
