import moment from 'moment-timezone';
import { NodeConnectionTypes } from 'n8n-workflow';
import { meetingFields, meetingOperations, 
// meetingTranscriptFields,
// meetingTranscriptOperations,
messageFields, messageOperations, } from './descriptions';
import { getAttachments, webexApiRequest, webexApiRequestAllItems } from './GenericFunctions';
export class CiscoWebex {
    description = {
        displayName: 'Webex by Cisco',
        name: 'ciscoWebex',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:ciscoWebex.png',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the Cisco Webex API',
        schemaPath: 'Cisco/Webex',
        defaults: {
            name: 'Webex by Cisco',
        },
        usableAsTool: true,
        credentials: [
            {
                name: 'ciscoWebexOAuth2Api',
                required: true,
            },
        ],
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Meeting',
                        value: 'meeting',
                    },
                    // {
                    // 	name: 'Meeeting Transcript',
                    // 	value: 'meetingTranscript',
                    // },
                    {
                        name: 'Message',
                        value: 'message',
                    },
                ],
                default: 'message',
            },
            ...meetingOperations,
            ...meetingFields,
            // ...meetingTranscriptOperations,
            // ...meetingTranscriptFields,
            ...messageOperations,
            ...messageFields,
        ],
    };
    methods = {
        loadOptions: {
            async getRooms() {
                const returnData = [];
                const rooms = await webexApiRequestAllItems.call(this, 'items', 'GET', '/rooms');
                for (const room of rooms) {
                    returnData.push({
                        name: room.title,
                        value: room.id,
                    });
                }
                return returnData;
            },
            async getSites() {
                const returnData = [];
                const sites = await webexApiRequestAllItems.call(this, 'sites', 'GET', '/meetingPreferences/sites');
                for (const site of sites) {
                    returnData.push({
                        name: site.siteUrl,
                        value: site.siteUrl,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const timezone = this.getTimezone();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'message') {
                    // **********************************************************************
                    //                                message
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------------
                        //             message: create
                        // ----------------------------------------
                        // https://developer.webex.com/docs/api/v1/messages/create-a-message
                        const destination = this.getNodeParameter('destination', i);
                        const file = this.getNodeParameter('additionalFields.fileUi.fileValue', i, {});
                        const markdown = this.getNodeParameter('additionalFields.markdown', i, '');
                        const body = {};
                        if (destination === 'room') {
                            body.roomId = this.getNodeParameter('roomId', i);
                        }
                        if (destination === 'person') {
                            const specifyPersonBy = this.getNodeParameter('specifyPersonBy', 0);
                            if (specifyPersonBy === 'id') {
                                body.toPersonId = this.getNodeParameter('toPersonId', i);
                            }
                            else {
                                body.toPersonEmail = this.getNodeParameter('toPersonEmail', i);
                            }
                        }
                        if (markdown) {
                            body.markdown = markdown;
                        }
                        body.text = this.getNodeParameter('text', i);
                        body.attachments = getAttachments(this.getNodeParameter('additionalFields.attachmentsUi.attachmentValues', i, []));
                        if (Object.keys(file).length) {
                            const isBinaryData = file.fileLocation === 'binaryData' ? true : false;
                            if (isBinaryData) {
                                const binaryPropertyName = file.binaryPropertyName;
                                const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                                const formData = {
                                    files: {
                                        value: binaryDataBuffer,
                                        options: {
                                            filename: binaryData.fileName,
                                            contentType: binaryData.mimeType,
                                        },
                                    },
                                };
                                Object.assign(body, formData);
                            }
                            else {
                                const url = file.url;
                                Object.assign(body, { files: url });
                            }
                        }
                        if (file.fileLocation === 'binaryData') {
                            responseData = await webexApiRequest.call(this, 'POST', '/messages', {}, {}, undefined, { formData: body });
                        }
                        else {
                            responseData = await webexApiRequest.call(this, 'POST', '/messages', body);
                        }
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------------
                        //             message: delete
                        // ----------------------------------------
                        // https://developer.webex.com/docs/api/v1/messages/delete-a-message
                        const messageId = this.getNodeParameter('messageId', i);
                        const endpoint = `/messages/${messageId}`;
                        responseData = await webexApiRequest.call(this, 'DELETE', endpoint);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                    }
                    else if (operation === 'get') {
                        // ----------------------------------------
                        //               message: get
                        // ----------------------------------------
                        // https://developer.webex.com/docs/api/v1/messages/get-message-details
                        const messageId = this.getNodeParameter('messageId', i);
                        const endpoint = `/messages/${messageId}`;
                        responseData = await webexApiRequest.call(this, 'GET', endpoint);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             message: getAll
                        // ----------------------------------------
                        // https://developer.webex.com/docs/api/v1/messages/list-messages
                        const qs = {
                            roomId: this.getNodeParameter('roomId', i),
                        };
                        const filters = this.getNodeParameter('filters', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (Object.keys(filters).length) {
                            Object.assign(qs, filters);
                        }
                        if (returnAll) {
                            responseData = await webexApiRequestAllItems.call(this, 'items', 'GET', '/messages', {}, qs);
                        }
                        else {
                            qs.max = this.getNodeParameter('limit', i);
                            responseData = await webexApiRequest.call(this, 'GET', '/messages', {}, qs);
                            responseData = responseData.items;
                        }
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.items), { itemData: { item: i } });
                    }
                    else if (operation === 'update') {
                        // ----------------------------------------
                        //             message: update
                        // ----------------------------------------
                        // https://developer.webex.com/docs/api/v1/messages/edit-a-message
                        const messageId = this.getNodeParameter('messageId', i);
                        const markdown = this.getNodeParameter('markdown', i);
                        const endpoint = `/messages/${messageId}`;
                        responseData = await webexApiRequest.call(this, 'GET', endpoint);
                        const body = {
                            roomId: responseData.roomId,
                        };
                        if (markdown) {
                            body.markdown = this.getNodeParameter('markdownText', i);
                        }
                        else {
                            body.text = this.getNodeParameter('text', i);
                        }
                        responseData = await webexApiRequest.call(this, 'PUT', endpoint, body);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                }
                if (resource === 'meeting') {
                    if (operation === 'create') {
                        const title = this.getNodeParameter('title', i);
                        const start = this.getNodeParameter('start', i);
                        const end = this.getNodeParameter('end', i);
                        const invitees = this.getNodeParameter('additionalFields.inviteesUi.inviteeValues', i, []);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            title,
                            start: moment.tz(start, timezone).format(),
                            end: moment.tz(end, timezone).format(),
                            ...additionalFields,
                        };
                        if (body.requireRegistrationInfo) {
                            body.registration = body.requireRegistrationInfo.reduce((obj, value) => Object.assign(obj, { [`${value}`]: true }), {});
                            delete body.requireRegistrationInfo;
                        }
                        if (invitees) {
                            body.invitees = invitees;
                            delete body.inviteesUi;
                        }
                        responseData = await webexApiRequest.call(this, 'POST', '/meetings', body);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    if (operation === 'delete') {
                        const meetingId = this.getNodeParameter('meetingId', i);
                        const options = this.getNodeParameter('options', i);
                        const qs = {
                            ...options,
                        };
                        responseData = await webexApiRequest.call(this, 'DELETE', `/meetings/${meetingId}`, {}, qs);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                    }
                    if (operation === 'get') {
                        const meetingId = this.getNodeParameter('meetingId', i);
                        const options = this.getNodeParameter('options', i);
                        let headers = {};
                        const qs = {
                            ...options,
                        };
                        if (options.passsword) {
                            headers = {
                                passsword: options.passsword,
                            };
                        }
                        responseData = await webexApiRequest.call(this, 'GET', `/meetings/${meetingId}`, {}, qs, undefined, { headers });
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    if (operation === 'getAll') {
                        const filters = this.getNodeParameter('filters', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const qs = {
                            ...filters,
                        };
                        if (qs.from) {
                            qs.from = moment(qs.from)
                                .utc(true)
                                .format();
                        }
                        if (qs.to) {
                            qs.to = moment(qs.to)
                                .utc(true)
                                .format();
                        }
                        if (returnAll) {
                            responseData = await webexApiRequestAllItems.call(this, 'items', 'GET', '/meetings', {}, qs);
                        }
                        else {
                            qs.max = this.getNodeParameter('limit', i);
                            responseData = await webexApiRequest.call(this, 'GET', '/meetings', {}, qs);
                            responseData = responseData.items;
                        }
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    if (operation === 'update') {
                        const meetingId = this.getNodeParameter('meetingId', i);
                        const invitees = this.getNodeParameter('updateFields.inviteesUi.inviteeValues', i, []);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const { title, password, start, end } = await webexApiRequest.call(this, 'GET', `/meetings/${meetingId}`);
                        const body = {
                            ...updateFields,
                        };
                        if (body.requireRegistrationInfo) {
                            body.registration = body.requireRegistrationInfo.reduce((obj, value) => Object.assign(obj, { [`${value}`]: true }), {});
                            delete body.requireRegistrationInfo;
                        }
                        if (invitees.length) {
                            body.invitees = invitees;
                        }
                        if (body.start) {
                            body.start = moment.tz(updateFields.start, timezone).format();
                        }
                        else {
                            body.start = start;
                        }
                        if (body.end) {
                            body.end = moment.tz(updateFields.end, timezone).format();
                        }
                        else {
                            body.end = end;
                        }
                        if (!body.title) {
                            body.title = title;
                        }
                        if (!body.password) {
                            body.password = password;
                        }
                        responseData = await webexApiRequest.call(this, 'PUT', `/meetings/${meetingId}`, body);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                }
                returnData.push(...responseData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.toString(), json: {}, itemIndex: i });
                    continue;
                }
                throw error;
            }
        }
        // if (resource === 'meetingTranscript') {
        // 	if (operation === 'download') {
        // 		for (let i = 0; i < items.length; i++) {
        // 			const transcriptId = this.getNodeParameter('transcriptId', i) as string;
        // 			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
        // 			const meetingId = this.getNodeParameter('meetingId', i) as string;
        // 			const options = this.getNodeParameter('options', i);
        // 			const qs: IDataObject = {
        // 				meetingId,
        // 				...options,
        // 			};
        // 			const transcription = await webexApiRequest.call(this, 'GET', `/meetingTranscripts/${transcriptId}/download`, {}, qs);
        // 			responseData = {
        // 				json: {},
        // 				binary: {
        // 					[binaryPropertyName]: {
        // 						data: Buffer.from(transcription, BINARY_ENCODING),
        // 						//contentType:
        // 						//FILE
        // 					}
        // 				}
        // 			}
        // 		}
        // 	}
        // 	if (operation === 'getAll') {
        // 		for (let i = 0; i < items.length; i++) {
        // 			try {
        // 				const meetingId = this.getNodeParameter('meetingId', i) as string;
        // 				const filters = this.getNodeParameter('filters', i);
        // 				const returnAll = this.getNodeParameter('returnAll', i);
        // 				const qs: IDataObject = {
        // 					meetingId,
        // 					...filters,
        // 				};
        // 				if (returnAll === true) {
        // 					responseData = await webexApiRequestAllItems.call(this, 'items', 'GET', '/meetingTranscripts', {}, qs);
        // 					returnData.push(...responseData);
        // 				} else {
        // 					qs.max = this.getNodeParameter('limit', i);
        // 					responseData = await webexApiRequest.call(this, 'GET', '/meetingTranscripts', {}, qs);
        // 					returnData.push(...responseData.items);
        // 				}
        // 			} catch (error) {
        // 				if (this.continueOnFail()) {
        // 					returnData.push({
        // 						error: error.message,
        // 					});
        // 				}
        // 			}
        // 		}
        // 	}
        // }
        return [returnData];
    }
}
//# sourceMappingURL=CiscoWebex.node.js.map