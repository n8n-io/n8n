import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';
import type {
	INode,
	IWebhookResponseData,
	IWorkflowBase,
	WebhookResponseMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	classifyTriggerIdentity,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
	UserError,
	WAIT_NODE_TYPE,
} from 'n8n-workflow';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';

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

/** What the request says about a run, before the webhook node has produced anything. */
export type EngineV2WebhookRequest = {
	workflowStartNode: INode;
	responseMode: WebhookResponseMode;
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
	constructor(
		private readonly dispatcher: EngineV2Dispatcher,
		private readonly binaryDataService: BinaryDataService,
		private readonly logger: Logger,
	) {}

	/** Whether this webhook run starts on the engine 2.0 data plane. */
	handles(workflowData: IWorkflowBase, executionMode: WorkflowExecuteMode): boolean {
		return this.dispatcher.handlesWorkflow(workflowData, executionMode);
	}

	/**
	 * Rejects a run the v2 path cannot serve, from the configuration alone.
	 *
	 * A workflow that opted into engine 2.0 never falls back to v1, so each case
	 * fails with the reason instead. These checks live here rather than in
	 * {@link EngineV2Dispatcher} because they need webhook context the dispatcher
	 * never sees.
	 *
	 * Call this **before the webhook node runs**. A node in streaming mode answers
	 * the request from inside its own `webhook()` method, and the chat, MCP and
	 * Agent365 triggers have paths that do the same, so a check that ran afterwards
	 * could not send the 400 and would write after the headers went out.
	 *
	 * Ordered so the user hears the most fundamental reason first.
	 */
	assertSupported({ workflowStartNode, responseMode, executionId }: EngineV2WebhookRequest): void {
		// A v2 run keeps no control-plane execution row, so there is nothing to resume.
		if (executionId !== undefined) {
			throw new UserError('Engine 2.0 cannot resume a waiting execution yet.');
		}

		if (UNSUPPORTED_TRIGGERS.has(workflowStartNode.type)) {
			throw new UserError(`Engine 2.0 cannot run the "${workflowStartNode.name}" trigger yet.`);
		}

		// `EngineV2Dispatcher` refuses this too, for every v2 entry path. It is
		// repeated here because only a check that precedes the node run can still
		// answer the request: the extractor masks the secret in the trigger item, and
		// without it the raw value would already be in the node's output.
		if (
			classifyTriggerIdentity(workflowStartNode.type, workflowStartNode.parameters)
				.providesExternalIdentity
		) {
			throw new UserError(
				`Engine 2.0 cannot run the "${workflowStartNode.name}" trigger yet, because it takes credentials from the request.`,
			);
		}

		// TODO(CAT-4313): support `lastNode`. TODO(CAT-4079): support `responseNode`.
		if (responseMode !== 'onReceived') {
			throw new UserError(
				`Engine 2.0 does not support the '${responseMode}' response mode yet. Respond immediately instead.`,
			);
		}
	}

	/**
	 * Rejects a payload the engine cannot carry.
	 *
	 * Only the webhook node's own output says whether the request brought a file,
	 * so this runs after the node, unlike {@link assertSupported}. In stored binary
	 * modes the file is already written by then, and no execution will ever own it,
	 * so it is deleted here rather than left for an execution pruning that never
	 * comes.
	 */
	async assertPayloadSupported(webhookResultData: IWebhookResponseData): Promise<void> {
		const items = (webhookResultData.workflowData ?? []).flatMap((slot) => slot ?? []);
		// An empty `binary` map carries no file, so it does not count.
		const files = items.flatMap((item) => Object.values(item.binary ?? {}));
		if (files.length === 0) return;

		await this.deleteStoredFiles(files.map((file) => file.id));

		throw new UserError('Engine 2.0 cannot receive files from a webhook yet.');
	}

	/**
	 * Only stored modes give a file an id; in memory the data rides on the item and
	 * there is nothing to delete. A failed delete leaks a file, which must not
	 * replace the caller's reason with a storage error.
	 */
	private async deleteStoredFiles(ids: Array<string | undefined>): Promise<void> {
		const storedIds = ids.filter((id) => id !== undefined);
		if (storedIds.length === 0) return;

		try {
			await this.binaryDataService.deleteManyByBinaryDataId(storedIds);
		} catch (error) {
			this.logger.error('Failed to delete the files of a rejected engine 2.0 webhook', { error });
		}
	}
}
