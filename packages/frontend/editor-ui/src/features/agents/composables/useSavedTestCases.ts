import type { IRestApiContext } from '@n8n/rest-api-client';

import { fetchSavedTestCases } from '../agentEvals.api';
import type { AgentSavedTestCaseRecord } from '../agentEvals.types';

/**
 * The test cases saved from each test chat, read once per chat and shared by
 * all its replies, so a reload shows the saved ones without a request per
 * reply. Saves and Undo update the copy here.
 */
const byThread = new Map<string, Promise<Map<string, AgentSavedTestCaseRecord>>>();

const keyOf = (agentId: string, threadId: string) => `${agentId}:${threadId}`;

/** For tests: forget every chat read so far. */
export function clearSavedTestCases() {
	byThread.clear();
}

export async function savedCaseFor(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	executionId: string,
): Promise<AgentSavedTestCaseRecord | undefined> {
	const key = keyOf(agentId, threadId);
	let cases = byThread.get(key);
	if (!cases) {
		cases = fetchSavedTestCases(context, projectId, agentId, threadId).then(
			({ cases: saved }) => new Map(saved.map((record) => [record.executionId, record])),
		);
		byThread.set(key, cases);
		// A failed read is not kept, so the next reply tries again.
		cases.catch(() => byThread.delete(key));
	}
	return (await cases).get(executionId);
}

export async function rememberSaved(
	agentId: string,
	threadId: string,
	record: AgentSavedTestCaseRecord,
) {
	const cases = byThread.get(keyOf(agentId, threadId));
	if (cases) (await cases).set(record.executionId, record);
}

export async function forgetSaved(agentId: string, threadId: string, executionId: string) {
	const cases = byThread.get(keyOf(agentId, threadId));
	if (cases) (await cases).delete(executionId);
}
