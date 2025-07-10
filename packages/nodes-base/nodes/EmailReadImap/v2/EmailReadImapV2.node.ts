import type { ICredentialsDataImap } from '@credentials/Imap.credentials';
import { isCredentialsDataImap } from '@credentials/Imap.credentials';
import type {
	ImapSimple,
	ImapSimpleOptions,
	Message,
	MessagePart,
	SearchCriteria,
} from '@n8n/imap';
import { connect as imapConnect } from '@n8n/imap';
import isEmpty from 'lodash/isEmpty';
import { DateTime } from 'luxon';
import type {
	ITriggerFunctions,
	IBinaryData,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	ITriggerResponse,
	JsonObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, TriggerCloseError } from 'n8n-workflow';
import rfc2047 from 'rfc2047';

import { getNewEmails } from './utils';

const versionDescription: INodeTypeDescription = {
	displayName: 'Email Trigger (IMAP)',
	name: 'emailReadImap',
	icon: 'fa:inbox',
	iconColor: 'green',
	group: ['trigger'],
	version: [2, 2.1],
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
				"<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time an email is received, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			active:
				"<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time an email is received, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
		},
		activationHint:
			"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
	},
	usableAsTool: true,
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
					try {
						const config: ImapSimpleOptions = {
							imap: {
								user: credentials.user,
								password: credentials.password,
								host: credentials.host.trim(),
								port: credentials.port,
								tls: credentials.secure,
								authTimeout: 20000,
							},
						};
						const tlsOptions: IDataObject = {};

						if (credentials.allowUnauthorizedCerts) {
							tlsOptions.rejectUnauthorized = false;
						}

						if (credentials.secure) {
							tlsOptions.servername = credentials.host.trim();
						}
						if (!isEmpty(tlsOptions)) {
							config.imap.tlsOptions = tlsOptions;
						}
						const connection = await imapConnect(config);
						await connection.getBoxes();
						connection.end();
					} catch (error) {
						return {
							status: 'Error',
							message: (error as Error).message,
						};
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
		this.logger.debug('Loaded static data for node "EmailReadImap"', { staticData });

		let connection: ImapSimple;
		let closeFunctionWasCalled = false;
		let isCurrentlyReconnecting = false;

		// Returns the email text

		const getText = async (
			parts: MessagePart[],
			message: Message,
			subtype: string,
		): Promise<string> => {
			if (!message.attributes.struct) {
				return '';
			}

			const textParts = parts.filter((part) => {
				return (
					part.type.toUpperCase() === 'TEXT' && part.subtype.toUpperCase() === subtype.toUpperCase()
				);
			});

			const part = textParts[0];
			if (!part) {
				return '';
			}

			try {
				const partData = await connection.getPartData(message, part);
				return partData.toString();
			} catch {
				return '';
			}
		};

		// Returns the email attachments
		const getAttachment = async (
			imapConnection: ImapSimple,
			parts: MessagePart[],
			message: Message,
		): Promise<IBinaryData[]> => {
			if (!message.attributes.struct) {
				return [];
			}

			// Check if the message has attachments and if so get them
			const attachmentParts = parts.filter(
				(part) => part.disposition?.type?.toUpperCase() === 'ATTACHMENT',
			);

			const decodeFilename = (filename: string) => {
				const regex = /=\?([\w-]+)\?Q\?.*\?=/i;
				if (regex.test(filename)) {
					return rfc2047.decode(filename);
				}
				return filename;
			};

			const attachmentPromises = [];
			let attachmentPromise;
			for (const attachmentPart of attachmentParts) {
				attachmentPromise = imapConnection
					.getPartData(message, attachmentPart)
					.then(async (partData) => {
						// if filename contains utf-8 encoded characters, decode it
						const fileName = decodeFilename(
							((attachmentPart.disposition as IDataObject)?.params as IDataObject)
								?.filename as string,
						);
						// Return it in the format n8n expects
						return await this.helpers.prepareBinaryData(partData.buffer, fileName);
					});

				attachmentPromises.push(attachmentPromise);
			}

			return await Promise.all(attachmentPromises);
		};

		const returnedPromise = this.helpers.createDeferredPromise();

		const establishConnection = async (): Promise<ImapSimple> => {
			let searchCriteria: SearchCriteria[] = ['UNSEEN'];
			if (options.customEmailConfig !== undefined) {
				try {
					searchCriteria = JSON.parse(options.customEmailConfig as string) as SearchCriteria[];
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Custom email config is not valid JSON.');
				}
			}

			const config: ImapSimpleOptions = {
				imap: {
					user: credentials.user,
					password: credentials.password,
					host: credentials.host.trim(),
					port: credentials.port,
					tls: credentials.secure,
					authTimeout: 20000,
				},
				onMail: async (numEmails) => {
					this.logger.debug('New emails received in node "EmailReadImap"', {
						numEmails,
					});

					if (connection) {
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
							searchCriteria.push(['UID', `${staticData.lastMessageUid as number}:*`]);
						} else {
							searchCriteria.push(['SINCE', activatedAt.toFormat('dd-LLL-yyyy')]);
						}

						this.logger.debug('Querying for new messages on node "EmailReadImap"', {
							searchCriteria,
						});

						try {
							await getNewEmails.call(this, {
								imapConnection: connection,
								searchCriteria,
								postProcessAction,
								getText,
								getAttachment,
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
							// Wait with resolving till the returnedPromise got resolved, else n8n will be unhappy
							// if it receives an error before the workflow got activated
							await returnedPromise.promise.then(() => {
								this.emitError(error as Error);
							});
						}
					}
				},
				onUpdate: (seqNo: number, info) => {
					this.logger.debug(`Email Read Imap:update ${seqNo}`, info);
				},
			};

			const tlsOptions: IDataObject = {};

			if (credentials.allowUnauthorizedCerts) {
				tlsOptions.rejectUnauthorized = false;
			}

			if (credentials.secure) {
				tlsOptions.servername = credentials.host.trim();
			}

			if (!isEmpty(tlsOptions)) {
				config.imap.tlsOptions = tlsOptions;
			}

			// Connect to the IMAP server and open the mailbox
			// that we get informed whenever a new email arrives
			return await imapConnect(config).then((conn) => {
				conn.on('close', (_hadError: boolean) => {
					if (isCurrentlyReconnecting) {
						this.logger.debug('Email Read Imap: Connected closed for forced reconnecting');
					} else if (closeFunctionWasCalled) {
						this.logger.debug('Email Read Imap: Shutting down workflow - connected closed');
					} else {
						this.logger.error('Email Read Imap: Connected closed unexpectedly');
						this.emitError(new Error('Imap connection closed unexpectedly'));
					}
				});
				conn.on('error', (error) => {
					const errorCode = ((error as JsonObject).code as string).toUpperCase();
					this.logger.debug(`IMAP connection experienced an error: (${errorCode})`, {
						error: error as Error,
					});
					this.emitError(error as Error);
				});
				return conn;
			});
		};

		connection = await establishConnection();

		await connection.openBox(mailbox);

		let reconnectionInterval: NodeJS.Timeout | undefined;

		const handleReconnect = async () => {
			this.logger.debug('Forcing reconnect to IMAP server');
			try {
				isCurrentlyReconnecting = true;
				if (connection.closeBox) await connection.closeBox(false);
				connection.end();
				connection = await establishConnection();
				await connection.openBox(mailbox);
			} catch (error) {
				this.logger.error(error as string);
			} finally {
				isCurrentlyReconnecting = false;
			}
		};

		if (options.forceReconnect !== undefined) {
			reconnectionInterval = setInterval(
				handleReconnect,
				(options.forceReconnect as number) * 1000 * 60,
			);
		}

		// When workflow and so node gets set to inactive close the connection
		const closeFunction = async () => {
			closeFunctionWasCalled = true;
			if (reconnectionInterval) {
				clearInterval(reconnectionInterval);
			}
			try {
				if (connection.closeBox) await connection.closeBox(false);
				connection.end();
			} catch (error) {
				throw new TriggerCloseError(this.getNode(), { cause: error as Error, level: 'warning' });
			}
		};

		// Resolve returned-promise so that waiting errors can be emitted
		returnedPromise.resolve();

		return {
			closeFunction,
		};
	}
}
