import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

function latestVersion(version: unknown): number {
	if (typeof version === 'number') return version;
	if (!Array.isArray(version)) return 0;
	return Math.max(0, ...version.filter((value): value is number => typeof value === 'number'));
}

/** Names whose highest-version description is `hidden`, read as the frontend reads them. */
export function hiddenNodeTypeNames(descriptions: unknown): Set<string> {
	if (!Array.isArray(descriptions)) return new Set();

	const latest = new Map<string, { version: number; hidden: boolean }>();
	for (const description of descriptions) {
		if (!isRecord(description) || typeof description.name !== 'string') continue;
		const name = description.name;

		const current = latest.get(name);
		const version = latestVersion(description.version);
		if (current && current.version >= version) continue;
		latest.set(name, { version, hidden: description.hidden === true });
	}

	return new Set([...latest].flatMap(([name, { hidden }]) => (hidden ? [name] : [])));
}

/**
 * Reads the static `types/nodes.json`, the file the editor reads. The in-memory descriptions are
 * not usable here: a main process releases them after startup. A failed read fails the caller,
 * as the editor shows no counts rather than wrong ones.
 */
@Service()
export class HiddenNodeTypes {
	/** The file is large and rarely rewritten, so it is parsed again only when it changes. */
	private cache: { names: Promise<ReadonlySet<string>>; modifiedAt: number } | null = null;

	constructor(private readonly instanceSettings: InstanceSettings) {}

	async get(): Promise<ReadonlySet<string>> {
		const filePath = path.join(this.instanceSettings.staticCacheDir, 'types/nodes.json');
		const modifiedAt = (await stat(filePath)).mtimeMs;
		if (this.cache?.modifiedAt === modifiedAt) return await this.cache.names;

		const cache = { names: this.read(filePath), modifiedAt };
		this.cache = cache;
		cache.names.catch(() => {
			if (this.cache === cache) this.cache = null;
		});
		return await cache.names;
	}

	private async read(filePath: string): Promise<ReadonlySet<string>> {
		return hiddenNodeTypeNames(jsonParse<unknown>(await readFile(filePath, 'utf-8')));
	}
}
