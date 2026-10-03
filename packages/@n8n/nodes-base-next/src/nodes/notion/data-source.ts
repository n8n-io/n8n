import { isHttpError, isRecord, list, path, type Http } from '@n8n/node-sdk';

export const NOTION_VERSION = { 'Notion-Version': '2026-03-11' };

/** A database ID resolves to its first data source; a data source ID is used as is. */
export async function dataSourceOf(http: Http, id: string): Promise<string> {
	try {
		const database = await http.request({ path: path`/databases/${id}`, headers: NOTION_VERSION });
		const [first] = isRecord(database) ? list(database.data_sources) : [];
		return isRecord(first) && typeof first.id === 'string' ? first.id : id;
	} catch (error) {
		// Notion answers 400 or 404 for a data source ID. Other errors are real failures.
		if (isHttpError(error) && (error.status === 400 || error.status === 404)) return id;
		throw error;
	}
}
