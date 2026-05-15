import { analyzeHtmlSensitivity } from './analyze-html';
import type { HtmlProbeResult } from '../types';

const ANTHROPIC = `sk-ant-api03-${'a'.repeat(93)}AA`;
const OPAQUE = 'notreal-IMzLaCKsU6ZxAbt2qFc9XYdRpQ7vNtBmKL';

function probe(
	html: string,
	children = [] as NonNullable<HtmlProbeResult['root']>['children'],
): HtmlProbeResult {
	return {
		ok: true,
		root: {
			kind: 'document',
			html,
			url: 'http://test.com',
			path: ['document'],
			children,
			errors: [],
		},
	};
}

describe('analyzeHtmlSensitivity', () => {
	it('finds regex hits in plain DOM text', () => {
		const result = analyzeHtmlSensitivity(probe(`<p>${ANTHROPIC}</p>`));
		expect(result.ok && result.sensitive).toBe(true);
		expect(result.ok && result.hits).toContainEqual({
			type: 'anthropic_api_key',
			value: ANTHROPIC,
		});
		expect(result.ok && result.sources).toContain('regex');
	});

	it('finds password input values structurally', () => {
		const result = analyzeHtmlSensitivity(probe('<input type="password" value="hunter2">'));
		expect(result.ok && result.hits).toContainEqual({
			type: 'password',
			value: 'hunter2',
		});
		expect(result.ok && result.sources).toContain('dom-structure');
	});

	it('finds sensitive test-id input values structurally', () => {
		const result = analyzeHtmlSensitivity(
			probe('<input data-testid="admin-key" value="abcdef1234567890abcdef">'),
		);

		expect(result.ok && result.hits).toContainEqual({
			type: 'password',
			value: 'abcdef1234567890abcdef',
		});
	});

	it('finds readonly spellcheck=false input values structurally', () => {
		const value = 'aGenericLongOpaqueSystemValue1234';
		const result = analyzeHtmlSensitivity(
			probe(`<input readonly spellcheck="false" value="${value}">`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('does not find short readonly spellcheck=false input values', () => {
		const result = analyzeHtmlSensitivity(
			probe('<input readonly spellcheck="false" value="alice">'),
		);

		expect(result.ok && result.hits.some((hit) => hit.value === 'alice')).toBe(false);
	});

	it('finds high-entropy values in reveal dialogs', () => {
		const result = analyzeHtmlSensitivity(
			probe(`<div role="dialog"><p>You won't see it again.</p><code>${OPAQUE}</code></div>`),
		);
		expect(result.ok && result.hits).toContainEqual({
			type: 'secret',
			value: OPAQUE,
		});
		expect(result.ok && result.sources).toContain('entropy');
	});

	it('walks same-origin iframe and shadow-root bundle children', () => {
		const result = analyzeHtmlSensitivity(
			probe('<p>outer</p>', [
				{
					kind: 'iframe',
					html: `<p>${ANTHROPIC}</p>`,
					url: 'http://test.com/frame',
					path: ['document', 'iframe:0'],
					children: [],
					errors: [],
				},
				{
					kind: 'shadow-root',
					html: `<div role="dialog"><p>Copy this secret</p><code>${OPAQUE}</code></div>`,
					url: 'http://test.com',
					path: ['document', 'shadow:0'],
					children: [],
					errors: [],
				},
			]),
		);
		expect(result.ok && result.hits.some((hit) => hit.value === ANTHROPIC)).toBe(true);
		expect(result.ok && result.hits.some((hit) => hit.value === OPAQUE)).toBe(true);
	});

	it('finds issuer-shaped secrets in hidden DOM text', () => {
		const result = analyzeHtmlSensitivity(probe(`<div style="display:none">${ANTHROPIC}</div>`));

		expect(result.ok && result.sensitive).toBe(true);
		expect(result.ok && result.hits).toContainEqual({
			type: 'anthropic_api_key',
			value: ANTHROPIC,
		});
	});

	it('does not treat generic copy widgets as sensitive', () => {
		const result = analyzeHtmlSensitivity(
			probe(`
				<section>
					<h2>Share this article</h2>
					<input value="https://example.com/article/123">
					<button>Copy</button>
				</section>
			`),
		);

		expect(result.ok && result.sensitive).toBe(false);
		expect(result.ok && result.hits).toEqual([]);
	});

	it('finds reveal-button plus copy-button non-dialog containers', () => {
		const result = analyzeHtmlSensitivity(
			probe(`
				<section>
					<h2>API keys</h2>
					<code>${OPAQUE}</code>
					<button>Reveal key</button>
					<button>Copy</button>
				</section>
			`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'secret', value: OPAQUE });
	});

	it('finds sensitive aria-label containers', () => {
		const secret = 'notreal-AriaLabelSecretX9mQ2vW5yZ8aBcDeFg';
		const result = analyzeHtmlSensitivity(
			probe(`<span aria-label="Live secret key">${secret}</span>`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'secret', value: secret });
	});

	it('resolves aria-labelledby for sensitive containers', () => {
		const secret = 'notreal-AriaLabelledBySecretX9mQ2vW5yZ8aBcDeFg';
		const result = analyzeHtmlSensitivity(
			probe(`<span id="label">Client Secret</span><div aria-labelledby="label">${secret}</div>`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'secret', value: secret });
	});

	it('finds code inside an ancestor with sensitive test-id', () => {
		const secret = 'notreal-CodeAncestorSecretX9mQ2vW5yZ8aBcDeFg';
		const result = analyzeHtmlSensitivity(
			probe(`<div data-testid="api-key-display"><code>${secret}</code></div>`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'secret', value: secret });
	});

	it('finds code inside an ancestor with a copy button', () => {
		const secret = 'notreal-CopyAncestorSecretX9mQ2vW5yZ8aBcDeFg';
		const result = analyzeHtmlSensitivity(
			probe(`<section><code>${secret}</code><button>Copy</button></section>`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'secret', value: secret });
	});

	it('does not treat documentation code blocks as sensitive without nearby signals', () => {
		const result = analyzeHtmlSensitivity(
			probe(`
				<article>
					<h1>Installation</h1>
					<pre><code>npm install @example/some-package</code></pre>
					<pre><code>npx example init --token placeholder</code></pre>
				</article>
			`),
		);

		expect(result.ok && result.sensitive).toBe(false);
		expect(result.ok && result.hits).toEqual([]);
	});

	it('dedupes the same secret found by multiple passes', () => {
		const result = analyzeHtmlSensitivity(
			probe(`
				<div role="dialog" data-testid="api-key-display">
					<p>You won't see it again.</p>
					<code>${OPAQUE}</code>
					<button>Copy</button>
				</div>
			`),
		);

		expect(result.ok && result.hits.filter((hit) => hit.value === OPAQUE)).toHaveLength(1);
	});
});
