import { NodeConnectionTypes } from 'n8n-workflow';
import { bitlyApiRequest, bitlyApiRequestAllItems } from './GenericFunctions';
import { linkFields, linkOperations } from './LinkDescription';
export class Bitly {
    description = {
        displayName: 'Bitly',
        name: 'bitly',
        icon: 'file:bitly.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Bitly API',
        defaults: {
            name: 'Bitly',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'bitlyApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['accessToken'],
                    },
                },
            },
            {
                name: 'bitlyOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Access Token',
                        value: 'accessToken',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'accessToken',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Link',
                        value: 'link',
                    },
                ],
                default: 'link',
            },
            ...linkOperations,
            ...linkFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available groups to display them to user so that they can
            // select them easily
            async getGroups() {
                const returnData = [];
                const groups = await bitlyApiRequestAllItems.call(this, 'groups', 'GET', '/groups');
                for (const group of groups) {
                    const groupName = group.name;
                    const groupId = group.guid;
                    returnData.push({
                        name: groupName,
                        value: groupId,
                    });
                }
                return returnData;
            },
            // Get all the available tags to display them to user so that they can
            // select them easily
            async getTags() {
                const groupId = this.getCurrentNodeParameter('group');
                const returnData = [];
                const tags = await bitlyApiRequestAllItems.call(this, 'tags', 'GET', `groups/${groupId}/tags`);
                for (const tag of tags) {
                    const tagName = tag;
                    const tagId = tag;
                    returnData.push({
                        name: tagName,
                        value: tagId,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'link') {
                    if (operation === 'create') {
                        const longUrl = this.getNodeParameter('longUrl', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            long_url: longUrl,
                        };
                        if (additionalFields.title) {
                            body.title = additionalFields.title;
                        }
                        if (additionalFields.domain) {
                            body.domain = additionalFields.domain;
                        }
                        if (additionalFields.group) {
                            body.group = additionalFields.group;
                        }
                        if (additionalFields.tags) {
                            body.tags = additionalFields.tags;
                        }
                        const deeplinks = this.getNodeParameter('deeplink', i)
                            .deeplinkUi;
                        if (deeplinks) {
                            for (const deeplink of deeplinks) {
                                //@ts-ignore
                                body.deeplinks.push({
                                    app_uri_path: deeplink.appUriPath,
                                    install_type: deeplink.installType,
                                    install_url: deeplink.installUrl,
                                    app_id: deeplink.appId,
                                });
                            }
                        }
                        responseData = await bitlyApiRequest.call(this, 'POST', '/bitlinks', body);
                    }
                    if (operation === 'update') {
                        const linkId = this.getNodeParameter('id', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.longUrl) {
                            body.long_url = updateFields.longUrl;
                        }
                        if (updateFields.title) {
                            body.title = updateFields.title;
                        }
                        if (updateFields.archived !== undefined) {
                            body.archived = updateFields.archived;
                        }
                        if (updateFields.group) {
                            body.group = updateFields.group;
                        }
                        if (updateFields.tags) {
                            body.tags = updateFields.tags;
                        }
                        const deeplinks = this.getNodeParameter('deeplink', i)
                            .deeplinkUi;
                        if (deeplinks) {
                            for (const deeplink of deeplinks) {
                                //@ts-ignore
                                body.deeplinks.push({
                                    app_uri_path: deeplink.appUriPath,
                                    install_type: deeplink.installType,
                                    install_url: deeplink.installUrl,
                                    app_id: deeplink.appId,
                                });
                            }
                        }
                        responseData = await bitlyApiRequest.call(this, 'PATCH', `/bitlinks/${linkId}`, body);
                    }
                    if (operation === 'get') {
                        const linkId = this.getNodeParameter('id', i);
                        responseData = await bitlyApiRequest.call(this, 'GET', `/bitlinks/${linkId}`);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {}, itemIndex: i });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Bitly.node.js.map