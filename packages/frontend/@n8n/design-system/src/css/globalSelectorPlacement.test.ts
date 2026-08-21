import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `:global()` is a CSS-Modules construct. It is only transformed away in a
 * `<style module>` or `<style scoped>` block; anywhere else it survives into
 * the emitted CSS as an invalid pseudo-class, which browsers respond to by
 * dropping the whole rule (and lightningcss by warning). A standalone `.scss`
 * can't know which kind of block will `@use` it, so it must not use `:global()`
 * at all — the caller decides, and getting it wrong fails silently.
 */

const srcDir = resolve(process.cwd(), 'src');
const styleBlock = /<style\b([^>]*)>([\s\S]*?)<\/style>/g;

/** Only selectors matter here, so comments explaining this very rule shouldn't trip it. */
const usesGlobal = (source: string) =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|\s)\/\/.*$/gm, '$1')
		.includes(':global(');

const allFiles = readdirSync(srcDir, { recursive: true, encoding: 'utf8' });

const collect = (extension: string) => {
	const files = allFiles.filter((file) => file.endsWith(extension));
	// A wrong srcDir would make the assertions below vacuously pass.
	expect(files.length).toBeGreaterThan(0);
	return files.map((file) => [file, readFileSync(resolve(srcDir, file), 'utf8')] as const);
};

describe(':global() placement', () => {
	it('is not used in .vue style blocks that do not transform it', () => {
		const offenders: string[] = [];

		for (const [file, source] of collect('.vue')) {
			for (const [, attrs, body] of source.matchAll(styleBlock)) {
				const transformed = /\bmodule\b/.test(attrs) || /\bscoped\b/.test(attrs);
				if (!transformed && usesGlobal(body)) {
					offenders.push(`${file} — <style${attrs}>`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});

	it('is not used in standalone .scss files', () => {
		const offenders = collect('.scss')
			.filter(([, source]) => usesGlobal(source))
			.map(([file]) => file);

		expect(offenders).toEqual([]);
	});
});
