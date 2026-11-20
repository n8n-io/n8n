import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export type DigestFormat = 'priority' | 'bullets' | 'briefing' | 'decide';
export type DigestProvider = 'gmail' | 'outlook';

/** Credential type that each mailbox node uses to read the inbox. */
export const MAILBOX_CREDENTIAL_TYPE: Record<DigestProvider, string> = {
	gmail: 'gmailOAuth2',
	outlook: 'microsoftOutlookOAuth2Api',
};

export const MAILBOX_NODE_TYPE: Record<DigestProvider, string> = {
	gmail: 'n8n-nodes-base.gmail',
	outlook: 'n8n-nodes-base.microsoftOutlook',
};

export interface DigestCredential {
	id: string;
	name: string;
}

export interface DailyInboxDigestOptions {
	format: DigestFormat;
	/** Time of day the digest runs, in 24-hour clock. */
	hour: number;
	minute: number;
	weekdaysOnly: boolean;
	provider: DigestProvider;
	/** The address the digest goes to. */
	recipientEmail: string;
	/** The connected mailbox. It reads the inbox, and it also sends the digest by email. */
	mailboxCredential?: DigestCredential;
}

/** Names of the nodes. They are shown on the canvas, so the caller translates them. */
export interface DigestNodeNames {
	trigger: string;
	read: string;
	build: string;
	send: string;
}

export const DEFAULT_DIGEST_OPTIONS: DailyInboxDigestOptions = {
	format: 'priority',
	hour: 8,
	minute: 0,
	weekdaysOnly: false,
	provider: 'gmail',
	recipientEmail: '',
};

// The format only labels the digest for now. A real summary needs an AI node, which the flow
// does not add yet.
const DIGEST_TEXT: Record<DigestFormat, string> = {
	priority: '={{ $json.From }}: {{ $json.Subject }}',
	bullets: '={{ $json.From }}: {{ $json.Subject }}',
	briefing: '={{ $json.From }}: {{ $json.Subject }}\n{{ $json.snippet }}',
	decide: '={{ $json.From }}: {{ $json.Subject }}\n{{ $json.snippet }}',
};

const NODE_IDS = {
	trigger: '5f1d5c0e-6d1a-4f0e-9a51-0c2b6f6a0001',
	read: '5f1d5c0e-6d1a-4f0e-9a51-0c2b6f6a0002',
	build: '5f1d5c0e-6d1a-4f0e-9a51-0c2b6f6a0003',
	buildField: '5f1d5c0e-6d1a-4f0e-9a51-0c2b6f6a0004',
	send: '5f1d5c0e-6d1a-4f0e-9a51-0c2b6f6a0005',
};

const SUBJECT = 'Your daily inbox digest';

type WorkflowNode = NonNullable<WorkflowDataCreate['nodes']>[number];

function buildReadNode(provider: DigestProvider, name: string): WorkflowNode {
	if (provider === 'outlook') {
		return {
			id: NODE_IDS.read,
			name,
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			position: [240, 0],
			parameters: { resource: 'message', operation: 'getAll', returnAll: false, limit: 10 },
		};
	}

	return {
		id: NODE_IDS.read,
		name,
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		position: [240, 0],
		parameters: {
			resource: 'message',
			operation: 'getAll',
			returnAll: false,
			limit: 10,
			filters: { readStatus: 'unread' },
		},
	};
}

/** Gives a mailbox node the connected credential, when there is one. */
function withMailboxCredential(
	node: WorkflowNode,
	{ provider, mailboxCredential }: DailyInboxDigestOptions,
): WorkflowNode {
	if (!mailboxCredential) return node;

	return { ...node, credentials: { [MAILBOX_CREDENTIAL_TYPE[provider]]: mailboxCredential } };
}

function buildSendNode(
	{ provider, recipientEmail }: DailyInboxDigestOptions,
	name: string,
): WorkflowNode {
	const base = { id: NODE_IDS.send, name, position: [720, 0] as [number, number] };

	if (provider === 'outlook') {
		return {
			...base,
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			parameters: {
				resource: 'message',
				operation: 'send',
				toRecipients: recipientEmail,
				subject: SUBJECT,
				bodyContent: '={{ $json.digest }}',
			},
		};
	}

	return {
		...base,
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		parameters: {
			resource: 'message',
			operation: 'send',
			sendTo: recipientEmail,
			subject: SUBJECT,
			emailType: 'text',
			message: '={{ $json.digest }}',
		},
	};
}

/**
 * The first workflow of the force-the-first-workflow experiment: every day, read the unread
 * emails of the user's mailbox, build a digest and send it. The answers of the flow set the
 * digest format, the run time and cadence, and the mailbox.
 */
export function buildDailyInboxDigestWorkflow(
	options: DailyInboxDigestOptions,
	names: DigestNodeNames,
): WorkflowDataCreate {
	const { format, hour, minute, weekdaysOnly, provider } = options;

	return {
		name: 'Daily inbox digest',
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				id: NODE_IDS.trigger,
				name: names.trigger,
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: {
					rule: {
						interval: [
							weekdaysOnly
								? {
										field: 'weeks',
										triggerAtDay: [1, 2, 3, 4, 5],
										triggerAtHour: hour,
										triggerAtMinute: minute,
									}
								: { field: 'days', triggerAtHour: hour, triggerAtMinute: minute },
						],
					},
				},
			},
			withMailboxCredential(buildReadNode(provider, names.read), options),
			{
				id: NODE_IDS.build,
				name: names.build,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [480, 0],
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [
							{
								id: NODE_IDS.buildField,
								name: 'digest',
								type: 'string',
								value: DIGEST_TEXT[format],
							},
						],
					},
					options: {},
				},
			},
			withMailboxCredential(buildSendNode(options, names.send), options),
		],
		connections: {
			[names.trigger]: { main: [[{ node: names.read, type: 'main', index: 0 }]] },
			[names.read]: { main: [[{ node: names.build, type: 'main', index: 0 }]] },
			[names.build]: { main: [[{ node: names.send, type: 'main', index: 0 }]] },
		},
	};
}
