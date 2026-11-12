/**
 * Copies the Linux screenshots from a downloaded `visual-test-diffs` artifact
 * into the design system as reference images.
 *
 * Usage: pnpm --filter @n8n/storybook test:visual:accept <artifact dir>
 *
 * The artifact has the layout of `.vitest/visual/`:
 *   <story dir>/<story file>/<name>-reference-chromium-linux.png  (new reference)
 *   <story dir>/<story file>/<name>-actual-chromium-linux.png     (changed reference)
 * `<story dir>` is relative to `design-system/src`. Each image goes to
 *   design-system/src/<story dir>/__screenshots__/<story file>/<name>-chromium-linux.png
 * Diff images and other files stay where they are.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const designSystemSrc = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../design-system/src',
);
const IMAGE_NAME = /^(?<name>.+)-(?:reference|actual)-(?<suffix>chromium-linux\.png)$/;

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

const [artifactArg] = process.argv.slice(2);
if (!artifactArg) {
	fail('Usage: pnpm --filter @n8n/storybook test:visual:accept <artifact dir>');
}

// `pnpm --filter` runs the script in this package, so resolve against the caller's directory.
const artifactDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), artifactArg);
if (!existsSync(artifactDir) || !statSync(artifactDir).isDirectory()) {
	fail(`Not a directory: ${artifactDir}`);
}

const copies = new Map<string, string>();
for (const entry of readdirSync(artifactDir, { recursive: true, withFileTypes: true })) {
	const match = entry.isFile() ? IMAGE_NAME.exec(entry.name) : null;
	if (!match?.groups) continue;

	const source = path.join(entry.parentPath, entry.name);
	const storyFileDir = path.relative(artifactDir, entry.parentPath);
	const storyDir = path.dirname(storyFileDir);
	const storyFile = path.basename(storyFileDir);
	const storyPath = path.resolve(designSystemSrc, storyDir, storyFile);
	if (!storyPath.startsWith(designSystemSrc + path.sep) || !existsSync(storyPath)) {
		fail(`${source}: no story file at ${storyPath}. Pass the root of the artifact.`);
	}

	const target = path.join(
		designSystemSrc,
		storyDir,
		'__screenshots__',
		storyFile,
		`${match.groups.name}-${match.groups.suffix}`,
	);
	if (copies.has(target)) {
		fail(`${source} and ${copies.get(target)} both give ${target}.`);
	}
	copies.set(target, source);
}

if (copies.size === 0) {
	fail(`No *-reference-chromium-linux.png or *-actual-chromium-linux.png files in ${artifactDir}.`);
}

for (const [target, source] of copies) {
	mkdirSync(path.dirname(target), { recursive: true });
	copyFileSync(source, target);
	console.log(path.relative(process.cwd(), target));
}
console.log(`Accepted ${copies.size} reference image(s).`);
