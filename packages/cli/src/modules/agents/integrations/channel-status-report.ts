import {
	isDraftIntegration,
	type AgentChannelRuntimeStatus,
	type AgentIntegrationConfig,
	type AgentIntegrationStatusEntry,
	type AgentIntegrationStatusResponse,
} from '@n8n/api-types';

import type { AgentChannelStatus } from '../entities/agent-channel-status.entity';

/** Decides whether a row still counts; see `AgentChannelStatusReporter.isLive`. */
export type IsLiveRow = (row: AgentChannelStatus) => boolean;

/**
 * Turn what is configured, plus what each process observed, into what the API
 * reports.
 *
 * The two have to be read together. Configuration alone says a channel should be
 * running, which is what this endpoint used to report as `connected` — the reason
 * a channel that never started still looked healthy. The rows alone can't say
 * anything about a channel nobody has tried to start yet.
 *
 * A channel can have one row per process running it, so the rows are combined
 * rather than read: **any live process reporting an error makes the channel an
 * error**, because a main that could not start it cannot serve its webhooks
 * either, and a user who sees "connected" would have no idea why a share of
 * their messages goes nowhere. Rows are only ever written by the process they
 * describe, so this is a pure function of them and cannot oscillate the way a
 * single shared row did.
 *
 * No live rows means `starting`, not an error: it is the honest answer right
 * after a publish, and after an upgrade, before any pass has reported in.
 */
export function buildChannelStatusReport(
	integrations: AgentIntegrationConfig[] | null | undefined,
	activeVersionId: string | null,
	statuses: AgentChannelStatus[],
	isLive: IsLiveRow,
): AgentIntegrationStatusResponse {
	const liveByChannel = new Map<string, AgentChannelStatus[]>();
	for (const row of statuses) {
		if (!isLive(row)) continue;
		const key = channelKey(row.integrationType, row.credentialId);
		liveByChannel.set(key, [...(liveByChannel.get(key) ?? []), row]);
	}

	// Draft entries (`credentialId: ''`) written during the initial build so the
	// panel can show a needs-setup chip aren't a real channel — leaving them out
	// keeps channel-setup UIs from rendering a configured state and hiding their
	// own setup form.
	const entries: AgentIntegrationStatusEntry[] = (integrations ?? [])
		.filter((integration) => !isDraftIntegration(integration))
		.map((integration) => {
			const rows = liveByChannel.get(channelKey(integration.type, integration.credentialId)) ?? [];
			const status = resolveStatus(activeVersionId, rows);
			const failure = status === 'error' ? mostRecentFailure(rows) : undefined;

			return {
				type: integration.type,
				credentialId: integration.credentialId,
				...('settings' in integration ? { settings: integration.settings } : {}),
				status,
				...(failure?.errorMessage ? { errorMessage: failure.errorMessage } : {}),
			};
		});

	return { status: rollUp(entries), integrations: entries };
}

function channelKey(integrationType: string, credentialId: string): string {
	return `${integrationType}:${credentialId}`;
}

function resolveStatus(
	activeVersionId: string | null,
	rows: AgentChannelStatus[],
): AgentChannelRuntimeStatus {
	// An unpublished agent must not receive events, so no channel of it is meant
	// to be running — whatever a row left over from before the unpublish says.
	if (activeVersionId === null) return 'configured';
	if (rows.length === 0) return 'starting';
	if (rows.some((row) => row.status === 'error')) return 'error';

	return 'connected';
}

/**
 * The newest failure, so a channel failing on several mains reports the most
 * current reason rather than whichever row happened to be read first. `hostId`
 * breaks ties, because two instances failing in the same millisecond would
 * otherwise leave the answer to database row order and the message could change
 * between two identical requests.
 */
function mostRecentFailure(rows: AgentChannelStatus[]): AgentChannelStatus | undefined {
	return rows
		.filter((row) => row.status === 'error')
		.sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.hostId.localeCompare(b.hostId),
		)[0];
}

function rollUp(entries: AgentIntegrationStatusEntry[]): AgentIntegrationStatusResponse['status'] {
	if (entries.length === 0) return 'disconnected';

	const statuses = entries.map((entry) => entry.status);
	if (statuses.every((status) => status === 'configured')) return 'configured';
	if (statuses.every((status) => status === 'connected')) return 'connected';
	// Something is running and something is not, so neither word on its own is
	// true; `error` is reserved for when nothing is up.
	if (statuses.some((status) => status === 'connected')) return 'partial';

	return statuses.some((status) => status === 'error') ? 'error' : 'partial';
}
