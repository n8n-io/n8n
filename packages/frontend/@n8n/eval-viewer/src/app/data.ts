import {
	iterationDetailSchema,
	viewerIndexSchema,
	type IterationDetail,
	type ViewerIndex,
} from '../schema';

async function fetchJson(url: string): Promise<unknown> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
	const body: unknown = await response.json();
	return body;
}

export async function loadIndex(): Promise<ViewerIndex> {
	return viewerIndexSchema.parse(await fetchJson('./data/index.json'));
}

const details = new Map<string, Promise<IterationDetail>>();

export async function loadIteration(id: string): Promise<IterationDetail> {
	const cached = details.get(id);
	if (cached) return await cached;
	const loading = fetchJson(`./data/iterations/${encodeURIComponent(id)}.json`).then((body) =>
		iterationDetailSchema.parse(body),
	);
	details.set(id, loading);
	return await loading;
}
