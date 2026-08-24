import type { ICredentialsDataImap } from '@credentials/Imap.credentials';
import { isCredentialsDataImap } from '@credentials/Imap.credentials';
import type { SearchCriteria } from '@n8n/imap';
import { imapErrorCode, ImapSimple } from '@n8n/imap';
import { DateTime } from 'luxon';
import type {
	ITriggerFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	ITriggerResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { closeHandler } from '../connection-events';
import { toImapCredentials } from '../credentials';
import { getNewEmails } from './utils';

const versionDescription: INodeTypeDescription = {
	displayName: 'Email Trigger (IMAP)',
	name: 'emailReadImap',
	icon: 'fa:inbox',
	iconColor: 'green',
	group: ['trigger'],
	version: [2, 2.1, 2.2],
	description: 'Triggers the workflow when a new email is received',
	eventTriggerDescription: 'Waiting for you to receive an email',
	defaults: {
		name: 'Email Trigger (IMAP)',
		color: '#44AA22',
	},
	triggerPanel: {
		header: '',
		executionsHelp: {
			inactive:
				"<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, publish it. Then every time an email is received, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			active:
				"<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time an email is received, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
		},
		activationHint:
			'Once you’ve finished building your workflow, publish it to have it also listen continuously (you just won’t see those executions here).',
	},
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'imap',
			required: true,
			testedBy: 'imapConnectionTest',
		},
	],
	properties: [
		{
			displayName: 'Mailbox Name',
			name: 'mailbox',
			type: 'string',
			default: 'INBOX',
		},
		{
			displayName: 'Action',
			name: 'postProcessAction',
			type: 'options',
			options: [
				{
					name: 'Mark as Read',
					value: 'read',
				},
				{
					name: 'Nothing',
					value: 'nothing',
				},
			],
			default: 'read',
			description:
				'What to do after the email has been received. If "nothing" gets selected it will be processed multiple times.',
		},
		{
			displayName: 'Download Attachments',
			name: 'downloadAttachments',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					format: ['simple'],
				},
			},
			description:
				'Whether attachments of emails should be downloaded. Only set if needed as it increases processing.',
		},
		{
			displayName: 'Format',
			name: 'format',
			type: 'options',
			options: [
				{
					name: 'RAW',
					value: 'raw',
					description:
						'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
				},
				{
					name: 'Resolved',
					value: 'resolved',
					description:
						'Returns the full email with all data resolved and attachments saved as binary data',
				},
				{
					name: 'Simple',
					value: 'simple',
					description:
						'Returns the full email; do not use if you wish to gather inline attachments',
				},
			],
			default: 'simple',
			description: 'The format to return the message in',
		},
		{
			displayName: 'Property Prefix Name',
			name: 'dataPropertyAttachmentsPrefixName',
			type: 'string',
			default: 'attachment_',
			displayOptions: {
				show: {
					format: ['resolved'],
				},
			},
			description:
				'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
		},
		{
			displayName: 'Property Prefix Name',
			name: 'dataPropertyAttachmentsPrefixName',
			type: 'string',
			default: 'attachment_',
			displayOptions: {
				show: {
					format: ['simple'],
					downloadAttachments: [true],
				},
			},
			description:
				'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Custom Email Rules',
					name: 'customEmailConfig',
					type: 'string',
					default: '["UNSEEN"]',
					description:
						'Custom email fetching rules. See <a href="https://github.com/mscdex/node-imap">node-imap</a>\'s search function for more details.',
				},
				{
					displayName: 'Force Reconnect Every Minutes',
					name: 'forceReconnect',
					type: 'number',
					default: 60,
					description: 'Sets an interval (in minutes) to force a reconnection',
				},
				{
					displayName: 'Fetch Only New Emails',
					name: 'trackLastMessageId',
					type: 'boolean',
					default: true,
					description:
						'Whether to fetch only new emails since the last run, or all emails that match the "Custom Email Rules" (["UNSEEN"] by default)',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 2.1 } }],
						},
					},
				},
			],
		},
	],
};

