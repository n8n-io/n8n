import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';

const MAX_DOC_TEXT = 20_000;

// The text of the structural elements: paragraphs, and the cells of tables and tables of contents.
function textOfElements(elements: unknown): string {
	if (!Array.isArray(elements)) return '';
	return elements
		.map((element) => {
			if (!isRecord(element)) return '';
			if (isRecord(element.paragraph)) {
				const runs = Array.isArray(element.paragraph.elements) ? element.paragraph.elements : [];
				return runs
					.map((run) =>
						isRecord(run) && isRecord(run.textRun) && typeof run.textRun.content === 'string'
							? run.textRun.content
							: '',
					)
					.join('');
			}
			if (isRecord(element.table)) {
				const rows = Array.isArray(element.table.tableRows) ? element.table.tableRows : [];
				return rows
					.flatMap((row) => (isRecord(row) && Array.isArray(row.tableCells) ? row.tableCells : []))
					.map((cell) => (isRecord(cell) ? textOfElements(cell.content) : ''))
					.join('');
			}
			return isRecord(element.tableOfContents)
				? textOfElements(element.tableOfContents.content)
				: '';
		})
		.join('');
}

/** Adds `plainText` to a document: the text of its paragraphs, so that the model can copy it. */
export function enrichGoogleDocs(json: unknown): unknown {
	if (Array.isArray(json)) return json.map(enrichGoogleDocs);
	if (!isRecord(json) || !isRecord(json.body) || !Array.isArray(json.body.content)) return json;
	// The last paragraph of a document always ends in a line break. The gym adds it again.
	const text = textOfElements(json.body.content).replace(/\n$/, '');
	return { ...json, plainText: text.slice(0, MAX_DOC_TEXT) };
}

// Only these fields of a seeded document reach the gym. A folder or an owner ref that the gym lacks
// would fail the seed, and the gym has one account.
const DOC_FIELDS = ['ref', 'id', 'name', 'mimeType', 'content'];

export function withPlainDocuments(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	const drive = native && isRecord(native.google_drive) ? native.google_drive : undefined;
	if (!native || !drive) return overlay;
	const files = (Array.isArray(drive.files) ? drive.files : []).flatMap((file) =>
		isRecord(file)
			? [Object.fromEntries(Object.entries(file).filter(([key]) => DOC_FIELDS.includes(key)))]
			: [],
	);
	return { ...overlay, native: { ...native, google_drive: { files } } };
}

// `/v1/documents/<id>` and `/v1/documents/<id>:batchUpdate`. A Google id is letters, digits, `-` and `_`.
const DOC_PATH = /^\/v1\/documents\/([A-Za-z0-9_-]{1,128})(?::[A-Za-z]+)?$/;

const docIdOf = (path: string): string | undefined => DOC_PATH.exec(path)?.[1];

// The Docs gym is the Drive gym of ai-gym (service "google-drive"). The Drive vendor owns the Drive paths of the node.
export const GOOGLE_DOCS_PROFILE: HttpVendorProfile = {
	name: 'googledocs',
	gymService: 'google-drive',
	opaqueIds: true,
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: 'guard@unknown.invalid' },
	},
	enrich: enrichGoogleDocs,
	finalize: withPlainDocuments,
	lookups: (tool, args) => {
		// A change of a document needs that document in the gym. A get costs one read of the real service.
		const id = tool.startsWith('write_') ? docIdOf(String(args.path)) : undefined;
		return id === undefined
			? []
			: [{ tool: 'read_get_documents', args: { method: 'GET', path: `/v1/documents/${id}` } }];
	},
	// A document that the gym made (a new one) is in the gym already.
	hydrateWrite: (args, gymIds) => {
		const id = docIdOf(args.path);
		return id !== undefined && !gymIds.has(id);
	},
};
