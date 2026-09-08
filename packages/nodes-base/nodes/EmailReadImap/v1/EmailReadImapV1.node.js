import { connect as imapConnect, getParts } from '@n8n/imap';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { simpleParser } from 'mailparser';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
export async function parseRawEmail(messageEncoded, dataPropertyNameDownload) {
    const responseData = await simpleParser(messageEncoded);
    const headers = {};
    for (const header of responseData.headerLines) {
        headers[header.key] = header.line;
    }
    // @ts-ignore
    responseData.headers = headers;
    // @ts-ignore
    responseData.headerLines = undefined;
    const binaryData = {};
    if (responseData.attachments) {
        for (let i = 0; i < responseData.attachments.length; i++) {
            const attachment = responseData.attachments[i];
            binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(attachment.content, attachment.filename, attachment.contentType);
        }
        // @ts-ignore
        responseData.attachments = undefined;
    }
    return {
        json: responseData,
        binary: Object.keys(binaryData).length ? binaryData : undefined,
    };
}
const versionDescription = {
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
            inactive: "<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, publish it. Then every time an email is received, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
            active: "<b>While building your workflow</b>, click the 'execute step' button, then send an email to make an event happen. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time an email is received, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
        },
        activationHint: 'Once you’ve finished building your workflow, publish it to have it also listen continuously (you just won’t see those executions here).',
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
            description: 'What to do after the email has been received. If "nothing" gets selected it will be processed multiple times.',
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
            description: 'Whether attachments of emails should be downloaded. Only set if needed as it increases processing.',
        },
        {
            displayName: 'Format',
            name: 'format',
            type: 'options',
            options: [
                {
                    name: 'RAW',
                    value: 'raw',
                    description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
                },
                {
                    name: 'Resolved',
                    value: 'resolved',
                    description: 'Returns the full email with all data resolved and attachments saved as binary data',
                },
                {
                    name: 'Simple',
                    value: 'simple',
                    description: 'Returns the full email; do not use if you wish to gather inline attachments',
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
            description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
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
            description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
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
                    description: 'Custom email fetching rules. See <a href="https://github.com/mscdex/node-imap">node-imap</a>\'s search function for more details.',
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
export class EmailReadImapV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        credentialTest: {
            async imapConnectionTest(credential) {
                const credentials = credential.data;
                try {
                    const config = {
                        imap: {
                            user: credentials.user,
                            password: credentials.password,
                            host: credentials.host.trim(),
                            port: credentials.port,
                            tls: credentials.secure,
                            authTimeout: 20000,
                        },
                    };
                    const tlsOptions = {};
                    if (credentials.secure) {
                        tlsOptions.servername = credentials.host.trim();
                    }
                    if (!isEmpty(tlsOptions)) {
                        config.imap.tlsOptions = tlsOptions;
                    }
                    const connection = await imapConnect(config);
                    await connection.getBoxes();
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: error.message,
                    };
                }
                return {
                    status: 'OK',
                    message: 'Connection successful!',
                };
            },
        },
    };
    async trigger() {
        const credentials = await this.getCredentials('imap');
        const mailbox = this.getNodeParameter('mailbox');
        const postProcessAction = this.getNodeParameter('postProcessAction');
        const options = this.getNodeParameter('options', {});
        const staticData = this.getWorkflowStaticData('node');
        this.logger.debug('Loaded static data for node "EmailReadImap"', { staticData });
        let connection;
        // Returns the email text
        const getText = async (parts, message, subtype) => {
            if (!message.attributes.struct) {
                return '';
            }
            const textParts = parts.filter((part) => {
                return (part.type.toUpperCase() === 'TEXT' && part.subtype.toUpperCase() === subtype.toUpperCase());
            });
            const part = textParts[0];
            if (!part) {
                return '';
            }
            try {
                const partData = await connection.getPartData(message, part);
                return partData.toString();
            }
            catch {
                return '';
            }
        };
        // Returns the email attachments
        const getAttachment = async (imapConnection, parts, message) => {
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
                attachmentPromise = imapConnection
                    .getPartData(message, attachmentPart)
                    .then(async (partData) => {
                    // Return it in the format n8n expects
                    return await this.helpers.prepareBinaryData(partData.buffer, attachmentPart.disposition.params.filename);
                });
                attachmentPromises.push(attachmentPromise);
            }
            return await Promise.all(attachmentPromises);
        };
        // Returns all the new unseen messages
        const getNewEmails = async (imapConnection, searchCriteria) => {
            const format = this.getNodeParameter('format', 0);
            let fetchOptions = {};
            if (format === 'simple' || format === 'raw') {
                fetchOptions = {
                    bodies: ['TEXT', 'HEADER'],
                    markSeen: false,
                    struct: true,
                };
            }
            else if (format === 'resolved') {
                fetchOptions = {
                    bodies: [''],
                    markSeen: false,
                    struct: true,
                };
            }
            const results = await imapConnection.search(searchCriteria, fetchOptions);
            const newEmails = [];
            let newEmail;
            let attachments;
            let propertyName;
            // All properties get by default moved to metadata except the ones
            // which are defined here which get set on the top level.
            const topLevelProperties = ['cc', 'date', 'from', 'subject', 'to'];
            if (format === 'resolved') {
                const dataPropertyAttachmentsPrefixName = this.getNodeParameter('dataPropertyAttachmentsPrefixName');
                for (const message of results) {
                    if (staticData.lastMessageUid !== undefined &&
                        message.attributes.uid <= staticData.lastMessageUid) {
                        continue;
                    }
                    if (staticData.lastMessageUid === undefined ||
                        staticData.lastMessageUid < message.attributes.uid) {
                        staticData.lastMessageUid = message.attributes.uid;
                    }
                    const part = find(message.parts, { which: '' });
                    if (part === undefined) {
                        throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
                    }
                    const parsedEmail = await parseRawEmail.call(this, part.body, dataPropertyAttachmentsPrefixName);
                    newEmails.push(parsedEmail);
                }
            }
            else if (format === 'simple') {
                const downloadAttachments = this.getNodeParameter('downloadAttachments');
                let dataPropertyAttachmentsPrefixName = '';
                if (downloadAttachments) {
                    dataPropertyAttachmentsPrefixName = this.getNodeParameter('dataPropertyAttachmentsPrefixName');
                }
                for (const message of results) {
                    if (staticData.lastMessageUid !== undefined &&
                        message.attributes.uid <= staticData.lastMessageUid) {
                        continue;
                    }
                    if (staticData.lastMessageUid === undefined ||
                        staticData.lastMessageUid < message.attributes.uid) {
                        staticData.lastMessageUid = message.attributes.uid;
                    }
                    const parts = getParts(message.attributes.struct);
                    newEmail = {
                        json: {
                            textHtml: await getText(parts, message, 'html'),
                            textPlain: await getText(parts, message, 'plain'),
                            metadata: {},
                        },
                    };
                    const messageHeader = message.parts.filter((part) => part.which === 'HEADER');
                    const messageBody = messageHeader[0].body;
                    for (propertyName of Object.keys(messageBody)) {
                        if (messageBody[propertyName].length) {
                            if (topLevelProperties.includes(propertyName)) {
                                newEmail.json[propertyName] = messageBody[propertyName][0];
                            }
                            else {
                                newEmail.json.metadata[propertyName] =
                                    messageBody[propertyName][0];
                            }
                        }
                    }
                    if (downloadAttachments) {
                        // Get attachments and add them if any get found
                        attachments = await getAttachment(imapConnection, parts, message);
                        if (attachments.length) {
                            newEmail.binary = {};
                            for (let i = 0; i < attachments.length; i++) {
                                newEmail.binary[`${dataPropertyAttachmentsPrefixName}${i}`] = attachments[i];
                            }
                        }
                    }
                    newEmails.push(newEmail);
                }
            }
            else if (format === 'raw') {
                for (const message of results) {
                    if (staticData.lastMessageUid !== undefined &&
                        message.attributes.uid <= staticData.lastMessageUid) {
                        continue;
                    }
                    if (staticData.lastMessageUid === undefined ||
                        staticData.lastMessageUid < message.attributes.uid) {
                        staticData.lastMessageUid = message.attributes.uid;
                    }
                    const part = find(message.parts, { which: 'TEXT' });
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
                    await imapConnection.addFlags(uidList, '\\SEEN');
                }
            }
            return newEmails;
        };
        const returnedPromise = this.helpers.createDeferredPromise();
        const establishConnection = async () => {
            let searchCriteria = ['UNSEEN'];
            if (options.customEmailConfig !== undefined) {
                try {
                    searchCriteria = JSON.parse(options.customEmailConfig);
                }
                catch (error) {
                    throw new NodeOperationError(this.getNode(), 'Custom email config is not valid JSON.');
                }
            }
            const config = {
                imap: {
                    user: credentials.user,
                    password: credentials.password,
                    host: credentials.host.trim(),
                    port: credentials.port,
                    tls: credentials.secure,
                    authTimeout: 20000,
                },
                onMail: async () => {
                    if (connection) {
                        if (staticData.lastMessageUid !== undefined) {
                            searchCriteria.push(['UID', `${staticData.lastMessageUid}:*`]);
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
                            const returnData = await getNewEmails(connection, searchCriteria);
                            if (returnData.length) {
                                this.emit([returnData]);
                            }
                        }
                        catch (error) {
                            this.logger.error('Email Read Imap node encountered an error fetching new emails', {
                                error,
                            });
                            // Wait with resolving till the returnedPromise got resolved, else n8n will be unhappy
                            // if it receives an error before the workflow got activated
                            await returnedPromise.promise.then(() => {
                                this.emitError(error);
                            });
                        }
                    }
                },
            };
            const tlsOptions = {};
            if (options.allowUnauthorizedCerts === true) {
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
            return await imapConnect(config).then(async (conn) => {
                conn.on('error', async (error) => {
                    const errorCode = error.code.toUpperCase();
                    if (['ECONNRESET', 'EPIPE'].includes(errorCode)) {
                        this.logger.debug(`IMAP connection was reset (${errorCode}) - reconnecting.`, {
                            error,
                        });
                        try {
                            connection = await establishConnection();
                            await connection.openBox(mailbox);
                            return;
                        }
                        catch (e) {
                            this.logger.error('IMAP reconnect did fail', { error: e });
                            // If something goes wrong we want to run emitError
                        }
                    }
                    else {
                        this.logger.error('Email Read Imap node encountered a connection error', { error });
                        this.emitError(error);
                    }
                });
                return conn;
            });
        };
        connection = await establishConnection();
        await connection.openBox(mailbox);
        let reconnectionInterval;
        if (options.forceReconnect !== undefined) {
            reconnectionInterval = setInterval(async () => {
                this.logger.debug('Forcing reconnection of IMAP node.');
                connection.end();
                connection = await establishConnection();
                await connection.openBox(mailbox);
            }, options.forceReconnect * 1000 * 60);
        }
        // When workflow and so node gets set to inactive close the connectoin
        async function closeFunction() {
            if (reconnectionInterval) {
                clearInterval(reconnectionInterval);
            }
            connection.end();
        }
        // Resolve returned-promise so that waiting errors can be emitted
        returnedPromise.resolve();
        return {
            closeFunction,
        };
    }
}
//# sourceMappingURL=EmailReadImapV1.node.js.map