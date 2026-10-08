import type { LinkInstanceRequestDto, LinkedInstanceSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';

import * as api from './linkedInstances.api';
import {
	useLinkedInstanceListLoad,
	useLinkedInstanceRows,
	type LinkedInstanceRows,
	type RowsMark,
} from './linkedInstances.rows';

/** The server answers 404 when the link is gone, for example after an unlink in another tab. */
function isMissingLink(error: unknown): boolean {
	return error instanceof ResponseError && error.httpStatusCode === 404;
}

/** The row goes when the server says that the link is gone. The error still reaches the caller. */
async function removeWhenMissing<T>(
	rows: LinkedInstanceRows,
	id: string,
	startedAt: RowsMark,
	request: () => Promise<T>,
): Promise<T> {
	try {
		return await request();
	} catch (error) {
		if (isMissingLink(error) && rows.isCurrent(startedAt)) rows.remove(id);
		throw error;
	}
}

/**
 * The links of the current user. The state holds only summaries: a token goes straight from
 * the caller to the API and is never kept here. A sign-out without a page reload keeps this
 * store, so the page calls reset() when it closes.
 */
export const useLinkedInstancesStore = defineStore('linkedInstances', () => {
	const rootStore = useRootStore();
	const rows = useLinkedInstanceRows();
	const list = useLinkedInstanceListLoad(
		rows,
		async () => await api.fetchLinkedInstances(rootStore.restApiContext),
	);

	/** @throws the server error, for example when the check of the instance fails */
	async function link(payload: LinkInstanceRequestDto): Promise<LinkedInstanceSummary> {
		const startedAt = rows.mark();
		const summary = await api.linkInstance(rootStore.restApiContext, payload);
		if (rows.isCurrent(startedAt)) rows.append(summary);
		return summary;
	}

	/**
	 * Checks the instance again and records the new status.
	 * @returns `undefined` when the result is out of date: the row changed or went during the check
	 * @throws the server error. A 404 also removes the row.
	 */
	async function verify(id: string): Promise<LinkedInstanceSummary | undefined> {
		const startedAt = rows.mark();
		const summary = await removeWhenMissing(rows, id, startedAt, async () => {
			return await api.verifyLinkedInstance(rootStore.restApiContext, id);
		});
		const outOfDate = !rows.isCurrent(startedAt) || rows.rowChangedSince(startedAt, id);
		if (outOfDate || !rows.isListed(id)) return undefined;
		rows.replace(summary);
		return summary;
	}

	/**
	 * @throws the server error when the instance refuses the new token. The old token stays.
	 * A 404 also removes the row.
	 */
	async function changeToken(id: string, token: string): Promise<LinkedInstanceSummary> {
		const startedAt = rows.mark();
		const summary = await removeWhenMissing(rows, id, startedAt, async () => {
			return await api.updateLinkedInstance(rootStore.restApiContext, id, { token });
		});
		if (rows.isCurrent(startedAt)) rows.replace(summary);
		return summary;
	}

	/** A link that is already gone counts as unlinked, because that is the result the user wants. */
	async function unlink(id: string): Promise<void> {
		const startedAt = rows.mark();
		try {
			await api.unlinkInstance(rootStore.restApiContext, id);
		} catch (error) {
			if (!isMissingLink(error)) throw error;
		}
		if (rows.isCurrent(startedAt)) rows.remove(id);
	}

	/** Forgets the links. A request that is still open changes nothing after this. */
	function reset() {
		rows.clear();
		list.reset();
	}

	return {
		instances: rows.instances,
		isLoading: list.isLoading,
		loadFailed: list.loadFailed,
		hasLoaded: list.hasLoaded,
		fetchInstances: list.fetchInstances,
		link,
		verify,
		changeToken,
		unlink,
		reset,
	};
});
