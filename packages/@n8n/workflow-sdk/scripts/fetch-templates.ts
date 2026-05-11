/**
 * Fetch n8n.io public template catalog for criteria-driven curation.
 *
 * Two passes:
 *   Pass 1 (list)   – paginate the templates list endpoint, persist each page,
 *                     concat into examples/_raw/_catalog.json. Cheap metadata only.
 *   Pass 2 (detail) – per-id fetch of the full workflow JSON. Called by
 *                     regenerate-examples.ts only for candidates the rubric picks.
 *
 * Usage:
 *   pnpm fetch-templates              # full catalog walk (pass 1)
 *   pnpm fetch-templates --rebuild    # ignore cached pages, re-walk
 *
 * Both passes are resumable: existing files are skipped on rerun.
 */
import * as fs from 'fs';
import * as path from 'path';

const RAW_DIR = path.resolve(__dirname, '../examples/_raw');
const LIST_DIR = path.join(RAW_DIR, '_list');
const CATALOG_FILE = path.join(RAW_DIR, '_catalog.json');
const DETAIL_DIR = RAW_DIR;

// Search endpoint paginates correctly (api.n8n.io/api/templates/workflows ignores ?page=).
// Mirrors the working pattern in scripts/fetch-test-workflows.ts.
const LIST_URL = 'https://n8n.io/api/product-api/workflows/search';
const DETAIL_URL = 'https://api.n8n.io/api/workflows';

const ROWS_PER_PAGE = 200;
const RATE_LIMIT_MS = 200; // ~5 req/s
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 30_000;

export interface CatalogEntry {
	id: number;
	name: string;
	description?: string;
	totalViews: number;
	createdAt: string;
	user: { username: string; verified: boolean };
	price?: number | null;
	purchaseUrl: string | null;
	nodes: Array<{ name: string; group?: string; displayName?: string }>;
}

interface ListResponse {
	totalWorkflows: number;
	workflows: CatalogEntry[];
}

export interface DetailResponse {
	data: {
		id: number;
		attributes: {
			name: string;
			description: string;
			workflow: {
				nodes: Array<Record<string, unknown>>;
				connections: Record<string, unknown>;
				meta?: Record<string, unknown>;
				pinData?: Record<string, unknown>;
				settings?: Record<string, unknown>;
			};
			workflowInfo?: {
				nodeCount: number;
				nodeTypes: Record<string, { count: number }>;
			};
			createdAt: string;
			updatedAt: string;
			views: number;
			recentViews: number;
			hidden: boolean;
			username: string;
			status: string;
			price: number | null;
			difficulty: string | null;
			readyToDemo: boolean | null;
		};
	};
	meta: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function politeFetch<T>(url: string, attempt = 1): Promise<T | null> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
		if (response.status === 429 || response.status >= 500) {
			if (attempt > MAX_RETRIES) {
				console.error(`  Giving up on ${url} after ${MAX_RETRIES} retries (${response.status})`);
				return null;
			}
			const backoff = 2 ** attempt * 1000;
			console.log(
				`  ${response.status} from ${url}, backing off ${backoff}ms (attempt ${attempt})`,
			);
			await sleep(backoff);
			return politeFetch<T>(url, attempt + 1);
		}
		if (!response.ok) {
			console.error(`  ${response.status} ${response.statusText}: ${url}`);
			return null;
		}
		return (await response.json()) as T;
	} catch (error) {
		if (attempt > MAX_RETRIES) {
			console.error(`  Network error on ${url} after ${MAX_RETRIES} retries:`, error);
			return null;
		}
		const backoff = 2 ** attempt * 1000;
		console.log(`  Network error on ${url}, backing off ${backoff}ms (attempt ${attempt})`);
		await sleep(backoff);
		return politeFetch<T>(url, attempt + 1);
	}
}

function ensureDirs() {
	for (const dir of [RAW_DIR, LIST_DIR]) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}
}

function pagePath(page: number) {
	return path.join(LIST_DIR, `page-${String(page).padStart(4, '0')}.json`);
}

export async function fetchCatalog(opts: { rebuild?: boolean } = {}): Promise<CatalogEntry[]> {
	ensureDirs();

	console.log('Pass 1: walking template catalog...\n');
	const allEntries: CatalogEntry[] = [];
	let page = 1;
	let totalExpected: number | undefined;

	while (true) {
		const cachePath = pagePath(page);
		let response: ListResponse | null;

		if (!opts.rebuild && fs.existsSync(cachePath)) {
			response = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as ListResponse;
			console.log(`  Page ${page}: ${response.workflows.length} workflows (cached)`);
		} else {
			const url = `${LIST_URL}?page=${page}&rows=${ROWS_PER_PAGE}`;
			response = await politeFetch<ListResponse>(url);
			if (response === null) {
				// Fail fast: writing a partial catalog would look valid on disk
				// but silently drop later pages, masking the failure.
				throw new Error(`Catalog walk failed at page ${page}; refusing to write partial catalog`);
			}
			fs.writeFileSync(cachePath, JSON.stringify(response, null, 2));
			console.log(
				`  Page ${page}: ${response.workflows.length} workflows (fetched, total=${response.totalWorkflows})`,
			);
			await sleep(RATE_LIMIT_MS);
		}

		if (totalExpected === undefined) totalExpected = response.totalWorkflows;
		if (response.workflows.length === 0) break;
		allEntries.push(...response.workflows);
		if (allEntries.length >= response.totalWorkflows) break;
		page++;
	}

	const dedupedById = new Map<number, CatalogEntry>();
	for (const entry of allEntries) dedupedById.set(entry.id, entry);
	const catalog = Array.from(dedupedById.values());

	fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
	console.log(
		`\nWrote ${catalog.length} unique entries to ${path.relative(process.cwd(), CATALOG_FILE)} (server total=${totalExpected})\n`,
	);

	return catalog;
}

function detailPath(id: number) {
	return path.join(DETAIL_DIR, `${id}.json`);
}

export async function fetchDetail(
	id: number,
	opts: { force?: boolean } = {},
): Promise<DetailResponse | null> {
	ensureDirs();
	const cachePath = detailPath(id);

	if (!opts.force && fs.existsSync(cachePath)) {
		try {
			return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as DetailResponse;
		} catch {
			// fall through to refetch
		}
	}

	const response = await politeFetch<DetailResponse>(`${DETAIL_URL}/${id}`);
	if (response === null) return null;
	fs.writeFileSync(cachePath, JSON.stringify(response, null, 2));
	await sleep(RATE_LIMIT_MS);
	return response;
}

export function loadCachedCatalog(): CatalogEntry[] {
	if (!fs.existsSync(CATALOG_FILE)) {
		throw new Error(`Catalog not found at ${CATALOG_FILE}. Run \`pnpm fetch-templates\` first.`);
	}
	return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8')) as CatalogEntry[];
}

export function loadCachedDetail(id: number): DetailResponse | null {
	const p = detailPath(id);
	if (!fs.existsSync(p)) return null;
	try {
		return JSON.parse(fs.readFileSync(p, 'utf-8')) as DetailResponse;
	} catch {
		return null;
	}
}

async function main() {
	const rebuild = process.argv.includes('--rebuild');
	const catalog = await fetchCatalog({ rebuild });
	console.log(`Done. Catalog has ${catalog.length} entries.`);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
