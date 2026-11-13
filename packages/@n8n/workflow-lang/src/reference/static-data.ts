/**
 * Workflow static data for the reference runner and the test VM (spec 9.7),
 * as the runtime gives it: `ctx.staticData('global' | 'node', name)` returns
 * the object of n8n's `$getWorkflowStaticData`, and the execution keeps the
 * document when it ends with `ok` or `error`.
 */
type Doc = Record<string, unknown>;

const isDoc = (v: unknown): v is Doc => typeof v === 'object' && v !== null && !Array.isArray(v);

export class StaticDataDoc {
	private doc: Doc | undefined;

	private readonly start: Doc | undefined;

	constructor(start: Doc | undefined) {
		this.start = start;
	}

	/** The object for a context type. Errors as the runtime throws them. */
	get(type: unknown, node: unknown): Doc {
		let key: string;
		if (type === 'global') key = 'global';
		else if (type === 'node') {
			if (typeof node !== 'string' || node === '') {
				throw new Error('The node name is missing for static data of type "node"');
			}
			if (node.length > 256) throw new Error('The node name is too long');
			key = `node:${node}`;
		} else {
			throw new Error('Unknown context type. Only `global` and `node` are supported.');
		}
		this.doc ??= this.start === undefined ? {} : structuredClone(this.start);
		const cur = this.doc[key];
		if (isDoc(cur)) return cur;
		const fresh: Doc = {};
		this.doc[key] = fresh;
		return fresh;
	}

	/** The document after the run: the working copy for `ok` and `error`, else the start. */
	final(status: string): Doc | undefined {
		if (this.start === undefined) return undefined;
		if (this.doc !== undefined && (status === 'ok' || status === 'error')) return this.doc;
		return this.start;
	}
}
