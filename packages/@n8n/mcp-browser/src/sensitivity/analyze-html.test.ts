import { analyzeHtmlSensitivity } from './analyze-html';
import { ASSIGNMENT_NAME, CONCATENATED_ONLY, PARTIAL_TOKEN } from '../redaction/redact';
import { htmlProbe as probe } from '../tools/test-helpers';

const ANTHROPIC = `sk-ant-api03-${'a'.repeat(93)}AA`;
const OPAQUE = 'notreal-IMzLaCKsU6ZxAbt2qFc9XYdRpQ7vNtBmKL';
const HEX_SECRET = 'notreal7c1de9a04bf28e6d3a91f0b5c7e2d84a6';
const DOTTED_SECRET = 'AQI.notrealuhfuehfiaSkdjLmQpWoEiRuTyZxCvBnMaGh';

describe('analyzeHtmlSensitivity', () => {
	// The same key often appears in the page and again in an embedded frame; the
	// bare occurrence is the span that can safely become a credential.
	it('keeps the narrowest capture span when a key appears in several documents', () => {
		const key = `AIza${'B'.repeat(35)}`;
		const result = analyzeHtmlSensitivity(
			probe(`<p>${key}</p>`, [
				{ kind: 'iframe', html: `<p>id.${key}</p>`, children: [], errors: [] },
			]),
		);

		expect(result.ok && result.hits).toContainEqual({ type: 'google_api_key', value: key });
	});

	// One document delimits the key unambiguously, another cannot. Whichever is
	// merged last, the delimited occurrence is the one that knows the extent.
	it('lets a delimited occurrence override a blocked one from another document', () => {
		const key = `ghp_${'B'.repeat(36)}`;
		const run = 'x'.repeat(600);
		const result = analyzeHtmlSensitivity(
			probe(`<p>${run}${key}${run}</p>`, [
				{ kind: 'iframe', html: `<p>${key}</p>`, children: [], errors: [] },
			]),
		);
		const hit = result.ok && result.hits.find((candidate) => candidate.value === key);

		expect(hit).toBeTruthy();
		expect(hit && hit.captureBlocked).toBeUndefined();
	});

	// The entropy pass needs the same fail-closed rule as the pattern pass: inside
	// an undelimitable run its candidate is a fragment of the real token.
	it('blocks capture of an entropy candidate whose token could not be delimited', () => {
		const blob = 'aB3xY9zQ7wE2rT5yU8iO1pL4kJ6hG0fD'.repeat(20);
		const key = `AQ.${'Zt7vLpQ9mKdW4xR2bNfH3jEuXaGoT5wPqYs1Bc'}`;
		const result = analyzeHtmlSensitivity(
			probe(`<div data-testid="api-key">${blob}${key}${blob}</div>`),
		);
		const hit = result.ok && result.hits.find((candidate) => candidate.type === 'secret');

		expect(hit).toBeTruthy();
		expect(hit && hit.captureBlocked).toBeTruthy();
	});

	// A key split across siblings is only visible in concatenated `textContent`,
	// and redaction cannot replace it there — but the page must still count as
	// sensitive, which is what gates screenshots.
	it('still flags a page whose key only appears in concatenated markup', () => {
		const result = analyzeHtmlSensitivity(
			probe(`<p><span>AQ.</span><span>${'AbCdEfGhIj'.repeat(3)}Ab</span></p>`),
		);

		expect(result.ok && result.sensitive).toBe(true);
	});

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
		const secret = HEX_SECRET;
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
		const secret = HEX_SECRET;
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

	// A console issues a credential as static text beside its label, with no input
	// to key off. These shapes clear no entropy bar, so the label is the evidence.
	it.each([
		{
			named: 'a dt label',
			value: HEX_SECRET,
			html: `<dl><dt>Client Secret</dt><dd>${HEX_SECRET}</dd></dl>`,
		},
		{
			named: 'its own test id, below the entropy bar the test-id pass applies',
			value: HEX_SECRET,
			html: `<dl><dt>Issued</dt><dd data-testid="client-secret">${HEX_SECRET}</dd></dl>`,
		},
		{
			named: 'a two-word label ending in a different credential noun',
			value: HEX_SECRET,
			html: `<dl><dt>Secret Key</dt><dd>${HEX_SECRET}</dd></dl>`,
		},
		{
			named: 'a label, sharing the cell with a copy button',
			value: DOTTED_SECRET,
			html: `<dl><dt>Client Secret</dt><dd>${DOTTED_SECRET} <button>Copy</button></dd></dl>`,
		},
	])('finds a static value named as a secret by $named', ({ html, value }) => {
		const result = analyzeHtmlSensitivity(probe(html));

		expect(result.ok && result.hits).toContainEqual({ type: 'password', value });
	});

	// Neither spelling of a split value may become a credential: the joined form
	// appears nowhere in what the model reads, and the rendered form is a fragment
	// of it. Asserted exactly — `toContainEqual` would hide the second hit.
	it('blocks capture of a secret split across inline elements', () => {
		const result = analyzeHtmlSensitivity(
			probe(
				'<dl><dt>Client Secret</dt><dd><span>AQI.</span>' +
					`<span>${DOTTED_SECRET.slice(4)}</span></dd></dl>`,
			),
		);

		expect(result.ok && result.hits).toEqual([
			{ type: 'password', value: DOTTED_SECRET.slice(4), captureBlocked: PARTIAL_TOKEN },
			{ type: 'password', value: DOTTED_SECRET, captureBlocked: CONCATENATED_ONLY },
		]);
	});

	// Inline children run together into a token that exists nowhere on the page.
	it('blocks capture of a token only the concatenated markup produces', () => {
		const result = analyzeHtmlSensitivity(
			probe(
				'<dl><dt>Client Secret</dt><dd><span>Rotated</span>' +
					'<span>quarterly</span><span>by ops</span></dd></dl>',
			),
		);

		expect(result.ok && result.hits).toEqual([
			{ type: 'password', value: 'Rotatedquarterlyby', captureBlocked: CONCATENATED_ONLY },
		]);
	});

	// A field name long enough to clear the length floor is masked with the value,
	// but capturing it would store the name as the credential. The name must be
	// long enough here or the length floor hides the rule being tested.
	it('blocks capture of the name side of an assignment', () => {
		const result = analyzeHtmlSensitivity(
			probe(`<dl><dt>Client Secret</dt><dd>GOOGLE_CLIENT_SECRET=${HEX_SECRET}</dd></dl>`),
		);

		expect(result.ok && result.hits).toEqual([
			{ type: 'password', value: 'GOOGLE_CLIENT_SECRET=', captureBlocked: ASSIGNMENT_NAME },
			{ type: 'password', value: HEX_SECRET },
		]);
	});

	it('blocks capture of an assignment name separated by whitespace', () => {
		const result = analyzeHtmlSensitivity(
			probe(`<dl><dt>Client Secret</dt><dd>GOOGLE_CLIENT_SECRET = ${HEX_SECRET}</dd></dl>`),
		);

		expect(result.ok && result.hits).toEqual([
			{ type: 'password', value: 'GOOGLE_CLIENT_SECRET', captureBlocked: ASSIGNMENT_NAME },
			{ type: 'password', value: HEX_SECRET },
		]);
	});

	// Base64 padding also ends on `=` but separates nothing, so it stays capturable.
	it('still captures a padded base64 value sharing the cell with other text', () => {
		const value = 'dGhpc2lzbm90YXJlYWxzZWNyZXQ==';
		const result = analyzeHtmlSensitivity(
			probe(`<dl><dt>Client Secret</dt><dd>${value} copy</dd></dl>`),
		);

		expect(result.ok && result.hits).toEqual([{ type: 'password', value }]);
	});

	// The credential flow needs the public identifier that sits beside the
	// secret; redacting the whole block would break the thing this protects.
	it('does not flag the public identifier beside a secret in the same list', () => {
		const clientId = '553213193971.11823370532599';
		const result = analyzeHtmlSensitivity(
			probe(
				`<dl><dt>Client ID</dt><dd>${clientId}</dd>` +
					`<dt>Client Secret</dt><dd>${HEX_SECRET}</dd></dl>`,
			),
		);

		expect(result.ok && result.hits).toEqual([{ type: 'password', value: HEX_SECRET }]);
	});

	// A credential noun trailed by a qualifier describes the credential rather
	// than being it, and a commit SHA is entropy-identical to a hex secret — so
	// only the label can tell them apart. Masks carry nothing to leak.
	it.each([
		{
			named: 'a qualifier turns the label into a description (timestamp)',
			html: '<dl><dt>Token expiry</dt><dd>Expires 2026-01-01T00:00:00.000Z</dd></dl>',
		},
		{
			named: 'a qualifier turns the label into a description (docs link)',
			html: '<dl><dt>API key docs</dt><dd>https://docs.example.com/api-keys</dd></dl>',
		},
		{
			named: 'a qualifier turns the label into a description (commit sha)',
			html: '<dl><dt>Token commit</dt><dd>9f4e2a1c8b7d6e5f0a3b2c1d4e5f6a7b8c9d0e1f</dd></dl>',
		},
		{
			named: 'the value is a mask rather than a secret',
			html: '<dl><dt>Client Secret</dt><dd>••••••••••••••••••••</dd></dl>',
		},
	])('does not flag a cell where $named', ({ html }) => {
		const result = analyzeHtmlSensitivity(probe(html));

		expect(result.ok && result.hits).toEqual([]);
	});

	// One reject case stays at pipeline level: it is the only proof that the label
	// sources are judged separately rather than joined.
	it('does not treat an id qualified by another attribute as naming a secret', () => {
		const result = analyzeHtmlSensitivity(
			probe(
				'<dl><dt>Issued</dt><dd id="token-expiry" data-testid="row">2026-01-01T00:00:00.000Z</dd></dl>',
			),
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
