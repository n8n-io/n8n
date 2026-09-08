import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { toPathSegment } from '@utils/url';
import { caseCommentFields, caseCommentOperations, caseFields, caseOperations, caseTagFields, caseTagOperations, connectorFields, connectorOperations, } from './descriptions';
import { elasticSecurityApiRequest, getConnector, getVersion, handleListing, throwOnEmptyUpdate, } from './GenericFunctions';
export class ElasticSecurity {
    description = {
        displayName: 'Elastic Security',
        name: 'elasticSecurity',
        icon: 'file:elasticSecurity.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the Elastic Security API',
        schemaPath: 'Elastic/ElasticSecurity',
        defaults: {
            name: 'Elastic Security',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'elasticSecurityApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                noDataExpression: true,
                type: 'options',
                options: [
                    {
                        name: 'Case',
                        value: 'case',
                    },
                    {
                        name: 'Case Comment',
                        value: 'caseComment',
                    },
                    {
                        name: 'Case Tag',
                        value: 'caseTag',
                    },
                    {
                        name: 'Connector',
                        value: 'connector',
                    },
                ],
                default: 'case',
            },
            ...caseOperations,
            ...caseFields,
            ...caseCommentOperations,
            ...caseCommentFields,
            ...caseTagOperations,
            ...caseTagFields,
            ...connectorOperations,
            ...connectorFields,
        ],
    };
    methods = {
        loadOptions: {
            async getTags() {
                const tags = (await elasticSecurityApiRequest.call(this, 'GET', '/cases/tags'));
                return tags.map((tag) => ({ name: tag, value: tag }));
            },
            async getConnectors() {
                const endpoint = '/cases/configure/connectors/_find';
                const connectors = (await elasticSecurityApiRequest.call(this, 'GET', endpoint));
                return connectors.map(({ name, id }) => ({ name, value: id }));
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'case') {
                    // **********************************************************************
                    //                                  case
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------------
                        //               case: create
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-create.html
                        const body = {
                            title: this.getNodeParameter('title', i),
                            connector: {},
                            owner: 'securitySolution',
                            description: '',
                            tags: [], // set via `caseTag: add` but must be present
                            settings: {
                                syncAlerts: this.getNodeParameter('additionalFields.syncAlerts', i, false),
                            },
                        };
                        const connectorId = this.getNodeParameter('connectorId', i);
                        const { id: fetchedId, name: fetchedName, type: fetchedType, } = await getConnector.call(this, connectorId);
                        const selectedConnectorType = this.getNodeParameter('connectorType', i);
                        if (fetchedType !== selectedConnectorType) {
                            throw new NodeOperationError(this.getNode(), 'Connector Type does not match the type of the connector in Connector Name', { itemIndex: i });
                        }
                        const connector = {
                            id: fetchedId,
                            name: fetchedName,
                            type: fetchedType,
                            fields: {},
                        };
                        if (selectedConnectorType === '.jira') {
                            connector.fields = {
                                issueType: this.getNodeParameter('issueType', i),
                                priority: this.getNodeParameter('priority', i),
                                parent: null, // required but unimplemented
                            };
                        }
                        else if (selectedConnectorType === '.servicenow') {
                            connector.fields = {
                                urgency: this.getNodeParameter('urgency', i),
                                severity: this.getNodeParameter('severity', i),
                                impact: this.getNodeParameter('impact', i),
                                category: this.getNodeParameter('category', i),
                                subcategory: null, // required but unimplemented
                            };
                        }
                        else if (selectedConnectorType === '.resilient') {
                            const rawIssueTypes = this.getNodeParameter('issueTypes', i);
                            connector.fields = {
                                issueTypes: rawIssueTypes.split(',').map(Number),
                                severityCode: this.getNodeParameter('severityCode', i),
                                incidentTypes: null, // required but undocumented
                            };
                        }
                        body.connector = connector;
                        const { syncAlerts, // ignored because already set
                        ...rest } = this.getNodeParameter('additionalFields', i);
                        if (Object.keys(rest).length) {
                            Object.assign(body, rest);
                        }
                        responseData = await elasticSecurityApiRequest.call(this, 'POST', '/cases', body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------------
                        //               case: delete
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-delete-case.html
                        const caseId = this.getNodeParameter('caseId', i);
                        await elasticSecurityApiRequest.call(this, 'DELETE', `/cases?ids=${encodeURIComponent(JSON.stringify([String(caseId)]))}`);
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------------
                        //                case: get
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-get-case.html
                        const caseId = this.getNodeParameter('caseId', i);
                        responseData = await elasticSecurityApiRequest.call(this, 'GET', `/cases/${toPathSegment(caseId)}`);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //               case: getAll
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-find-cases.html
                        const qs = {};
                        const { tags, status } = this.getNodeParameter('filters', i);
                        const sortOptions = this.getNodeParameter('sortOptions', i);
                        qs.sortField = sortOptions.sortField ?? 'createdAt';
                        qs.sortOrder = sortOptions.sortOrder ?? 'asc';
                        if (status) {
                            qs.status = status;
                        }
                        if (tags?.length) {
                            qs.tags = tags.join(',');
                        }
                        responseData = await handleListing.call(this, 'GET', '/cases/_find', {}, qs);
                    }
                    else if (operation === 'getStatus') {
                        // ----------------------------------------
                        //             case: getStatus
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-get-status.html
                        responseData = await elasticSecurityApiRequest.call(this, 'GET', '/cases/status');
                    }
                    else if (operation === 'update') {
                        // ----------------------------------------
                        //               case: update
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-update.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this, resource);
                        }
                        const { syncAlerts, ...rest } = updateFields;
                        Object.assign(body, {
                            cases: [
                                {
                                    id: caseId,
                                    version: await getVersion.call(this, `/cases/${toPathSegment(caseId)}`),
                                    ...(syncAlerts && { settings: { syncAlerts } }),
                                    ...rest,
                                },
                            ],
                        });
                        responseData = await elasticSecurityApiRequest.call(this, 'PATCH', '/cases', body);
                    }
                }
                else if (resource === 'caseTag') {
                    // **********************************************************************
                    //                               caseTag
                    // **********************************************************************
                    if (operation === 'add') {
                        // ----------------------------------------
                        //              caseTag: add
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-create.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const { title, connector, owner, description, settings, tags } = await elasticSecurityApiRequest.call(this, 'GET', `/cases/${toPathSegment(caseId)}`);
                        const tagToAdd = this.getNodeParameter('tag', i);
                        if (tags.includes(tagToAdd)) {
                            throw new NodeOperationError(this.getNode(), `Cannot add tag "${tagToAdd}" to case ID ${caseId} because this case already has this tag.`, { itemIndex: i });
                        }
                        const body = {};
                        Object.assign(body, {
                            cases: [
                                {
                                    id: caseId,
                                    title,
                                    connector,
                                    owner,
                                    description,
                                    settings,
                                    version: await getVersion.call(this, `/cases/${toPathSegment(caseId)}`),
                                    tags: [...tags, tagToAdd],
                                },
                            ],
                        });
                        responseData = await elasticSecurityApiRequest.call(this, 'PATCH', '/cases', body);
                    }
                    else if (operation === 'remove') {
                        // https://www.elastic.co/guide/en/security/current/cases-api-update.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const tagToRemove = this.getNodeParameter('tag', i);
                        const { title, connector, owner, description, settings, tags } = (await elasticSecurityApiRequest.call(this, 'GET', `/cases/${toPathSegment(caseId)}`));
                        if (!tags.includes(tagToRemove)) {
                            throw new NodeOperationError(this.getNode(), `Cannot remove tag "${tagToRemove}" from case ID ${caseId} because this case does not have this tag.`, { itemIndex: i });
                        }
                        const body = {};
                        Object.assign(body, {
                            cases: [
                                {
                                    id: caseId,
                                    title,
                                    connector,
                                    owner,
                                    description,
                                    settings,
                                    version: await getVersion.call(this, `/cases/${toPathSegment(caseId)}`),
                                    tags: tags.filter((tag) => tag !== tagToRemove),
                                },
                            ],
                        });
                        responseData = await elasticSecurityApiRequest.call(this, 'PATCH', '/cases', body);
                    }
                }
                else if (resource === 'caseComment') {
                    // **********************************************************************
                    //                              caseComment
                    // **********************************************************************
                    if (operation === 'add') {
                        // ----------------------------------------
                        //             caseComment: add
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-add-comment.html
                        const simple = this.getNodeParameter('simple', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            comment: this.getNodeParameter('comment', i),
                            type: 'user',
                            owner: additionalFields.owner || 'securitySolution',
                        };
                        const caseId = this.getNodeParameter('caseId', i);
                        const endpoint = `/cases/${toPathSegment(caseId)}/comments`;
                        responseData = await elasticSecurityApiRequest.call(this, 'POST', endpoint, body);
                        if (simple) {
                            const { comments } = responseData;
                            responseData = comments[comments.length - 1];
                        }
                    }
                    else if (operation === 'get') {
                        // ----------------------------------------
                        //             caseComment: get
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-get-comment.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        const endpoint = `/cases/${toPathSegment(caseId)}/comments/${toPathSegment(commentId)}`;
                        responseData = await elasticSecurityApiRequest.call(this, 'GET', endpoint);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //           caseComment: getAll
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-get-all-case-comments.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const endpoint = `/cases/${toPathSegment(caseId)}/comments`;
                        responseData = await handleListing.call(this, 'GET', endpoint);
                    }
                    else if (operation === 'remove') {
                        // ----------------------------------------
                        //           caseComment: remove
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-delete-comment.html
                        const caseId = this.getNodeParameter('caseId', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        const endpoint = `/cases/${toPathSegment(caseId)}/comments/${toPathSegment(commentId)}`;
                        await elasticSecurityApiRequest.call(this, 'DELETE', endpoint);
                        responseData = { success: true };
                    }
                    else if (operation === 'update') {
                        // ----------------------------------------
                        //           caseComment: update
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/cases-api-update-comment.html
                        const simple = this.getNodeParameter('simple', i);
                        const caseId = this.getNodeParameter('caseId', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        const body = {
                            comment: this.getNodeParameter('comment', i),
                            id: commentId,
                            type: 'user',
                            owner: 'securitySolution',
                            version: await getVersion.call(this, `/cases/${toPathSegment(caseId)}/comments/${toPathSegment(commentId)}`),
                        };
                        const patchEndpoint = `/cases/${toPathSegment(caseId)}/comments`;
                        responseData = await elasticSecurityApiRequest.call(this, 'PATCH', patchEndpoint, body);
                        if (simple) {
                            const { comments } = responseData;
                            responseData = comments[comments.length - 1];
                        }
                    }
                }
                else if (resource === 'connector') {
                    if (operation === 'create') {
                        // ----------------------------------------
                        //           connector: create
                        // ----------------------------------------
                        // https://www.elastic.co/guide/en/security/current/register-connector.html
                        const connectorType = this.getNodeParameter('connectorType', i);
                        const body = {
                            connector_type_id: connectorType,
                            name: this.getNodeParameter('name', i),
                        };
                        if (connectorType === '.jira') {
                            body.config = {
                                apiUrl: this.getNodeParameter('apiUrl', i),
                                projectKey: this.getNodeParameter('projectKey', i),
                            };
                            body.secrets = {
                                email: this.getNodeParameter('email', i),
                                apiToken: this.getNodeParameter('apiToken', i),
                            };
                        }
                        else if (connectorType === '.resilient') {
                            body.config = {
                                apiUrl: this.getNodeParameter('apiUrl', i),
                                orgId: this.getNodeParameter('orgId', i),
                            };
                            body.secrets = {
                                apiKeyId: this.getNodeParameter('apiKeyId', i),
                                apiKeySecret: this.getNodeParameter('apiKeySecret', i),
                            };
                        }
                        else if (connectorType === '.servicenow') {
                            body.config = {
                                apiUrl: this.getNodeParameter('apiUrl', i),
                            };
                            body.secrets = {
                                username: this.getNodeParameter('username', i),
                                password: this.getNodeParameter('password', i),
                            };
                        }
                        responseData = await elasticSecurityApiRequest.call(this, 'POST', '/actions/connector', body);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=ElasticSecurity.node.js.map