import type { LinkedInstanceSummary } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { LinkedInstanceStore, type StoredLinkedInstance } from '../linked-instance.store';
import { LINK_NOT_FOUND_MESSAGE } from '../linked-instances.service';
import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
} from '../remote/remote-instance.client';
import { RemoteInstanceError } from '../remote/remote-instance.errors';
import { remoteText } from '../remote/remote-instance.outcome';
import { withRemoteClient } from '../remote/with-remote-client';
import { cleanName } from '../remote-projects';
import { missingToolMessage, type TransferDirection } from './transfer-errors';

// Remote error texts have the same limit.
const MAX_REMOTE_TEXT_LENGTH = 500;

type CleanText = (text: string, maxLength?: number) => string;

/** One open connection to a linked instance that passed the probe. Do not keep it after the work. */
export type RemoteSession = {
	link: LinkedInstanceSummary;
	/**
	 * Calls a tool of the linked instance. The message of a tool error is made safe to show, as
	 * `clean` does, because the messages for the user repeat it.
	 * @throws {RemoteInstanceError}
	 */
	callTool: RemoteInstanceClient['callTool'];
	toolNames: ReadonlySet<string>;
	/**
	 * Makes text from the linked instance safe to show: drops characters without width, puts it on
	 * one line, removes the access token and cuts it to `maxLength` (default 500).
	 */
	clean: CleanText;
};

/**
 * The text goes on one line before the token is removed. Otherwise a token with characters
 * without width in it passes the removal, and the folding joins it again.
 */
export function textCleaner(token: string): CleanText {
	return (text, maxLength = MAX_REMOTE_TEXT_LENGTH) => {
		const oneLine = cleanName(text, Number.POSITIVE_INFINITY);
		return cleanName(remoteText(oneLine, token) ?? '', maxLength);
	};
}

function cleaningCallTool(
	client: RemoteInstanceClient,
	clean: CleanText,
): RemoteInstanceClient['callTool'] {
	return async (...args) => {
		try {
			return await client.callTool(...args);
		} catch (error) {
			// Only a tool error holds text of the linked instance. An empty text gets the default message.
			if (!(error instanceof RemoteInstanceError) || error.reason !== 'tool-error') throw error;
			throw new RemoteInstanceError('tool-error', clean(error.message) || undefined);
		}
	};
}

/** Opens the connections of moves. Each user reaches only their own links. */
@Service()
export class LinkedInstanceSessions {
	constructor(
		private readonly store: LinkedInstanceStore,
		private readonly clientFactory: RemoteInstanceClientFactory,
	) {}

	/** @throws {NotFoundError} when the user has no link with this id */
	async findLink(user: User, id: string): Promise<StoredLinkedInstance> {
		const link = await this.store.findForUse(user.id, id);
		if (!link) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
		return link;
	}

	/**
	 * Probes the linked instance, checks that it offers the tool of the direction, runs the work
	 * and closes the connection. The token stays in this call.
	 * @throws {RemoteInstanceError} when the probe fails
	 * @throws {BadRequestError} when the linked instance does not offer the tool
	 */
	async withSession<T>(
		link: StoredLinkedInstance,
		direction: TransferDirection,
		work: (session: RemoteSession) => Promise<T>,
	): Promise<T> {
		const { summary } = link;
		const token = await link.readToken();
		return await withRemoteClient(
			this.clientFactory,
			{ origin: summary.baseUrl, token },
			async (client) => {
				const probe = await client.probe();
				if (!probe.ok) throw new RemoteInstanceError(probe.reason);
				const toolNames = new Set(probe.toolNames);
				const missing = missingToolMessage(toolNames, direction, summary.name);
				if (missing) throw new BadRequestError(missing);
				const clean = textCleaner(token);
				const callTool = cleaningCallTool(client, clean);
				return await work({ link: summary, callTool, toolNames, clean });
			},
		);
	}
}
