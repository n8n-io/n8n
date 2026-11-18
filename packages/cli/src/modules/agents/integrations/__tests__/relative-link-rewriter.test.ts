import { createRelativeLinkRewriter } from '../relative-link-rewriter';

const BASE = 'https://n8n.example.com';

/** Feeds the pieces through a fresh rewriter and returns the joined output. */
function run(pieces: string[], base = BASE): string {
	const rewriter = createRelativeLinkRewriter(base);
	return pieces.map((piece) => rewriter.write(piece)).join('') + rewriter.flush();
}

describe('createRelativeLinkRewriter', () => {
	it('adds the instance URL to a relative link', () => {
		expect(run(['See [Invoice Sync](/workflow/abc123) now'])).toBe(
			'See [Invoice Sync](https://n8n.example.com/workflow/abc123) now',
		);
	});

	it('handles several links in one piece', () => {
		expect(run(['[a](/workflow/1) and [b](/projects/p/datatables/2)'])).toBe(
			'[a](https://n8n.example.com/workflow/1) and [b](https://n8n.example.com/projects/p/datatables/2)',
		);
	});

	it.each([
		['before the bracket', ['[a', '](/workflow/1)']],
		['after the bracket', ['[a]', '(/workflow/1)']],
		['after the bracket and parenthesis', ['[a](', '/workflow/1)']],
		['after the slash', ['[a](/', 'workflow/1)']],
		['one character at a time', [...'[a](/workflow/1)']],
	])('rewrites a link that is split %s', (_name, pieces) => {
		expect(run(pieces)).toBe('[a](https://n8n.example.com/workflow/1)');
	});

	it('keeps absolute links', () => {
		expect(run(['[docs](https://docs.n8n.io/x)'])).toBe('[docs](https://docs.n8n.io/x)');
	});

	it('keeps protocol-relative links', () => {
		expect(run(['[x](//other.example.com/a)'])).toBe('[x](//other.example.com/a)');
		expect(run(['[x](/', '/other.example.com/a)'])).toBe('[x](//other.example.com/a)');
	});

	it('gives back held text when the text ends', () => {
		const rewriter = createRelativeLinkRewriter(BASE);
		expect(rewriter.write('end of text ](')).toBe('end of text ');
		expect(rewriter.flush()).toBe('](');
		expect(rewriter.flush()).toBe('');
	});

	it('does not double a trailing slash in the instance URL', () => {
		expect(run(['[a](/workflow/1)'], 'https://n8n.example.com/')).toBe(
			'[a](https://n8n.example.com/workflow/1)',
		);
	});

	it('keeps a base URL with a path prefix', () => {
		expect(run(['[a](/workflow/1)'], 'https://example.com/n8n')).toBe(
			'[a](https://example.com/n8n/workflow/1)',
		);
	});

	it('leaves text without links unchanged', () => {
		expect(run(['plain ', 'text ] ( here'])).toBe('plain text ] ( here');
	});
});
