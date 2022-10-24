/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { ITriggerFunctions } from 'n8n-core';
import {
	createDeferredPromise,
	IBinaryData,
	IBinaryKeyData,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IDeferredPromise,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	ITriggerResponse,
	LoggerProxy as Logger,
	NodeOperationError,
} from 'n8n-workflow';

import {
	connect as imapConnect,
	getParts,
	ImapSimple,
	ImapSimpleOptions,
	Message,
} from 'imap-simple';
import { simpleParser, Source as ParserSource } from 'mailparser';

import _ from 'lodash';
import { ICredentialsDataImap, isCredentialsDataImap } from '../../../credentials/Imap.credentials';

const versionDescription: INodeTypeDescription = {
	displayName: 'Email Trigger (IMAP)',
	name: 'emailReadImap',
	icon: 'fa:inbox',
	group: ['trigger'],
	version: 2,
	description: 'Triggers the workflow when a new email is received',
	eventTriggerDescription: 'Waiting for you to receive an email',
	defaults: {
		name: 'IMAP Email',
		color: '#44AA22',
	},
	// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
	inputs: [],
	outputs: ['main'],
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
			placeholder: 'Add Option',
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
								host: credentials.host,
								port: credentials.port,
								tls: credentials.secure,
								authTimeout: 20000,
							},
						};
						const tlsOptions: IDataObject = {};

						if (credentials.allowUnauthorizedCerts === true) {
							tlsOptions.rejectUnauthorized = false;
						}

						if (credentials.secure) {
							tlsOptions.servername = credentials.host;
						}
						if (!_.isEmpty(tlsOptions)) {
							config.imap.tlsOptions = tlsOptions;
						}
						const connection = await imapConnect(config);
						await connection.getBoxes();
						connection.end();
					} catch (error) {
						return {
							status: 'Error',
							message: error.message,
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
			throw new NodeOperationError(this.getNode(), `Credentials are not valid for imap node.`);
		}
		const mailbox = this.getNodeParameter('mailbox') as string;
		const postProcessAction = this.getNodeParameter('postProcessAction') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const staticData = this.getWorkflowStaticData('node');
		Logger.debug('Loaded static data for node "EmailReadImap"', { staticData });

		let connection: ImapSimple;
		let closeFunctionWasCalled = false;
		let isCurrentlyReconnecting = false;

		// Returns the email text
		// tslint:disable-next-line:no-any
		const getText = async (parts: any[], message: Message, subtype: string) => {
			if (!message.attributes.struct) {
				return '';
			}

			const textParts = parts.filter((part) => {
				return (
					part.type.toUpperCase() === 'TEXT' && part.subtype.toUpperCase() === subtype.toUpperCase()
				);
			});

			if (textParts.length === 0) {
				return '';
			}

			try {
				return await connection.getPartData(message, textParts[0]);
			} catch {
				return '';
			}
		};

		// Returns the email attachments
		const getAttachment = async (
			connection: ImapSimple,
			// tslint:disable-next-line:no-any
			parts: any[],
			message: Message,
		): Promise<IBinaryData[]> => {
			if (!message.attributes.struct) {
				return [];
			}

			// Check if the message has attachments and if so get them
			const attachmentParts = parts.filter((part) => {
				return part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT';
			});

			const attachmentPromises = [];
			let attachmentPromise;
			for (const attachmentPart of attachmentParts) {
				attachmentPromise = connection.getPartData(message, attachmentPart).then((partData) => {
					// Return it in the format n8n expects
					return this.helpers.prepareBinaryData(
						partData,
						attachmentPart.disposition.params.filename,
					);
				});

				attachmentPromises.push(attachmentPromise);
			}

			return Promise.all(attachmentPromises);
		};

		// Returns all the new unseen messages
		const getNewEmails = async (
			connection: ImapSimple,
			searchCriteria: Array<string | string[]>,
		): Promise<INodeExecutionData[]> => {
			const format = this.getNodeParameter('format', 0) as string;

			let fetchOptions = {};

			if (format === 'simple' || format === 'raw') {
				fetchOptions = {
					bodies: ['TEXT', 'HEADER'],
					markSeen: false,
					struct: true,
				};
			} else if (format === 'resolved') {
				fetchOptions = {
					bodies: [''],
					markSeen: false,
					struct: true,
				};
			}

			const results = await connection.search(searchCriteria, fetchOptions);

			const newEmails: INodeExecutionData[] = [];
			let newEmail: INodeExecutionData, messageHeader, messageBody;
			let attachments: IBinaryData[];
			let propertyName: string;

			// All properties get by default moved to metadata except the ones
			// which are defined here which get set on the top level.
			const topLevelProperties = ['cc', 'date', 'from', 'subject', 'to'];

			if (format === 'resolved') {
				const dataPropertyAttachmentsPrefixName = this.getNodeParameter(
					'dataPropertyAttachmentsPrefixName',
				) as string;

				for (const message of results) {
					if (
						staticData.lastMessageUid !== undefined &&
						message.attributes.uid <= (staticData.lastMessageUid as number)
					) {
						continue;
					}
					if (
						staticData.lastMessageUid === undefined ||
						(staticData.lastMessageUid as number) < message.attributes.uid
					) {
						staticData.lastMessageUid = message.attributes.uid;
					}
					const part = _.find(message.parts, { which: '' });

					if (part === undefined) {
						throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
					}
					const parsedEmail = await parseRawEmail.call(
						this,
						part.body,
						dataPropertyAttachmentsPrefixName,
					);

					newEmails.push(parsedEmail);
				}
			} else if (format === 'simple') {
				const downloadAttachments = this.getNodeParameter('downloadAttachments') as boolean;

				let dataPropertyAttachmentsPrefixName = '';
				if (downloadAttachments === true) {
					dataPropertyAttachmentsPrefixName = this.getNodeParameter(
						'dataPropertyAttachmentsPrefixName',
					) as string;
				}

				for (const message of results) {
					if (
						staticData.lastMessageUid !== undefined &&
						message.attributes.uid <= (staticData.lastMessageUid as number)
					) {
						continue;
					}
					if (
						staticData.lastMessageUid === undefined ||
						(staticData.lastMessageUid as number) < message.attributes.uid
					) {
						staticData.lastMessageUid = message.attributes.uid;
					}
					const parts = getParts(message.attributes.struct!);

					newEmail = {
						json: {
							textHtml: await getText(parts, message, 'html'),
							textPlain: await getText(parts, message, 'plain'),
							metadata: {} as IDataObject,
						},
					};

					messageHeader = message.parts.filter((part) => {
						return part.which === 'HEADER';
					});

					messageBody = messageHeader[0].body;
					for (propertyName of Object.keys(messageBody)) {
						if (messageBody[propertyName].length) {
							if (topLevelProperties.includes(propertyName)) {
								newEmail.json[propertyName] = messageBody[propertyName][0];
							} else {
								(newEmail.json.metadata as IDataObject)[propertyName] =
									messageBody[propertyName][0];
							}
						}
					}

					if (downloadAttachments === true) {
						// Get attachments and add them if any get found
						attachments = await getAttachment(connection, parts, message);
						if (attachments.length) {
							newEmail.binary = {};
							for (let i = 0; i < attachments.length; i++) {
								newEmail.binary[`${dataPropertyAttachmentsPrefixName}${i}`] = attachments[i];
							}
						}
					}

					newEmails.push(newEmail);
				}
			} else if (format === 'raw') {
				for (const message of results) {
					if (
						staticData.lastMessageUid !== undefined &&
						message.attributes.uid <= (staticData.lastMessageUid as number)
					) {
						continue;
					}
					if (
						staticData.lastMessageUid === undefined ||
						(staticData.lastMessageUid as number) < message.attributes.uid
					) {
						staticData.lastMessageUid = message.attributes.uid;
					}
					const part = _.find(message.parts, { which: 'TEXT' });

					if (part === undefined) {
						throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
					}
					// Return base64 string
					newEmail = {
						json: {
							raw: part.body,
						},
					};

					newEmails.push(newEmail);
				}
			}

			// only mark messages as seen once processing has finished
			if (postProcessAction === 'read') {
				const uidList = results.map((e) => e.attributes.uid);
				if (uidList.length > 0) {
					connection.addFlags(uidList, '\\SEEN');
				}
			}
			return newEmails;
		};

		const returnedPromise: IDeferredPromise<void> | undefined = await createDeferredPromise<void>();

		const establishConnection = (): Promise<ImapSimple> => {
			let searchCriteria = ['UNSEEN'] as Array<string | string[]>;
			if (options.customEmailConfig !== undefined) {
				try {
					searchCriteria = JSON.parse(options.customEmailConfig as string);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Custom email config is not valid JSON.`);
				}
			}

			const config: ImapSimpleOptions = {
				imap: {
					user: credentials.user,
					password: credentials.password,
					host: credentials.host,
					port: credentials.port,
					tls: credentials.secure,
					authTimeout: 20000,
				},
				onmail: async () => {
					if (connection) {
						if (staticData.lastMessageUid !== undefined) {
							searchCriteria.push(['UID', `${staticData.lastMessageUid as number}:*`]);
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
							Logger.debug('Querying for new messages on node "EmailReadImap"', { searchCriteria });
						}

						try {
							const returnData = await getNewEmails(connection, searchCriteria);
							if (returnData.length) {
								this.emit([returnData]);
							}
						} catch (error) {
							Logger.error('Email Read Imap node encountered an error fetching new emails', {
								error,
							});
							// Wait with resolving till the returnedPromise got resolved, else n8n will be unhappy
							// if it receives an error before the workflow got activated
							returnedPromise.promise().then(() => {
								this.emitError(error as Error);
							});
						}
					}
				},
				onupdate: async (seqno: number, info) => {
					Logger.verbose(`Email Read Imap:update ${seqno}`, info);
				},
			};

			const tlsOptions: IDataObject = {};

			if (credentials.allowUnauthorizedCerts === true) {
				tlsOptions.rejectUnauthorized = false;
			}

			if (credentials.secure) {
				tlsOptions.servername = credentials.host as string;
			}

			if (!_.isEmpty(tlsOptions)) {
				config.imap.tlsOptions = tlsOptions;
			}

			// Connect to the IMAP server and open the mailbox
			// that we get informed whenever a new email arrives
			return imapConnect(config).then(async (conn) => {
				conn.on('close', async (hadError: boolean) => {
					if (isCurrentlyReconnecting === true) {
						Logger.debug(`Email Read Imap: Connected closed for forced reconnecting`);
					} else if (closeFunctionWasCalled === true) {
						Logger.debug(`Email Read Imap: Shutting down workflow - connected closed`);
					} else {
						Logger.error(`Email Read Imap: Connected closed unexpectedly`);
						this.emitError(new Error('Imap connection closed unexpectedly'));
					}
				});
				conn.on('error', async (error) => {
					const errorCode = error.code.toUpperCase();
					Logger.verbose(`IMAP connection experienced an error: (${errorCode})`, { error });
					await closeFunction();
					this.emitError(error);
				});
				return conn;
			});
		};

		connection = await establishConnection();

		await connection.openBox(mailbox);

		let reconnectionInterval: NodeJS.Timeout | undefined;

		if (options.forceReconnect !== undefined) {
			reconnectionInterval = setInterval(async () => {
				Logger.verbose(`Forcing reconnect to IMAP server`);
				try {
					isCurrentlyReconnecting = true;
					if (connection.closeBox) connection.closeBox(false);
					connection.end();
					connection = await establishConnection();
					await connection.openBox(mailbox);
				} catch (error) {
					Logger.error(error);
				} finally {
					isCurrentlyReconnecting = false;
				}
			}, (options.forceReconnect as number) * 1000 * 60);
		}

		// When workflow and so node gets set to inactive close the connectoin
		async function closeFunction() {
			closeFunctionWasCalled = true;
			if (reconnectionInterval) {
				clearInterval(reconnectionInterval);
			}
			if (connection.closeBox) connection.closeBox(false);
			connection.end();
		}

		// Resolve returned-promise so that waiting errors can be emitted
		returnedPromise.resolve();

		return {
			closeFunction,
		};
	}
}

export async function parseRawEmail(
	this: ITriggerFunctions,
	messageEncoded: ParserSource,
	dataPropertyNameDownload: string,
): Promise<INodeExecutionData> {
	const responseData = await simpleParser(messageEncoded);
	const headers: IDataObject = {};
	for (const header of responseData.headerLines) {
		headers[header.key] = header.line;
	}

	// @ts-ignore
	responseData.headers = headers;
	// @ts-ignore
	responseData.headerLines = undefined;

	const binaryData: IBinaryKeyData = {};
	if (responseData.attachments) {
		for (let i = 0; i < responseData.attachments.length; i++) {
			const attachment = responseData.attachments[i];
			binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
				attachment.content,
				attachment.filename,
				attachment.contentType,
			);
		}
		// @ts-ignore
		responseData.attachments = undefined;
	}

	return {
		json: responseData as unknown as IDataObject,
		binary: Object.keys(binaryData).length ? binaryData : undefined,
	} as INodeExecutionData;
}
