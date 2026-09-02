import { Service } from '@n8n/di';
import type {
	INode,
	IWebhookResponseData,
	IWorkflowExecutionDataProcess,
	WebhookResponseMode,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
	UserError,
	WAIT_NODE_TYPE,
} from 'n8n-workflow';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';

import { shouldEstablishTriggerIdentity } from './webhook-trigger-identity';

/**
 * Trigger types the v2 path cannot serve. Each carries machinery the engine
 * path does not: a seeded execution stack, MCP relay fields, multi-page forms,
 * or a resume URL.
 */
const UNSUPPORTED_TRIGGERS = new Set<string>([
	CHAT_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
]);

/** What the webhook surface knows about a run that {@link EngineV2Dispatcher} does not. */
export type EngineV2WebhookRun = {
	workflowStartNode: INode;
	responseMode: WebhookResponseMode;
	webhookResultData: IWebhookResponseData;
	/** Set when the request resumes an execution that waits on this webhook. */
	executionId: string | undefined;
};

/**
 * The webhook surface's seam to engine 2.0.
 *
 * The webhook node itself still runs control-plane-side, so only the start call
 * changes for a v2 workflow. This decides whether a run takes that path, and
 * rejects the parts of the webhook surface the path does not serve yet.
 */
@Service()
export class EngineV2Webhooks {
	constructor(private readonly dispatcher: EngineV2Dispatcher) {}

	/** Whether this webhook run starts on the engine 2.0 data plane. */
	handles(data: IWorkflowExecutionDataProcess): boolean {
		return this.dispatcher.routesToEngineV2(data);
	}

	/**
	 * A workflow that opted into engine 2.0 never falls back to v1, so each case
	 * fails with the reason instead. These checks live here rather than in
	 * {@link EngineV2Dispatcher} because they need webhook context the dispatcher
	 * never sees.
	 *
	 * Ordered so the user hears the most fundamental reason first.
	 */
	assertSupported(run: EngineV2WebhookRun): void {
		const { workflowStartNode, responseMode, webhookResultData, executionId } = run;

		// A v2 run keeps no control-plane execution row, so there is nothing to resume.
		if (executionId !== undefined) {
			throw new UserError('Engine 2.0 cannot resume a waiting execution yet.');
		}

		if (
			UNSUPPORTED_TRIGGERS.has(workflowStartNode.type) ||
			shouldEstablishTriggerIdentity(workflowStartNode)
		) {
			throw new UserError(`Engine 2.0 cannot run the "${workflowStartNode.name}" trigger yet.`);
		}

		// TODO(CAT-4313): support `lastNode`. TODO(CAT-4079): support `responseNode`.
		if (responseMode !== 'onReceived') {
			throw new UserError(
				`Engine 2.0 does not support the '${responseMode}' response mode yet. Respond immediately instead.`,
			);
		}

		// The engine takes the payload as JSON, so a binary item would be dropped. An
		// empty `binary` map carries no file, so it does not count.
		const hasBinary = (webhookResultData.workflowData ?? []).some((slot) =>
			(slot ?? []).some((item) => Object.keys(item.binary ?? {}).length > 0),
		);
		if (hasBinary) {
			throw new UserError('Engine 2.0 cannot receive files from a webhook yet.');
		}
	}
}
