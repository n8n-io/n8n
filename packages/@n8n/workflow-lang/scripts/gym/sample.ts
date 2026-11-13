/**
 * The sample of `scripts/convert-coverage.ts`: every workflow in the JSON
 * files that git tracks under `packages/`. It also finds the trigger that
 * the converter keeps and resolves sub-workflow ids, with the same rules.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const repoRoot = join(packageRoot, '..', '..', '..');

export type JsonRecord = Record<string, unknown>;

export function isRecord(v: unknown): v is JsonRecord {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface SampleNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: JsonRecord;
	credentials?: Record<string, { id?: string | null; name?: string }>;
	disabled?: boolean;
}

export interface Sample {
	/** `<file>#<index>`: a stable key for logs and the report. */
	key: string;
	file: string;
	index: number;
	workflow: JsonRecord;
}

function workflows(doc: unknown, out: JsonRecord[] = []): JsonRecord[] {
	if (Array.isArray(doc)) {
		for (const d of doc) workflows(d, out);
	} else if (isRecord(doc)) {
		const nodes = doc.nodes;
		if (
			Array.isArray(nodes) &&
			nodes.length > 0 &&
			nodes.every((n) => isRecord(n) && typeof n.type === 'string')
		) {
			out.push(doc);
		} else {
			for (const v of Object.values(doc)) workflows(v, out);
		}
	}
	return out;
}

export function collectSample(): Sample[] {
	const list = execFileSync('git', ['ls-files', '--', 'packages/**/*.json'], {
		cwd: repoRoot,
		encoding: 'utf8',
	})
		.split('\n')
		.filter((f) => f && !f.includes('node_modules') && !f.includes('/dist/'));
	const samples: Sample[] = [];
	for (const file of list) {
		let text: string;
		try {
			text = readFileSync(join(repoRoot, file), 'utf8');
		} catch {
			continue;
		}
		if (!text.includes('"nodes"')) continue;
		let doc: unknown;
		try {
			doc = JSON.parse(text);
		} catch {
			continue;
		}
		workflows(doc).forEach((workflow, index) =>
			samples.push({ key: `${file}#${index}`, file, index, workflow }),
		);
	}
	return samples;
}

export function nodesOf(wf: JsonRecord): SampleNode[] {
	return (Array.isArray(wf.nodes) ? wf.nodes : []).filter(
		(n): n is SampleNode => isRecord(n) && typeof n.name === 'string' && typeof n.type === 'string',
	);
}

function isTriggerType(type: string): boolean {
	return (
		type === 'n8n-nodes-base.webhook' || /trigger$/i.test(type) || type === 'n8n-nodes-base.start'
	);
}

/** The node names that a connection reaches. */
export function connectionTargets(wf: JsonRecord): Set<string> {
	const targets = new Set<string>();
	const conns = isRecord(wf.connections) ? wf.connections : {};
	for (const types of Object.values(conns)) {
		if (!isRecord(types)) continue;
		for (const outputs of Object.values(types)) {
			if (!Array.isArray(outputs)) continue;
			for (const list of outputs) {
				if (!Array.isArray(list)) continue;
				for (const c of list) if (isRecord(c) && typeof c.node === 'string') targets.add(c.node);
			}
		}
	}
	return targets;
}

/** The trigger that the converter keeps: a webhook, else a schedule, else the first trigger. */
export function mainTrigger(wf: JsonRecord): SampleNode | undefined {
	const targets = connectionTargets(wf);
	const triggers = nodesOf(wf).filter((n) => isTriggerType(n.type) && !targets.has(n.name));
	const rank = (n: SampleNode) =>
		n.disabled
			? 3
			: n.type === 'n8n-nodes-base.webhook'
				? 0
				: n.type === 'n8n-nodes-base.scheduleTrigger'
					? 1
					: 2;
	return [...triggers].sort((a, b) => rank(a) - rank(b))[0];
}

/** Resolves Execute Workflow ids as `scripts/convert-coverage.ts` does. */
export function resolverFor(
	sample: Sample,
	byId: Map<string, JsonRecord>,
): (id: string) => JsonRecord | undefined {
	const seen = new Map<string, JsonRecord | undefined>();
	const dir = dirname(join(repoRoot, sample.file));
	const own = basename(sample.file);
	return (id: string) => {
		if (seen.has(id)) return seen.get(id);
		let found = byId.get(id);
		const file = join(dir, `${id}.json`);
		if (found === undefined && /^[\w-]+$/.test(id) && existsSync(file)) {
			try {
				found = workflows(JSON.parse(readFileSync(file, 'utf8')))[0];
			} catch {
				found = undefined;
			}
		}
		if (found === undefined && own.includes('parent')) {
			const prefix = own.slice(0, own.indexOf('parent'));
			const child = readdirSync(dir)
				.filter((f) => f.startsWith(`${prefix}child`) && f.endsWith('.json'))
				.sort()[0];
			if (child) found = workflows(JSON.parse(readFileSync(join(dir, child), 'utf8')))[0];
		}
		seen.set(id, found);
		return found;
	};
}

export function idIndex(samples: Sample[]): Map<string, JsonRecord> {
	const byId = new Map<string, JsonRecord>();
	for (const s of samples) {
		const id = s.workflow.id;
		if ((typeof id === 'string' || typeof id === 'number') && !byId.has(String(id)))
			byId.set(String(id), s.workflow);
	}
	return byId;
}
