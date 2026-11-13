/**
 * Workflow static data in the host (spec 9.7 of workflow-lang).
 *
 * A step frame whose args have `staticData: true` carries the execution's
 * static data as `$staticData`: `{ global?: {...}, "node:<name>"?: {...} }`,
 * the shape of n8n's `workflow.staticData`. The step reads and changes it
 * as n8n nodes do (`this.getWorkflowStaticData('global' | 'node')`). When
 * the step changed it, the reply carries the new document as `staticData`,
 * and the runtime keeps it for the execution.
 *
 * n8n nodes reach static data through `Workflow.getStaticData`. The host
 * runs many steps at a time in one process, so each step's document lives
 * in an async context, and `Workflow.prototype.getStaticData` reads it from
 * there. Outside such a context the method works as before (an empty
 * object for each Workflow, which is not saved).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { IDataObject, INode } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import type { JsonObject, JsonValue } from './protocol';

interface StaticScope {
	doc: IDataObject;
}

const scope = new AsyncLocalStorage<StaticScope>();
let installed = false;

const isObject = (v: JsonValue | undefined): v is JsonObject =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isDataObject = (v: unknown): v is IDataObject =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/** The static data that a frame sends, or undefined when the step does not take it. */
export function staticDataOf(args: JsonObject): JsonObject | undefined {
	if (args.staticData !== true) return undefined;
	const doc = args.$staticData;
	return isObject(doc) ? doc : {};
}

/** The key of n8n's `workflow.staticData` for a context type, as `Workflow.getStaticData` makes it. */
export function staticKey(type: string, nodeName: string): string {
	if (type === 'global') return 'global';
	if (type === 'node') return `node:${nodeName}`;
	throw new Error('Unknown context type. Only `global` and `node` are supported.');
}

/** Makes `Workflow.getStaticData` read the document of the running step. */
export function installStaticData(): void {
	if (installed) return;
	installed = true;
	const original = Workflow.prototype.getStaticData;
	Workflow.prototype.getStaticData = function (this: Workflow, type: string, node?: INode) {
		const current = scope.getStore();
		if (!current) {
			const own: unknown = Reflect.apply(original, this, [type, node]);
			return isDataObject(own) ? own : {};
		}
		if (type === 'node' && node === undefined) {
			throw new Error('The request data of context type "node" the node parameter has to be set!');
		}
		const key = staticKey(type, node?.name ?? '');
		const existing = current.doc[key];
		if (isDataObject(existing)) return existing;
		const fresh: IDataObject = {};
		current.doc[key] = fresh;
		return fresh;
	};
}

/**
 * Runs a step with its static data. Returns the document when the step
 * changed it (compared as JSON, as the runtime compares it), else undefined.
 */
export async function withStaticData<T>(
	doc: JsonObject | undefined,
	run: () => Promise<T>,
): Promise<{ value: T; staticData?: JsonObject }> {
	if (doc === undefined) return { value: await run() };
	installStaticData();
	const before = JSON.stringify(doc);
	const working: IDataObject = JSON.parse(before);
	const value = await scope.run({ doc: working }, run);
	const after = JSON.stringify(working);
	if (after === before) return { value };
	const changed: JsonObject = JSON.parse(after);
	return { value, staticData: changed };
}

/**
 * Replaces the document of the running step: a code step changes a copy in
 * its own context and gives the whole document back.
 */
export function replaceStaticData(doc: JsonObject): void {
	const current = scope.getStore();
	if (!current) return;
	for (const key of Object.keys(current.doc)) delete current.doc[key];
	Object.assign(current.doc, doc);
}
