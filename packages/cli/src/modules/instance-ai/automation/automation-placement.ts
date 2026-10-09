import type { AutomationProposalResult, LinkedInstanceSummary } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import type { CapabilityContext } from '@/services/capabilities/capability';

import { isExpectedFailure } from './automation-errors';
import { AutomationInstanceInfo } from './automation-instance-info';
import { linkedAutomationResult, linkedMoveError, type LinkedMove } from './automation-link-result';

const LINKED_INSTANCES_MODULE = 'linked-instances';

/** What `copyToLink` sends to the linked instance. */
export type LinkCopy = LinkedMove & {
	workflowId: string;
	/** Turns off the workflow here when the copy there went live. */
	deactivateLocal: boolean;
	source: WorkflowActionSource;
};

/**
 * Where an automation can run: this n8n instance, or a linked instance of the acting user. The
 * linked-instances classes load on first use, so that they are needed only while the module is on.
 */
@Service()
export class AutomationPlacement {
	constructor(
		readonly instance: AutomationInstanceInfo,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/**
	 * The links that a card can offer, with the status of their last check. None on MCP, in a
	 * shared chat, or while the linked-instances module is off: then nothing leaves this instance.
	 */
	async linksFor(context: CapabilityContext): Promise<LinkedInstanceSummary[]> {
		if (this.refusalFor(context) !== undefined) return [];
		const { LinkedInstanceStore } = await import('../../linked-instances/linked-instance.store.js');
		return await Container.get(LinkedInstanceStore).listForUser(context.user.id);
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
	 * Copies the workflow to the linked instance, turns the copy on when asked, and turns off the
	 * workflow here when asked and the copy went live there.
	 * @throws UserError with fenced text of the linked instance when the copy is refused or fails
	 */
	async copyToLink(user: User, copy: LinkCopy): Promise<AutomationProposalResult> {
		const { TransferService } = await import('../../linked-instances/transfer/transfer.service.js');
		try {
			const pushed = await Container.get(TransferService).push(
				user,
				copy.link.id,
				{
					workflowId: copy.workflowId,
					publish: copy.publish,
					deactivateLocal: copy.deactivateLocal,
				},
				{ source: copy.source },
			);
			return linkedAutomationResult(pushed, copy);
		} catch (error) {
			if (!isExpectedFailure(error)) throw error;
			throw linkedMoveError(error, copy.workflowName, copy.link);
		}
	}

	/** Why nothing can leave this instance in this context, or `undefined` when it can. */
	private refusalFor(context: CapabilityContext): string | undefined {
		if (context.surface === 'mcp') {
			return 'The "target" must be "local": MCP clients keep automations on this n8n instance. Nothing was changed.';
		}
		if (context.sharedThread === true) {
			return 'This chat is shared, so its automations stay on this n8n instance. Nothing was changed.';
		}
		if (!this.moduleRegistry.isActive(LINKED_INSTANCES_MODULE)) {
			return 'Linked instances are turned off on this n8n instance. Nothing was changed.';
		}
		return undefined;
	}
}
