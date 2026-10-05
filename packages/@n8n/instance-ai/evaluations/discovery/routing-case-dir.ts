// ---------------------------------------------------------------------------
// Reads the routing cases in a `--cases-dir`.
//
// The directory can hold two formats:
// - routing case files (`route-*.json`, see routing/loader.ts), and
// - LangTracer suite-export case bodies, which have a `routing` entry in
//   `tags`. The LangTracer dispatcher writes one such body for each run.
//
// An export body carries no case id unless it has a `name`, so its id is the
// file name without `.json`. Other JSON files (results, notes) are skipped.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { ROUTING_TAG, routingCaseJsonFromExport } from '../routing/langtracer-cases';
import {
	isRoutingCaseSelected,
	narrowToExactMatch,
	parseRoutingCase,
	toDiscoveryScenario,
	type LoadedRoutingCase,
	type RoutingCase,
	type RoutingCaseSelection,
} from '../routing/loader';

const AUTHORED_FILE_PREFIX = 'route-';

export function isRoutingExportBody(raw: unknown): raw is Record<string, unknown> {
	return isRecord(raw) && Array.isArray(raw.tags) && raw.tags.includes(ROUTING_TAG);
}

/** The case id of an export body: its `name`, else the file name. */
function exportBodyId(body: Record<string, unknown>, fileName: string): string {
	return typeof body.name === 'string' && body.name.trim() ? body.name.trim() : fileName;
}

type FileOutcome = { routingCase: RoutingCase } | { error: string } | { skip: true };

function readCaseFile(
	filePath: string,
	fileName: string,
	selection: RoutingCaseSelection,
): FileOutcome {
	const authored = fileName.startsWith(AUTHORED_FILE_PREFIX);
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (error) {
		// Unreadable JSON is an error only for a selected case file; anything else is not a case.
		if (!authored || !isRoutingCaseSelected(fileName, selection)) return { skip: true };
		return { error: `${filePath}: ${error instanceof Error ? error.message : String(error)}` };
	}

	if (isRoutingExportBody(raw)) {
		const id = exportBodyId(raw, fileName);
		if (!isRoutingCaseSelected(id, selection) && !isRoutingCaseSelected(fileName, selection)) {
			return { skip: true };
		}
		const rebuilt = routingCaseJsonFromExport(id, raw);
		if (!rebuilt.success) return { error: `${filePath}: ${rebuilt.issues.join('; ')}` };
		const parsed = parseRoutingCase(rebuilt.json, { imported: true });
		if (!parsed.success) return { error: `${filePath}: ${parsed.issues.join('; ')}` };
		return { routingCase: parsed.data };
	}

	if (!authored || !isRoutingCaseSelected(fileName, selection)) return { skip: true };
	const parsed = parseRoutingCase(raw);
	if (!parsed.success) return { error: `${filePath}: ${parsed.issues.join('; ')}` };
	if (parsed.data.id !== fileName) {
		return { error: `${filePath}: id "${parsed.data.id}" must match the file name "${fileName}"` };
	}
	return { routingCase: parsed.data };
}

/**
 * Loads the selected cases of `dir`, sorted by file name. All invalid files
 * are reported in one error, like `loadRoutingCases`.
 */
export function loadRoutingCaseDir(
	dir: string,
	selection: RoutingCaseSelection = {},
): LoadedRoutingCase[] {
	const root = resolve(dir);
	const files = readdirSync(root)
		.filter((file) => file.endsWith('.json'))
		.sort();

	const loaded: LoadedRoutingCase[] = [];
	const errors: string[] = [];
	const seenIds = new Map<string, string>();
	for (const file of files) {
		const fileName = basename(file, '.json');
		const outcome = readCaseFile(join(root, file), fileName, selection);
		if ('skip' in outcome) continue;
		if ('error' in outcome) {
			errors.push(outcome.error);
			continue;
		}
		const { routingCase } = outcome;
		const previous = seenIds.get(routingCase.id);
		if (previous) {
			errors.push(`${join(root, file)}: id "${routingCase.id}" is also used by ${previous}.json`);
			continue;
		}
		seenIds.set(routingCase.id, fileName);
		loaded.push({ routingCase, scenario: toDiscoveryScenario(routingCase), fileName });
	}

	if (errors.length > 0) {
		throw new Error(
			`Invalid routing case(s) in ${root}:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		);
	}
	return narrowToExactMatch(loaded, selection.filter);
}
