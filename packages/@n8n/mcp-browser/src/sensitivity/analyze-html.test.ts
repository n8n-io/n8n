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
	});

	it('finds password input values structurally', () => {
		const result = analyzeHtmlSensitivity(probe('<input type="password" value="hunter2">'));
		expect(result.ok && result.hits).toContainEqual({
			type: 'password',
			value: 'hunter2',
		});
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

	it('finds a text input value flagged by its associated label', () => {
		const value = 'notreal-SigningSecretRevealedValue9mQ2vW5';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="s">Signing Secret</label><input id="s" type="text" readonly value="${value}">`,
			),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('finds a secret held in a data-* attribute behind a placeholder value', () => {
		const secret = 'notreal7c1de9a04bf28e6d3a91f0b5c7e2d84a6';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="c">Client Secret</label><input id="c" type="password" readonly value="1234567890" data-password="${secret}" data-qa="client_secret">`,
			),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value: secret });
	});

	it('does not flag a public field whose label is not a secret', () => {
		const value = '553213193971.11264233855632';
		const result = analyzeHtmlSensitivity(
			probe(`<label for="i">Client ID</label><input id="i" readonly value="${value}">`),
		);

		expect(result.ok && result.hits.some((hit) => hit.value === value)).toBe(false);
	});

	it('finds an input value flagged by aria-labelledby', () => {
		const value = 'notreal-AriaLabelledByInputValue4kR8pT';
		const result = analyzeHtmlSensitivity(
			probe(`<span id="lbl">Client Secret</span><input aria-labelledby="lbl" value="${value}">`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('harvests only data-* attributes whose name reads as a secret', () => {
		const secret = 'notreal7c1de9a04bf28e6d3a91f0b5c7e2d84a6';
		const tracking = 'trackingId0123456789abcdef';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="c">Client Secret</label><input id="c" type="password" value="1234567890" data-password="${secret}" data-tracking-id="${tracking}" data-hint="reveal the secret value">`,
			),
		);
		const values = result.ok ? result.hits.map((hit) => hit.value) : [];

		expect(values).toContain(secret);
		expect(values).not.toContain(tracking);
		expect(values).not.toContain('reveal the secret value');
	});

	it('finds an input value flagged by a wrapping label', () => {
		const value = 'notreal-WrappingLabelInputValue6bN3wQ';
		const result = analyzeHtmlSensitivity(probe(`<label>API Key <input value="${value}"></label>`));

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('finds a textarea value flagged by its associated label', () => {
		const value = 'notreal-PrivateKeyTextareaValue7hK3mZ';
		const result = analyzeHtmlSensitivity(
			probe(`<label for="pk">Private key</label><textarea id="pk">${value}</textarea>`),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('finds a token input whose label reads "Token"', () => {
		const value = 'notreal-xapp-1-A0B7S6VR5JL-11512837559300-cf6ed2749ec8b364fb78817ee8d8105e';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="t"><span>Token</span></label><input id="t" readonly type="text" value="${value}">`,
			),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('flags a field labelled by multiple label elements sharing its id', () => {
		const value = 'notreal-MultiLabelFieldValue3xQ8mZ';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="m">Access</label><label for="m">key</label><input id="m" type="text" readonly value="${value}">`,
			),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	it('ignores empty and target-less label elements when indexing', () => {
		const value = 'notreal-EmptyLabelSiblingValue2wP7';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="">orphan</label><label for="e"></label><input id="e" type="text" readonly value="${value}">`,
			),
		);

		expect(result.ok && result.hits.some((hit) => hit.value === value)).toBe(false);
	});

	it('does not flag an unlabelled field that only carries an id', () => {
		const value = 'notreal-UnlabelledFieldValue5yT2kR';
		const result = analyzeHtmlSensitivity(
			probe(`<input id="lonely" type="text" readonly value="${value}">`),
		);

		expect(result.ok && result.hits.some((hit) => hit.value === value)).toBe(false);
	});

	it('skips data-* values that are short, spaced, or duplicate the field value', () => {
		const value = 'notreal-PrimaryFieldSecret8kM4nQ';
		const result = analyzeHtmlSensitivity(
			probe(
				`<label for="c">Client Secret</label><input id="c" type="text" readonly value="${value}" data-secret="tiny" data-password="two words here padded outx" data-credential="${value}">`,
			),
		);
		const values = result.ok ? result.hits.map((hit) => hit.value) : [];

		expect(values).toContain(value);
		expect(values).not.toContain('tiny');
		expect(values).not.toContain('two words here padded outx');
		expect(values.filter((hit) => hit === value)).toHaveLength(1);
	});

	it('produces no hit for a sensitive field with an empty value', () => {
		const result = analyzeHtmlSensitivity(
			probe('<label for="p">Password</label><input id="p" type="text" readonly value="">'),
		);

		expect(result.ok && result.hits).toEqual([]);
	});

	it('finds high-entropy values in reveal dialogs', () => {
		const result = analyzeHtmlSensitivity(
			probe(`<div role="dialog"><p>You won't see it again.</p><code>${OPAQUE}</code></div>`),
		);
		expect(result.ok && result.hits).toContainEqual({
			type: 'secret',
			value: OPAQUE,
		});
	});

	it('walks same-origin iframe and shadow-root bundle children', () => {
		const result = analyzeHtmlSensitivity(
			probe('<p>outer</p>', [
				{
					kind: 'iframe',
					html: `<p>${ANTHROPIC}</p>`,
					url: 'http://test.com/frame',
					children: [],
					errors: [],
				},
				{
					kind: 'shadow-root',
					html: `<div role="dialog"><p>Copy this secret</p><code>${OPAQUE}</code></div>`,
					url: 'http://test.com',
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
