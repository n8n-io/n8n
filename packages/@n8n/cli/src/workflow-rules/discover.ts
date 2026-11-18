import * as fs from 'node:fs';
import * as path from 'node:path';

/** A workflow file found in a repository, with the project whose rules apply to it. */
export interface DiscoveredWorkflow {
	readonly file: string;
	readonly workflow: Record<string, unknown> & { name: string; nodes: unknown[] };
	readonly projectId?: string;
}

export interface DiscoveryResult {
	readonly workflows: DiscoveredWorkflow[];
	/** JSON files that could not be read. Files that are not workflows are skipped silently. */
	readonly unreadable: Array<{ file: string; reason: string }>;
}

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', '.github', 'dist']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflow(
	value: unknown,
): value is Record<string, unknown> & { name: string; nodes: unknown[] } {
	return isRecord(value) && typeof value.name === 'string' && Array.isArray(value.nodes);
}

function collectJsonFiles(target: string, files: string[]): void {
	const stat = fs.statSync(target);
	if (stat.isFile()) {
		if (target.endsWith('.json')) files.push(target);
		return;
	}
	if (!stat.isDirectory()) return;
	for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
		if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
		collectJsonFiles(path.join(target, entry.name), files);
	}
}

/**
 * The n8n package layout keeps each project in `projects/<slug>-<id>/` with a `project.json`
 * that holds the id. Reading the file avoids parsing the escaped folder name.
 */
function projectIdFromPackageLayout(file: string, cache: Map<string, string | undefined>) {
	const segments = path.resolve(file).split(path.sep);
	const index = segments.lastIndexOf('projects');
	if (index === -1 || index + 1 >= segments.length - 1) return undefined;
	const projectDir = segments.slice(0, index + 2).join(path.sep);
	if (!cache.has(projectDir)) {
		let id: string | undefined;
		try {
			const project: unknown = JSON.parse(
				fs.readFileSync(path.join(projectDir, 'project.json'), 'utf-8'),
			);
			if (isRecord(project) && typeof project.id === 'string') id = project.id;
		} catch {
			id = undefined;
		}
		cache.set(projectDir, id);
	}
	return cache.get(projectDir);
}

/** The source control layout stores the owner on the workflow itself. */
function projectIdFromOwner(workflow: Record<string, unknown>): string | undefined {
	const { owner } = workflow;
	if (!isRecord(owner)) return undefined;
	if (owner.type === 'team' && typeof owner.teamId === 'string') return owner.teamId;
	if (owner.type === 'personal' && typeof owner.projectId === 'string') return owner.projectId;
	return undefined;
}

/**
 * Finds workflow JSON files under the given paths. Reads both git layouts that n8n writes:
 * source control (`workflows/<id>.json`) and n8n packages (`.../workflows/<slug>-<id>/workflow.json`).
 * Any other JSON file with a `name` and a `nodes` array counts too.
 */
export function discoverWorkflows(targets: string[]): DiscoveryResult {
	const files: string[] = [];
	for (const target of targets) collectJsonFiles(target, files);

	const workflows: DiscoveredWorkflow[] = [];
	const unreadable: DiscoveryResult['unreadable'] = [];
	const projectCache = new Map<string, string | undefined>();

	for (const file of [...new Set(files)].sort()) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
		} catch (error) {
			unreadable.push({ file, reason: error instanceof Error ? error.message : String(error) });
			continue;
		}
		if (!isWorkflow(parsed)) continue;
		workflows.push({
			file,
			workflow: parsed,
			projectId: projectIdFromOwner(parsed) ?? projectIdFromPackageLayout(file, projectCache),
		});
	}

	return { workflows, unreadable };
}
