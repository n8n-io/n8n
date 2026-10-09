import type { AgentCodingStatus } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/** The state of the last request for a preview URL. */
export type CodingPreviewRequest = 'idle' | 'loading' | 'unavailable' | 'failed';

export type CodingPreviewState =
	| 'ready'
	| 'stopped'
	| 'error'
	| 'starting'
	| 'loading'
	| 'unavailable'
	| 'failed';

export interface CodingPreviewCopy {
	title: BaseTextKey;
	hint?: BaseTextKey;
}

/**
 * The one state of the preview panel. The heading and the hint come from this
 * state only, so they cannot disagree with each other or with the app status.
 */
export function codingPreviewState(input: {
	app?: AgentCodingStatus['app'];
	url: string;
	request: CodingPreviewRequest;
}): CodingPreviewState {
	const { app, url, request } = input;
	if (app === 'error') return 'error';
	if (app !== 'starting' && app !== 'running') return 'stopped';
	if (request === 'unavailable' || request === 'failed') return request;
	if (app === 'starting') return 'starting';
	return url ? 'ready' : 'loading';
}

export const CODING_PREVIEW_COPY: Record<Exclude<CodingPreviewState, 'ready'>, CodingPreviewCopy> =
	{
		stopped: { title: 'agents.coding.app.stopped', hint: 'agents.coding.app.hint' },
		error: { title: 'agents.coding.app.error', hint: 'agents.coding.app.errorHint' },
		starting: { title: 'agents.coding.app.starting', hint: 'agents.coding.app.startingHint' },
		loading: { title: 'agents.coding.app.loading' },
		unavailable: {
			title: 'agents.coding.app.unavailable',
			hint: 'agents.coding.app.unavailableHint',
		},
		failed: { title: 'agents.coding.app.failed', hint: 'agents.coding.app.failedHint' },
	};
