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

/** Every `<script>` block, in either block order, so a template-first SFC is read too. */
const scriptOf = (source: string) =>
	[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(([, body]) => body).join('\n');

/** `://` is excluded so a URL in a string is not mistaken for a line comment. */
const withoutComments = (script: string) =>
	script.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * The name must be bound by a real `import ... from '...'`. A mention in a comment
 * or a commented-out import does not register anything, so neither may pass.
 */
export const registersDirective = (source: string) =>
	/\bimport\b[^;]*\bvN8nHtml\b[^;]*\bfrom\b\s*['"][^'"]+['"]/.test(
		withoutComments(scriptOf(source)),
	);

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
				registersDirective(source),
				`${relativePath} uses v-n8n-html but does not register it.\n` +
					'Without local registration the element renders empty for any consumer that ' +
					'did not install N8nPlugin, with no error.\n' +
					`Add to the script block: ${LOCAL_REGISTRATION}`,
			).toBe(true);
		},
	);
});

describe('registersDirective', () => {
	const IMPORT = "import { n8nHtml as vN8nHtml } from '../../directives';";
	const TEMPLATE = '<template><span v-n8n-html="text" /></template>';

	it.each([
		['script first', `<script setup lang="ts">\n${IMPORT}\n</script>\n${TEMPLATE}`],
		['template first', `${TEMPLATE}\n<script setup lang="ts">\n${IMPORT}\n</script>`],
		[
			'two script blocks',
			`<script lang="ts">\nexport default {};\n</script>\n<script setup lang="ts">\n${IMPORT}\n</script>\n${TEMPLATE}`,
		],
		[
			'multi-line import',
			`<script setup lang="ts">\nimport {\n\tn8nHtml as vN8nHtml,\n} from '../../directives';\n</script>\n${TEMPLATE}`,
		],
	])('accepts a real import (%s)', (_name, source) => {
		expect(registersDirective(source)).toBe(true);
	});

	it.each([
		['no script block', TEMPLATE],
		['line-commented import', `<script setup lang="ts">\n// ${IMPORT}\n</script>\n${TEMPLATE}`],
		['block-commented import', `<script setup lang="ts">\n/* ${IMPORT} */\n</script>\n${TEMPLATE}`],
		[
			'a mention of the name only',
			`<script setup lang="ts">\n// TODO: register vN8nHtml here later\n</script>\n${TEMPLATE}`,
		],
	])('rejects a non-import (%s)', (_name, source) => {
		expect(registersDirective(source)).toBe(false);
	});

	it('is not fooled by a URL in a string', () => {
		const source = `<script setup lang="ts">\nconst docs = 'https://n8n.io';\n${IMPORT}\n</script>\n${TEMPLATE}`;
		expect(registersDirective(source)).toBe(true);
	});
});
