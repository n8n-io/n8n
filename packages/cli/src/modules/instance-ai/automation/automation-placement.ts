import type { AutomationProposalResult, LinkedInstanceSummary } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { UserError } from 'n8n-workflow';

import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import type { CapabilityContext } from '@/services/capabilities/capability';

import { isExpectedFailure } from './automation-errors';
import {
	asksToTurnOffHere,
	linkedAutomationResult,
	linkedMoveError,
	type LinkedMove,
	withKeepFailure,
} from './automation-link-result';

const LINKED_INSTANCES_MODULE = 'linked-instances';

/** What `copyToLink` sends to the linked instance. */
export type LinkCopy = LinkedMove & {
	workflowId: string;
	source: WorkflowActionSource;
};

/**
 * Where an automation can run: this n8n instance, or a linked instance of the acting user. The
 * linked-instances classes load on first use, so that they are needed only while the module is on.
 */
@Service()
export class AutomationPlacement {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {}

	/**
	 * The links that a card can offer, with the status of their last check. `undefined` when the
	 * card cannot list them: on MCP, in a shared chat, or while the linked-instances module is off,
	 * nothing leaves this instance. A failed lookup gives `undefined` too, so that the user can
	 * still keep the workflow here. An empty list means that the user has no link.
	 */
	async linksFor(context: CapabilityContext): Promise<LinkedInstanceSummary[] | undefined> {
		if (this.refusalFor(context) !== undefined) return undefined;
		try {
			const { LinkedInstanceStore } = await import(
				'../../linked-instances/linked-instance.store.js'
			);
			return await Container.get(LinkedInstanceStore).listForUser(context.user.id);
		} catch (error) {
			this.logger.warn('Failed to list the linked instances for an automation card', {
				userId: context.user.id,
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}

	/**
	 * The user's link with this id. Checks before any change, so that a refusal changes nothing.
	 * @throws UserError when nothing can leave this instance in this context, or the link is gone
	 */
	async findLink(context: CapabilityContext, linkId: string): Promise<LinkedInstanceSummary> {
		const refusal = this.refusalFor(context);
		if (refusal !== undefined) throw new UserError(refusal);
		const { LinkedInstanceStore } = await import('../../linked-instances/linked-instance.store.js');
		const link = await Container.get(LinkedInstanceStore).getForUser(context.user.id, linkId);
		if (!link) {
			throw new UserError(
				'The linked instance of the card is not linked any more. Nothing was changed. Propose it again to choose another place.',
			);
		}
		return link;
	}

	/**
	 * True when the move would take the workflow: the user can read and export it, it is not
	 * archived, and it calls no other workflow by a fixed ID. "Turn it on" of a live workflow also
	 * turns it off here, so a live workflow needs that right too. These are the checks of the move
	 * itself, so the card offers no link that the move then refuses. Reads only. A check that
	 * fails for another cause offers no link either, as a failed lookup of the links does, so that
	 * the user can still keep the workflow here.
	 */
	async canMove(
		user: User,
		workflowId: string,
		{ liveHere }: { liveHere: boolean },
	): Promise<boolean> {
		const { TransferLocalWorkflows } = await import(
			'../../linked-instances/transfer/transfer-local-workflows.js'
		);
		const local = Container.get(TransferLocalWorkflows);
		try {
			const workflow = await local.findMovable(user, workflowId);
			await local.assertNoSubWorkflowCalls(user, workflow);
			if (liveHere) await local.assertCanTurnOff(user, workflowId);
			return true;
		} catch (error) {
			if (!isExpectedFailure(error)) {
				this.logger.error('Failed to check if a workflow can move to a linked instance', {
					workflowId,
					error: getErrorMessage(error),
				});
			}
			return false;
		}
	}

	/**
	 * Copies the workflow to the linked instance and turns the copy on when asked. "Turn it on" of
	 * a live workflow also turns off the workflow here once the new version runs there. Then it
	 * keeps the workflow here with `keepHere`. The copy is there by then, so a failed keep is in
	 * the result, not an error.
	 * @throws UserError when the copy is refused or fails. Text of the linked instance is fenced.
	 */
	async copyToLink(
		user: User,
		copy: LinkCopy,
		keepHere: () => Promise<unknown>,
	): Promise<AutomationProposalResult> {
		const { TransferService } = await import('../../linked-instances/transfer/transfer.service.js');
		let result: AutomationProposalResult;
		try {
			const pushed = await Container.get(TransferService).push(
				user,
				copy.link.id,
				{
					workflowId: copy.workflowId,
					publish: copy.publish,
					deactivateLocal: asksToTurnOffHere(copy),
				},
				{ source: copy.source },
			);
			result = linkedAutomationResult(pushed, copy);
		} catch (error) {
			if (!isExpectedFailure(error)) throw error;
			throw linkedMoveError(error, copy.workflowName, copy.link);
		}
		try {
			await keepHere();
			return result;
		} catch (error) {
			this.logger.error('Failed to keep a workflow after its copy went to a linked instance', {
				workflowId: copy.workflowId,
				linkId: copy.link.id,
				error: getErrorMessage(error),
			});
			return withKeepFailure(result, copy);
		}
	}

	/** Why nothing can leave this instance in this context, or `undefined` when it can. */
	private refusalFor(context: CapabilityContext): string | undefined {
		if (context.surface === 'mcp') {
			return 'The "target" must be "local": MCP clients keep automations on this n8n instance. Nothing was changed.';
		}
		// A context that does not say counts as shared, so that a new caller keeps the workflow here.
		if (context.sharedThread !== false) {
			return 'This chat is shared, so its automations stay on this n8n instance. Nothing was changed.';
		}
		if (!this.moduleRegistry.isActive(LINKED_INSTANCES_MODULE)) {
			return 'Linked instances are turned off on this n8n instance. Nothing was changed.';
		}
		return undefined;
	}
}
