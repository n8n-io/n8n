import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { INodeParameters, NodeConnectionType } from 'n8n-workflow';

export type TaskStatus = 'pending' | 'active' | 'done';

export interface BuilderV2Task {
	id: string;
	title: string;
	status: TaskStatus;
}

export interface BuilderV2Ghost {
	nodeType: string;
	version: number;
	displayName: string;
	reason: string;
	parameters?: INodeParameters;
	position?: [number, number];
}

export type BuilderV2InsertionPoint =
	| { kind: 'fromStart' }
	| { kind: 'after'; afterNodeId: string };

export interface BuilderV2ConnectionContext {
	nodeId: string;
	mode: 'inputs' | 'outputs';
	type: NodeConnectionType;
	index: number;
	targetNodeId?: string;
	targetType?: NodeConnectionType;
	targetIndex?: number;
}

export interface BuilderV2NarrativeMessage {
	role: 'assistant' | 'user';
	content: string;
}

export interface BuilderV2State {
	sessionId: string;
	taskList: BuilderV2Task[];
	ghosts: BuilderV2Ghost[] | null;
	insertionPoint: BuilderV2InsertionPoint | null;
	connectionContext: BuilderV2ConnectionContext | null;
	narrative: BuilderV2NarrativeMessage[];
	workflow: unknown;
	done: boolean;
	/**
	 * True when the agent is awaiting user input on a suspended tool call.
	 * The FE combines this with `ghosts` to detect a "stuck" state where the
	 * backend is waiting but there's nothing on the canvas to act on.
	 */
	hasPendingSuspension: boolean;
}

export interface StartSessionResponse {
	sessionId: string;
}

export type ConfirmPayload =
	| {
			kind: 'pick';
			chosenIndex: number;
			/**
			 * On-canvas position of the picked ghost at pick time. The backend
			 * uses this so the committed node lands exactly where the user saw
			 * the ghost (no jump on commit).
			 */
			pickedPosition?: [number, number];
	  }
	| { kind: 'reject' };

export async function startSession(
	ctx: IRestApiContext,
	projectId: string,
	body: {
		prompt: string;
		workflowJson: unknown;
		insertionPoint?: BuilderV2InsertionPoint;
		connectionContext?: BuilderV2ConnectionContext;
	},
): Promise<StartSessionResponse> {
	return await makeRestApiRequest<StartSessionResponse>(
		ctx,
		'POST',
		`/projects/${projectId}/builder-v2/sessions`,
		body,
	);
}

export async function confirmSession(
	ctx: IRestApiContext,
	projectId: string,
	sessionId: string,
	body: ConfirmPayload,
): Promise<{ ok: true }> {
	return await makeRestApiRequest<{ ok: true }>(
		ctx,
		'POST',
		`/projects/${projectId}/builder-v2/sessions/${sessionId}/confirm`,
		body,
	);
}

export async function getSessionState(
	ctx: IRestApiContext,
	projectId: string,
	sessionId: string,
): Promise<BuilderV2State> {
	return await makeRestApiRequest<BuilderV2State>(
		ctx,
		'GET',
		`/projects/${projectId}/builder-v2/sessions/${sessionId}/state`,
	);
}
