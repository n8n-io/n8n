import type { ExternalSkillPlugin, SkillSourceGroup } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { posix } from 'node:path';
import { z } from 'zod';

import { ancestorsOf, isInside } from './skill-discovery';

const nameSchema = z.string().trim().min(1).max(128);
const pluginSchema = z.object({
	name: nameSchema,
	skills: z.union([z.string(), z.array(z.string())]).optional(),
});
const marketplaceSchema = z.object({
	plugins: z.array(z.unknown()),
	metadata: z.object({ pluginRoot: z.string().optional() }).optional(),
});

type Plugin = SkillSourceGroup & { roots: string[] };
type PluginDiscovery = {
	groups: (SkillSourceGroup & { paths: string[] })[];
	groupingWarnings: string[];
	externalPlugins: ExternalSkillPlugin[];
};

/** Only these files supply grouping metadata. Other plugin parts are never read. */
export function isPluginManifest(path: string): boolean {
	return /(?:^|\/)(?:(?:\.claude-plugin|\.cursor-plugin)\/(?:marketplace|plugin)\.json|plugin\.json)$/.test(
		path,
	);
}

/** Paths stay inside the manifest's root. A manifest cannot widen the pasted folder. */
function localPath(root: string, path: string): string | undefined {
	if (!path || path.startsWith('/') || /[\\:*?]|\p{Cc}/u.test(path)) return undefined;
	if (path.split('/').includes('..')) return undefined;
	const joined = posix.join(root, path);
	return joined === '.' ? '' : joined;
}

/** Group the already discovered folders. Manifests never add or remove a skill. */
export function discoverPluginGroups(
	archive: { paths: string[]; text: Map<string, string> },
	folders: string[],
	root: string,
): PluginDiscovery {
	const plugins: Plugin[] = [];
	const warnings = new Set<string>();
	const externalPlugins: ExternalSkillPlugin[] = [];
	const manifests = archive.paths
		.filter((path) => isInside(path, root) && isPluginManifest(path))
		.filter(
			(path) =>
				!path
					.split('/')
					.some((part) => ['node_modules', '.git', 'vendor', 'third_party'].includes(part)),
		)
		.sort();

	function addPlugin(
		value: unknown,
		base: string,
		id: string,
		manifest: string,
		includeDefault: boolean,
	) {
		const parsed = pluginSchema.safeParse(value);
		if (!parsed.success) {
			warnings.add(manifest);
			return;
		}
		const { name, skills } = parsed.data;
		const paths =
			skills === undefined
				? [base]
				: (Array.isArray(skills) ? skills : [skills]).map((path) => localPath(base, path));
		if (paths.some((path) => path === undefined)) {
			warnings.add(manifest);
			return;
		}
		if (skills !== undefined && includeDefault) paths.push(posix.join(base, 'skills'));
		plugins.push({ id, name, roots: paths.filter((path) => path !== undefined) });
	}

	for (const manifest of manifests) {
		const parent = posix.dirname(manifest);
		const isCursorPlugin = posix.basename(parent) === '.cursor-plugin';
		const base = ['.claude-plugin', '.cursor-plugin'].includes(posix.basename(parent))
			? posix.dirname(parent)
			: parent;
		const manifestRoot = base === '.' ? '' : base;
		let value: unknown;
		try {
			const text = archive.text.get(manifest);
			if (text === undefined) {
				warnings.add(manifest);
				continue;
			}
			value = JSON.parse(text);
		} catch {
			warnings.add(manifest);
			continue;
		}
		if (!manifest.endsWith('/marketplace.json')) {
			// Cursor's explicit skill paths replace its default skills directory.
			addPlugin(value, manifestRoot, manifest, manifest, !isCursorPlugin);
			continue;
		}
		const marketplace = marketplaceSchema.safeParse(value);
		if (!marketplace.success) {
			warnings.add(manifest);
			continue;
		}
		for (const [index, entry] of marketplace.data.plugins.entries()) {
			if (!isRecord(entry) || !nameSchema.safeParse(entry.name).success) {
				warnings.add(manifest);
				continue;
			}
			const name = nameSchema.parse(entry.name);
			const source = entry.source;
			if (
				isRecord(source) &&
				typeof source.source === 'string' &&
				['github', 'url', 'git-subdir'].includes(source.source)
			) {
				externalPlugins.push({ name, manifestPath: manifest });
				continue;
			}
			const path =
				typeof source === 'string'
					? source
					: isRecord(source) && typeof source.path === 'string'
						? source.path
						: undefined;
			if (path === undefined) {
				warnings.add(manifest);
				continue;
			}
			const prefix = marketplace.data.metadata?.pluginRoot;
			// Claude's . and ./ sources are relative to the marketplace, not pluginRoot.
			const usePrefix =
				prefix !== undefined && (isCursorPlugin || (path !== '.' && !path.startsWith('./')));
			const sourceRoot = usePrefix ? localPath(manifestRoot, prefix) : manifestRoot;
			const pluginRoot = sourceRoot === undefined ? undefined : localPath(sourceRoot, path);
			if (pluginRoot === undefined || !isInside(pluginRoot, root)) {
				warnings.add(manifest);
				continue;
			}
			addPlugin(
				entry,
				pluginRoot,
				`${manifest}#${index}`,
				manifest,
				!isCursorPlugin && pluginRoot !== manifestRoot,
			);
		}
	}

	// A broken manifest leaves a flat picker. Never hide otherwise valid skills.
	if (warnings.size > 0) return { groups: [], groupingWarnings: [...warnings], externalPlugins };
	const pluginsByRoot = new Map<string, Plugin>();
	for (const plugin of plugins) {
		for (const path of plugin.roots) {
			if (!pluginsByRoot.has(path)) pluginsByRoot.set(path, plugin);
		}
	}
	const groups = new Map<string, SkillSourceGroup & { paths: string[] }>();
	for (const folder of folders) {
		// The nearest declaration wins. Each folder needs at most one lookup per ancestor.
		const match = [folder, ...ancestorsOf(folder).reverse()]
			.map((path) => pluginsByRoot.get(path))
			.find((plugin) => plugin !== undefined);
		if (!match) continue;
		const group = groups.get(match.id) ?? { id: match.id, name: match.name, paths: [] };
		group.paths.push(folder);
		groups.set(match.id, group);
	}
	return { groups: [...groups.values()], groupingWarnings: [], externalPlugins };
}
