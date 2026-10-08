import type { LinkedInstanceTransferPreflight } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { RemoteInstanceError } from '../remote/remote-instance.errors';
import { LinkedInstanceSessions, type RemoteSession } from './linked-instance-sessions';
import { listTargetCredentials } from './remote-transfer-tools';
import { toTransferHttpError, transferContext } from './transfer-errors';
import { TransferLocalWorkflows } from './transfer-local-workflows';
import {
	buildTransferPreflight,
	type RemoteCredentialList,
	type RemoteTransferContext,
} from './transfer-preflight';

/** Tells what a move of one workflow would do. Changes nothing in either instance. */
@Service()
export class TransferPreflightService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly sessions: LinkedInstanceSessions,
		private readonly local: TransferLocalWorkflows,
	) {
		this.logger = logger.scoped('mcp');
	}

	/**
	 * @throws {NotFoundError} when the user has no such link or cannot read the workflow
	 * @throws {BadRequestError} when the workflow is archived, or the linked instance cannot take it
	 */
	async preflight(
		user: User,
		linkId: string,
		workflowId: string,
	): Promise<LinkedInstanceTransferPreflight> {
		const link = await this.sessions.findLink(user, linkId);
		const workflow = await this.local.findMovable(user, workflowId);
		const local = await this.local.readRequirements(user, workflow);
		try {
			const remote = await this.sessions.withSession(
				link,
				'push',
				async (session): Promise<RemoteTransferContext> => ({
					// No n8n MCP tool lists node types in a form that a program can compare, so the
					// result of the move lists the missing ones.
					nodeTypes: null,
					credentials: await this.tryListCredentials(session),
					targetProject: session.link.defaultRemoteProject,
				}),
			);
			return buildTransferPreflight(local, remote);
		} catch (error) {
			throw toTransferHttpError(error, transferContext(link.summary, 'push'));
		}
	}

	/**
	 * The credentials that the import can use in the project that the move goes to. The check only
	 * informs, so a failure leaves the statuses unknown.
	 */
	private async tryListCredentials(session: RemoteSession): Promise<RemoteCredentialList | null> {
		try {
			return await listTargetCredentials(session);
		} catch (error) {
			if (!(error instanceof RemoteInstanceError)) throw error;
			this.logger.warn('Could not list the credentials of a linked instance', {
				linkedInstanceId: session.link.id,
				reason: error.reason,
			});
			return null;
		}
	}
}
