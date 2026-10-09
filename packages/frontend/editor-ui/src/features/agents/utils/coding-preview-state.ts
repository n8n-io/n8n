import type { AgentCodingStatus } from '@n8n/api-types';
import type { BaseTextKey, useI18n } from '@n8n/i18n';

/** The state of the last request for a preview URL. */
export type CodingPreviewRequest = 'idle' | 'loading' | 'unavailable' | 'failed';

export type CodingPreviewState =
	| 'ready'
	| 'stopped'
	| 'error'
	| 'starting'
	| 'running'
	| 'loading'
	| 'noAccess'
	| 'unavailable'
	| 'failed';

export interface CodingPreviewCopy {
	title: BaseTextKey;
	hint?: BaseTextKey;
}

export interface CodingPreviewInput {
	app?: AgentCodingStatus['app'];
	url: string;
	request: CodingPreviewRequest;
	/** False when the user cannot run the agent, so the panel never asks for a URL. */
	canExecute: boolean;
}

/**
 * The one state of the preview panel. The heading and the hint come from this
 * state only, so they cannot disagree with each other or with the app status.
 * The panel says that it loads only while a request for the URL is open.
 */
export function codingPreviewState(input: CodingPreviewInput): CodingPreviewState {
	if (input.app === 'error') return 'error';
	if (input.app !== 'starting' && input.app !== 'running') return 'stopped';
	return activeAppPreviewState(input);
}

/** The state of the panel while the app starts or runs. */
function activeAppPreviewState({
	app,
	url,
	request,
	canExecute,
}: CodingPreviewInput): CodingPreviewState {
	if (request === 'unavailable' || request === 'failed') return request;
	if (!canExecute && !url && request === 'idle') return 'noAccess';
	if (app === 'starting') return 'starting';
	if (url) return 'ready';
	return request === 'loading' ? 'loading' : 'running';
}

export const CODING_PREVIEW_COPY: Record<
	Exclude<CodingPreviewState, 'ready'>,
	CodingPreviewCopy
> = {
	stopped: { title: 'agents.coding.app.stopped', hint: 'agents.coding.app.hint' },
	error: { title: 'agents.coding.app.error', hint: 'agents.coding.app.errorHint' },
	starting: { title: 'agents.coding.app.starting', hint: 'agents.coding.app.startingHint' },
	running: { title: 'agents.coding.app.running' },
	loading: { title: 'agents.coding.app.loading' },
	noAccess: { title: 'agents.coding.app.noAccess', hint: 'agents.coding.app.noAccessHint' },
	unavailable: {
		title: 'agents.coding.app.unavailable',
		hint: 'agents.coding.app.unavailableHint',
	},
	failed: { title: 'agents.coding.app.failed', hint: 'agents.coding.app.failedHint' },
};

/**
 * The heading, hint and run offer of the empty preview panel. When another
 * session holds the preview, the hint of a stopped app names that session.
 */
export function codingPreviewCopy(
	i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>,
	state: Exclude<CodingPreviewState, 'ready'>,
	otherPreview?: string,
) {
	const copy = CODING_PREVIEW_COPY[state];
	const offersRun = state === 'stopped' || state === 'error';
	const hint =
		offersRun && otherPreview
			? i18n.baseText('agents.coding.app.otherPreview', { interpolate: { name: otherPreview } })
			: copy.hint && i18n.baseText(copy.hint);
	return { title: i18n.baseText(copy.title), hint, offersRun };
}
