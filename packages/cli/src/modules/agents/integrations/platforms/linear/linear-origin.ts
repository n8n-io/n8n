import { isRecord } from '@n8n/utils/is-record';

import {
	fetchSnapshotName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';

export async function buildLinearOriginDraft(
	{ thread, subject }: OriginInput,
	decoded: DecodedThread,
): Promise<OriginDraft> {
	const teamId = text(subject?.teamId);
	return {
		type: 'linear',
		issueId: text(decoded.issueId),
		identifier: text(subject?.id),
		title: text(subject?.title),
		projectId: text(subject?.projectId),
		teamId,
		teamName: teamId ? await fetchTeamName(thread.adapter, teamId) : undefined,
	};
}

/** The adapter exposes its Linear client as `client`. Any failure leaves the name out. */
async function fetchTeamName(adapter: unknown, teamId: string): Promise<string | undefined> {
	return await fetchSnapshotName(async () => {
		const client = isRecord(adapter) ? adapter.client : undefined;
		if (!isRecord(client) || typeof client.team !== 'function') return undefined;
		return await client.team(teamId);
	});
}