export class EmailReadImapV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		credentialTest: {
			async imapConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				if (isCredentialsDataImap(credential.data)) {
					const credentials = credential.data as ICredentialsDataImap;
					let connection: ImapSimple | undefined;
					try {
						connection = await ImapSimple.connect(toImapCredentials(credentials));
						await connection.getBoxes();
					} catch (error) {
						return {
							status: 'Error',
							message: (error as Error).message,
						};
					} finally {
						connection?.end();
					}
					return {
						status: 'OK',
						message: 'Connection successful!',
					};
				} else {
					return {
						status: 'Error',
						message: 'Credentials are no IMAP credentials.',
					};
				}
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const node = this.getNode();
		const credentialsObject = await this.getCredentials('imap');
		const credentials = isCredentialsDataImap(credentialsObject) ? credentialsObject : undefined;
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credentials are not valid for imap node.');
		}
		const mailbox = this.getNodeParameter('mailbox') as string;
		const postProcessAction = this.getNodeParameter('postProcessAction') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const activatedAt = DateTime.now();

		const staticData = this.getWorkflowStaticData('node');
		if (node.typeVersion <= 2) {
			// before v 2.1 staticData.lastMessageUid was never set, preserve that behavior
			staticData.lastMessageUid = undefined;
		}

		if (options.trackLastMessageId === false) {
			staticData.lastMessageUid = undefined;
		}

		this.logger.debug('Loaded static data for node "EmailReadImap"', { staticData });

		const returnedPromise = this.helpers.createDeferredPromise();

		let searchCriteria: SearchCriteria[] = ['UNSEEN'];
		if (options.customEmailConfig !== undefined) {
			try {
				searchCriteria = JSON.parse(options.customEmailConfig as string) as SearchCriteria[];
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Custom email config is not valid JSON.');
			}
		}

		const fetchNewEmails = async (conn: ImapSimple, numEmails: number) => {
			this.logger.debug('New emails received in node "EmailReadImap"', {
				numEmails,
			});

			// Create a fresh copy to avoid accumulating filters across calls
			const currentSearchCriteria = [...searchCriteria];

			/**
			 * Only process new emails:
			 * - If we've seen emails before (lastMessageUid is set), fetch messages higher UID.
			 * - Otherwise, fetch emails received since the workflow activation date.
			 *
			 * Note: IMAP 'SINCE' only filters by date (not time),
			 * so it may include emails from earlier on the activation day.
			 */
			if (staticData.lastMessageUid !== undefined) {
				/**
				 * A short explanation about UIDs and how they work
				 * can be found here: https://dev.to/kehers/imap-new-messages-since-last-check-44gm
				 * TL;DR:
				 * - You cannot filter using ['UID', 'CURRENT ID + 1:*'] because IMAP
				 * won't return correct results if current id + 1 does not yet exist.
				 * - UIDs can change but this is not being treated here.
				 * If the mailbox is recreated (lets say you remove all emails, remove
				 * the mail box and create another with same name, UIDs will change)
				 * - You can check if UIDs changed in the above example
				 * by checking UIDValidity.
				 */
				currentSearchCriteria.push(['UID', `${staticData.lastMessageUid as number}:*`]);
			} else if (node.typeVersion > 2 && options.trackLastMessageId !== false) {
				currentSearchCriteria.push(['SINCE', activatedAt.toFormat('dd-LLL-yyyy')]);
			}

			this.logger.debug('Querying for new messages on node "EmailReadImap"', {
				searchCriteria: currentSearchCriteria,
			});

			try {
				await getNewEmails.call(this, {
					imapConnection: conn,
					searchCriteria: currentSearchCriteria,
					postProcessAction,
					onEmailBatch: async (returnData: INodeExecutionData[]) => {
						if (returnData.length) {
							this.emit([returnData]);
						}
					},
				});
			} catch (error) {
				this.logger.error('Email Read Imap node encountered an error fetching new emails', {
					error: error as Error,
				});
				if (conn.endedByCaller) return;
				// A drop mid-fetch is the connection's to recover from; it reports if it cannot.
				throw error;
			}
		};

		const connection = await ImapSimple.connect(toImapCredentials(credentials), {
			mailbox,
			interval:
				options.forceReconnect === undefined
					? undefined
					: (options.forceReconnect as number) * 1000 * 60,
		});

		connection.onArrival(async ({ count }) => await fetchNewEmails(connection, count));

		connection.onFlags(({ seqNo, info }) => {
			this.logger.debug(`Email Read Imap:update ${seqNo}`, info as IDataObject);
		});

		connection.onReconnect(() => {
			this.logger.debug('Email Read Imap: Connection restored');
		});

		connection.onClose(closeHandler(this));

		connection.onError((error) => {
			this.logger.debug(`IMAP connection experienced an error: (${imapErrorCode(error)})`, {
				error,
			});
			// Held back until the workflow is active, else n8n is unhappy about an early error
			void returnedPromise.promise.then(() => this.emitError(error));
		});

		// An unreachable mail server must never be able to block deactivation.
		const closeFunction = async () => connection.end();

		// Resolve returned-promise so that waiting errors can be emitted
		returnedPromise.resolve();

		return {
			closeFunction,
		};
	}
}
