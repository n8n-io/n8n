import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `v-n8n-html` renders the text of ten components. A consumer that does not
 * install `N8nPlugin` used to get an empty element, with no error and no
 * console warning in a production build — the package's most basic path
 * failing in silence.
 *
 * The fix is local registration: the component imports the directive, so the
 * import graph carries it and no consumer can miss it. This test keeps that
 * true for every component added later.
 */

// vitest runs with the package root as cwd; import.meta.url is an http URL under jsdom.
const SRC = join(process.cwd(), 'src');

const LOCAL_REGISTRATION = "import { n8nHtml as vN8nHtml } from '<relative>/directives';";

const vueFilesUnder = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return vueFilesUnder(path);
		return entry.name.endsWith('.vue') ? [path] : [];
	});

const scriptOf = (source: string) => source.slice(0, source.indexOf('<template'));

describe('v-n8n-html registration', () => {
	const users = vueFilesUnder(SRC)
		.map((path) => ({ path, source: readFileSync(path, 'utf8') }))
		.filter(({ source }) => source.includes('v-n8n-html'));

	it('finds the components that use the directive', () => {
		// Guards the walker itself: an empty list would make the check below vacuous.
		expect(users.length).toBeGreaterThan(0);
	});

	it.each(users.map(({ path, source }) => [path.slice(SRC.length + 1), source]))(
		'%s registers the directive locally',
		(relativePath, source) => {
			expect(
				scriptOf(source).includes('vN8nHtml'),
				`${relativePath} uses v-n8n-html but does not register it.\n` +
					'Without local registration the element renders empty for any consumer that ' +
					'did not install N8nPlugin, with no error.\n' +
					`Add to the script block: ${LOCAL_REGISTRATION}`,
			).toBe(true);
		},
	);
});
