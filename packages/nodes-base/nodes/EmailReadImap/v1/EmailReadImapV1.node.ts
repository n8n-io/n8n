import type { FetchOptions, Message, SearchCriteria } from '@n8n/imap';
import { ImapSimple } from '@n8n/imap';
import find from 'lodash/find';
import type { Source as ParserSource } from 'mailparser';
import { simpleParser } from 'mailparser';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	ITriggerFunctions,
	IBinaryKeyData,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

import { isCredentialsDataImap } from '@credentials/Imap.credentials';

import { toImapCredentials } from '../credentials';

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

const FETCH_OPTIONS: Record<string, FetchOptions> = {
	resolved: { bodies: [''], markSeen: false, struct: true },
	simple: { bodies: ['TEXT', 'HEADER'], markSeen: false, struct: true },
	raw: { bodies: ['TEXT', 'HEADER'], markSeen: false, struct: true },
};

/** Headers a `simple` item carries at the top level; every other header goes under `metadata`. */
const TOP_LEVEL_HEADERS = ['cc', 'date', 'from', 'subject', 'to'];

/** Turns one message into an item, or into nothing when it holds no usable mail. */
type ItemBuilder = (message: Message) => Promise<INodeExecutionData | undefined>;

function itemBuilderFor(
	this: ITriggerFunctions,
	format: string,
	imapConnection: ImapSimple,
): ItemBuilder {
	const attachmentPrefix = () =>
		this.getNodeParameter('dataPropertyAttachmentsPrefixName') as string;

	if (format === 'resolved') {
		const prefix = attachmentPrefix();

		return async (message) => {
			const part = find(message.parts, { which: '' });
			if (part === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			return await parseRawEmail.call(this, part.body as Buffer, prefix);
		};
	}

	if (format === 'simple') {
		const downloadAttachments = this.getNodeParameter('downloadAttachments') as boolean;
		const prefix = downloadAttachments ? attachmentPrefix() : '';

		return async (message) => {
			const json: IDataObject = {
				textHtml: await imapConnection.downloadText(message, 'html'),
				textPlain: await imapConnection.downloadText(message, 'plain'),
				metadata: {} as IDataObject,
			};

			const header = message.parts.filter((part) => part.which === 'HEADER')[0];
			for (const [name, values] of Object.entries(header.body as Record<string, string[]>)) {
				if (!values.length) continue;
				if (TOP_LEVEL_HEADERS.includes(name)) json[name] = values[0];
				else (json.metadata as IDataObject)[name] = values[0];
			}

			const item: INodeExecutionData = { json };

			if (downloadAttachments) {
				const attachments = await imapConnection.downloadAttachments(message);
				const binaries = await Promise.all(
					attachments.map(
						async ({ content, filename }) =>
							await this.helpers.prepareBinaryData(content, filename),
					),
				);

				if (binaries.length) {
					item.binary = Object.fromEntries(binaries.map((binary, i) => [`${prefix}${i}`, binary]));
				}
			}

			return item;
		};
	}

	if (format === 'raw') {
		return async (message) => {
			const part = find(message.parts, { which: 'TEXT' });
			if (part === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			return { json: { raw: part.body as string } };
		};
	}

	return async () => undefined;
}

const versionDescription: INodeTypeDescription = {
	displayName: 'Email Trigger (IMAP)',
	name: 'emailReadImap',
	icon: 'fa:inbox',
	group: ['trigger'],
	version: 1,
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
					displayName: 'Ignore SSL Issues (Insecure)',
					name: 'allowUnauthorizedCerts',
					type: 'boolean',
					default: false,
					description: 'Whether to connect even if SSL certificate validation is not possible',
				},
				{
					displayName: 'Force Reconnect',
					name: 'forceReconnect',
					type: 'number',
					default: 60,
					description: 'Sets an interval (in minutes) to force a reconnection',
				},
			],
		},
	],
};

export class EmailReadImapV1 implements INodeType {
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
				if (!isCredentialsDataImap(credential.data)) {
					return {
						status: 'Error',
						message: 'Credentials are no IMAP credentials.',
					};
				}

				let connection: ImapSimple | undefined;
				try {
					connection = await ImapSimple.connect(toImapCredentials(credential.data));
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
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('imap');
		if (!isCredentialsDataImap(credentials)) {
			throw new NodeOperationError(this.getNode(), 'Credentials are not valid for imap node.');
		}

		const mailbox = this.getNodeParameter('mailbox') as string;
		const postProcessAction = this.getNodeParameter('postProcessAction') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const staticData = this.getWorkflowStaticData('node');
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

		// Returns all the new unseen messages
		const getNewEmails = async (imapConnection: ImapSimple): Promise<INodeExecutionData[]> => {
			const format = this.getNodeParameter('format', 0) as string;
			const buildItem = itemBuilderFor.call(this, format, imapConnection);

			const results = await imapConnection.search(searchCriteria, FETCH_OPTIONS[format] ?? {});
			const newEmails: INodeExecutionData[] = [];

			for (const message of results) {
				const lastMessageUid = staticData.lastMessageUid as number | undefined;
				if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) continue;
				if (lastMessageUid === undefined || lastMessageUid < message.attributes.uid) {
					staticData.lastMessageUid = message.attributes.uid;
				}

				const item = await buildItem(message);
				if (item) newEmails.push(item);
			}

			// only mark messages as seen once processing has finished
			if (postProcessAction === 'read') {
				const uidList = results.map((e) => e.attributes.uid);
				if (uidList.length > 0) {
					await imapConnection.addFlags(uidList, '\\SEEN');
				}
			}

			return newEmails;
		};

		const fetchNewEmails = async (conn: ImapSimple) => {
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
				this.logger.debug('Querying for new messages on node "EmailReadImap"', {
					searchCriteria,
				});
			}

			try {
				const returnData = await getNewEmails(conn);
				if (returnData.length) {
					this.emit([returnData]);
				}
			} catch (error) {
				this.logger.error('Email Read Imap node encountered an error fetching new emails', {
					error,
				});
				if (conn.endedByCaller) return;
				// Wait with resolving till the returnedPromise got resolved, else n8n will be unhappy
				// if it receives an error before the workflow got activated
				await returnedPromise.promise.then(() => {
					this.emitError(error as Error);
				});
			}
		};

		const connection = await ImapSimple.connect(
			toImapCredentials(credentials, options.allowUnauthorizedCerts === true),
			{
				mailbox,
				interval:
					options.forceReconnect === undefined
						? undefined
						: (options.forceReconnect as number) * 1000 * 60,
			},
		);

		connection.onArrival(async () => await fetchNewEmails(connection));

		connection.onReconnect(() => {
			this.logger.debug('IMAP connection was restored');
		});

		connection.onError((error) => {
			this.logger.error('Email Read Imap node encountered a connection error', { error });
			this.emitError(error);
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
