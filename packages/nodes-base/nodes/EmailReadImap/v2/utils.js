import { getParts, } from '@n8n/imap';
import find from 'lodash/find';
import { simpleParser } from 'mailparser';
import { deepCopy, NodeOperationError, } from 'n8n-workflow';
async function parseRawEmail(messageEncoded, dataPropertyNameDownload) {
    const responseData = await simpleParser(messageEncoded);
    const headers = {};
    const additionalData = {};
    for (const header of responseData.headerLines) {
        headers[header.key] = header.line;
    }
    additionalData.headers = headers;
    additionalData.headerLines = undefined;
    const binaryData = {};
    if (responseData.attachments) {
        for (let i = 0; i < responseData.attachments.length; i++) {
            const attachment = responseData.attachments[i];
            binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(attachment.content, attachment.filename, attachment.contentType);
        }
        additionalData.attachments = undefined;
    }
    const json = { ...responseData, ...additionalData };
    return {
        // v2.2+ deep-serializes the mail so the Date and any other non-JSON values stay JSON-safe
        json: this.getNode().typeVersion >= 2.2 ? deepCopy(json) : json,
        binary: Object.keys(binaryData).length ? binaryData : undefined,
    };
}
const EMAIL_BATCH_SIZE = 20;
export async function getNewEmails({ getAttachment, getText, onEmailBatch, imapConnection, postProcessAction, searchCriteria, }) {
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
    let results = [];
    let maxUid = 0;
    const staticData = this.getWorkflowStaticData('node');
    const limit = this.getNode().typeVersion >= 2.1 ? EMAIL_BATCH_SIZE : undefined;
    do {
        if (maxUid) {
            searchCriteria = searchCriteria.filter((criteria) => {
                if (Array.isArray(criteria)) {
                    return !['UID', 'SINCE'].includes(criteria[0]);
                }
                return true;
            });
            searchCriteria.push(['UID', `${maxUid}:*`]);
        }
        results = await imapConnection.search(searchCriteria, fetchOptions, limit);
        this.logger.debug(`Process ${results.length} new emails in node "EmailReadImap"`);
        const newEmails = [];
        const processedUids = [];
        let newEmail;
        let attachments;
        let propertyName;
        // All properties get by default moved to metadata except the ones
        // which are defined here which get set on the top level.
        const topLevelProperties = ['cc', 'date', 'from', 'subject', 'to'];
        if (format === 'resolved') {
            const dataPropertyAttachmentsPrefixName = this.getNodeParameter('dataPropertyAttachmentsPrefixName');
            for (const message of results) {
                const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid;
                if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
                    continue;
                }
                // Track the maximum UID to update staticData later
                if (message.attributes.uid > maxUid) {
                    maxUid = message.attributes.uid;
                }
                const part = find(message.parts, { which: '' });
                if (part === undefined) {
                    throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
                }
                const parsedEmail = await parseRawEmail.call(this, part.body, dataPropertyAttachmentsPrefixName);
                parsedEmail.json.attributes = {
                    uid: message.attributes.uid,
                };
                newEmails.push(parsedEmail);
                processedUids.push(message.attributes.uid);
            }
        }
        else if (format === 'simple') {
            const downloadAttachments = this.getNodeParameter('downloadAttachments');
            let dataPropertyAttachmentsPrefixName = '';
            if (downloadAttachments) {
                dataPropertyAttachmentsPrefixName = this.getNodeParameter('dataPropertyAttachmentsPrefixName');
            }
            for (const message of results) {
                const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid;
                if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
                    continue;
                }
                // Track the maximum UID to update staticData later
                if (message.attributes.uid > maxUid) {
                    maxUid = message.attributes.uid;
                }
                const parts = getParts(message.attributes.struct);
                newEmail = {
                    json: {
                        textHtml: await getText(parts, message, 'html'),
                        textPlain: await getText(parts, message, 'plain'),
                        metadata: {},
                        attributes: {
                            uid: message.attributes.uid,
                        },
                    },
                };
                const messageHeader = message.parts.filter((part) => part.which === 'HEADER');
                if (messageHeader.length === 0 || !messageHeader[0].body) {
                    this.logger.warn(`Skipping email UID ${message.attributes.uid}: HEADER part missing or empty`);
                    continue;
                }
                const messageBody = messageHeader[0].body;
                for (propertyName of Object.keys(messageBody)) {
                    if (messageBody[propertyName].length) {
                        if (topLevelProperties.includes(propertyName)) {
                            newEmail.json[propertyName] = messageBody[propertyName][0];
                        }
                        else {
                            newEmail.json.metadata[propertyName] = messageBody[propertyName][0];
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
                processedUids.push(message.attributes.uid);
            }
        }
        else if (format === 'raw') {
            for (const message of results) {
                const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid;
                if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
                    continue;
                }
                // Track the maximum UID to update staticData later
                if (message.attributes.uid > maxUid) {
                    maxUid = message.attributes.uid;
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
                processedUids.push(message.attributes.uid);
            }
        }
        if (postProcessAction === 'read' && processedUids.length > 0) {
            await imapConnection.addFlags(processedUids, '\\SEEN');
        }
        await onEmailBatch(newEmails);
        if (maxUid > (staticData.lastMessageUid ?? 0)) {
            staticData.lastMessageUid = maxUid;
        }
    } while (results.length >= EMAIL_BATCH_SIZE);
}
//# sourceMappingURL=utils.js.map