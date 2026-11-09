import type { AgentMessageIntegrationOrigin } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	fetchSnapshotName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
	type OriginNames,
} from '../../integration-origin-support';

export function buildLinearOriginDraft(
	{ subject }: OriginInput,
	decoded: DecodedThread,
): OriginDraft {
	return {
		type: 'linear',
		issueId: text(decoded.issueId),
		identifier: text(subject?.id),
		title: text(subject?.title),
		projectId: text(subject?.projectId),
		teamId: text(subject?.teamId),
	};
}

export async function fetchLinearOriginNames(
	{ thread }: OriginInput,
	origin: AgentMessageIntegrationOrigin,
): Promise<OriginNames | undefined> {
	if (origin.type !== 'linear' || !origin.teamId) return undefined;
	const teamName = await fetchTeamName(thread.adapter, origin.teamId);
	return teamName ? { teamName } : undefined;
}

/** The adapter exposes its Linear client as `client`. A missing client leaves the name out. */
async function fetchTeamName(adapter: unknown, teamId: string): Promise<string | undefined> {
	return await fetchSnapshotName(async () => {
		const client = isRecord(adapter) ? adapter.client : undefined;
		if (!isRecord(client) || typeof client.team !== 'function') return undefined;
		return await client.team(teamId);
	});
}
