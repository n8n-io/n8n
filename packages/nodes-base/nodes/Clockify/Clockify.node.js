import moment from 'moment-timezone';
import { NodeConnectionTypes } from 'n8n-workflow';
import { clientFields, clientOperations } from './ClientDescription';
import { clockifyApiRequest, clockifyApiRequestAllItems } from './GenericFunctions';
import { projectFields, projectOperations } from './ProjectDescription';
import { tagFields, tagOperations } from './TagDescription';
import { taskFields, taskOperations } from './TaskDescription';
import { timeEntryFields, timeEntryOperations } from './TimeEntryDescription';
import { userFields, userOperations } from './UserDescription';
import { workspaceFields, workspaceOperations } from './WorkspaceDescription';
export class Clockify {
    description = {
        displayName: 'Clockify',
        name: 'clockify',
        icon: { light: 'file:clockify.svg', dark: 'file:clockify.dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Clockify REST API',
        defaults: {
            name: 'Clockify',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'clockifyApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Client',
                        value: 'client',
                    },
                    {
                        name: 'Project',
                        value: 'project',
                    },
                    {
                        name: 'Tag',
                        value: 'tag',
                    },
                    {
                        name: 'Task',
                        value: 'task',
                    },
                    {
                        name: 'Time Entry',
                        value: 'timeEntry',
                    },
                    {
                        name: 'User',
                        value: 'user',
                    },
                    {
                        name: 'Workspace',
                        value: 'workspace',
                    },
                ],
                default: 'project',
            },
            ...clientOperations,
            ...projectOperations,
            ...tagOperations,
            ...taskOperations,
            ...timeEntryOperations,
            ...userOperations,
            ...workspaceOperations,
            ...workspaceFields,
            {
                displayName: 'Workspace Name or ID',
                name: 'workspaceId',
                type: 'options',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                typeOptions: {
                    loadOptionsMethod: 'listWorkspaces',
                },
                required: true,
                default: [],
                displayOptions: {
                    hide: {
                        resource: ['workspace'],
                    },
                },
            },
            ...clientFields,
            ...projectFields,
            ...tagFields,
            ...taskFields,
            ...userFields,
            ...timeEntryFields,
        ],
    };
    methods = {
        loadOptions: {
            async listWorkspaces() {
                const rtv = [];
                const workspaces = await clockifyApiRequest.call(this, 'GET', 'workspaces');
                if (undefined !== workspaces) {
                    workspaces.forEach((value) => {
                        rtv.push({
                            name: value.name,
                            value: value.id,
                        });
                    });
                }
                return rtv;
            },
            async loadUsersForWorkspace() {
                const rtv = [];
                const workspaceId = this.getCurrentNodeParameter('workspaceId');
                if (undefined !== workspaceId) {
                    const resource = `workspaces/${workspaceId}/users`;
                    const users = await clockifyApiRequest.call(this, 'GET', resource);
                    if (undefined !== users) {
                        users.forEach((value) => {
                            rtv.push({
                                name: value.name,
                                value: value.id,
                            });
                        });
                    }
                }
                return rtv;
            },
            async loadClientsForWorkspace() {
                const rtv = [];
                const workspaceId = this.getCurrentNodeParameter('workspaceId');
                if (undefined !== workspaceId) {
                    const resource = `workspaces/${workspaceId}/clients`;
                    const clients = await clockifyApiRequest.call(this, 'GET', resource);
                    if (undefined !== clients) {
                        clients.forEach((value) => {
                            rtv.push({
                                name: value.name,
                                value: value.id,
                            });
                        });
                    }
                }
                return rtv;
            },
            async loadProjectsForWorkspace() {
                const rtv = [];
                const workspaceId = this.getCurrentNodeParameter('workspaceId');
                if (undefined !== workspaceId) {
                    const resource = `workspaces/${workspaceId}/projects`;
                    const users = await clockifyApiRequest.call(this, 'GET', resource);
                    if (undefined !== users) {
                        users.forEach((value) => {
                            rtv.push({
                                name: value.name,
                                value: value.id,
                            });
                        });
                    }
                }
                return rtv;
            },
            async loadTagsForWorkspace() {
                const rtv = [];
                const workspaceId = this.getCurrentNodeParameter('workspaceId');
                if (undefined !== workspaceId) {
                    const resource = `workspaces/${workspaceId}/tags`;
                    const users = await clockifyApiRequest.call(this, 'GET', resource);
                    if (undefined !== users) {
                        users.forEach((value) => {
                            rtv.push({
                                name: value.name,
                                value: value.id,
                            });
                        });
                    }
                }
                return rtv;
            },
            async loadCustomFieldsForWorkspace() {
                const rtv = [];
                const workspaceId = this.getCurrentNodeParameter('workspaceId');
                if (undefined !== workspaceId) {
                    const resource = `workspaces/${workspaceId}/custom-fields`;
                    const customFields = await clockifyApiRequest.call(this, 'GET', resource);
                    for (const customField of customFields) {
                        rtv.push({
                            name: customField.name,
                            value: customField.id,
                        });
                    }
                }
                return rtv;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'client') {
                    if (operation === 'create') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            name,
                        };
                        responseData = await clockifyApiRequest.call(this, 'POST', `/workspaces/${workspaceId}/clients`, body, qs);
                    }
                    if (operation === 'delete') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const clientId = this.getNodeParameter('clientId', i);
                        responseData = await clockifyApiRequest.call(this, 'DELETE', `/workspaces/${workspaceId}/clients/${clientId}`, {}, qs);
                    }
                    if (operation === 'update') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const clientId = this.getNodeParameter('clientId', i);
                        const name = this.getNodeParameter('name', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {
                            name,
                        };
                        Object.assign(body, updateFields);
                        responseData = await clockifyApiRequest.call(this, 'PUT', `/workspaces/${workspaceId}/clients/${clientId}`, body, qs);
                    }
                    if (operation === 'get') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const clientId = this.getNodeParameter('clientId', i);
                        responseData = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/clients/${clientId}`, {}, qs);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/clients`, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/clients`, {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
                if (resource === 'project') {
                    if (operation === 'create') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name,
                        };
                        Object.assign(body, additionalFields);
                        if (body.estimateUi) {
                            body.estimate = body.estimateUi.estimateValues;
                            delete body.estimateUi;
                        }
                        responseData = await clockifyApiRequest.call(this, 'POST', `/workspaces/${workspaceId}/projects`, body, qs);
                    }
                    if (operation === 'delete') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        responseData = await clockifyApiRequest.call(this, 'DELETE', `/workspaces/${workspaceId}/projects/${projectId}`, {}, qs);
                    }
                    if (operation === 'get') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        responseData = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/projects/${projectId}`, {}, qs);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/projects`, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/projects`, {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                    if (operation === 'update') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        Object.assign(body, updateFields);
                        if (body.estimateUi) {
                            body.estimate = body.estimateUi.estimateValues;
                            delete body.estimateUi;
                        }
                        responseData = await clockifyApiRequest.call(this, 'PUT', `/workspaces/${workspaceId}/projects/${projectId}`, body, qs);
                    }
                }
                if (resource === 'tag') {
                    if (operation === 'create') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            name,
                        };
                        responseData = await clockifyApiRequest.call(this, 'POST', `/workspaces/${workspaceId}/tags`, body, qs);
                    }
                    if (operation === 'delete') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const tagId = this.getNodeParameter('tagId', i);
                        responseData = await clockifyApiRequest.call(this, 'DELETE', `/workspaces/${workspaceId}/tags/${tagId}`, {}, qs);
                        responseData = { success: true };
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/tags`, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/tags`, {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                    if (operation === 'update') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const tagId = this.getNodeParameter('tagId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        Object.assign(body, updateFields);
                        responseData = await clockifyApiRequest.call(this, 'PUT', `/workspaces/${workspaceId}/tags/${tagId}`, body, qs);
                    }
                }
                if (resource === 'task') {
                    if (operation === 'create') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name,
                        };
                        Object.assign(body, additionalFields);
                        if (body.estimate) {
                            const [hour, minute] = body.estimate.split(':');
                            body.estimate = `PT${hour}H${minute}M`;
                        }
                        responseData = await clockifyApiRequest.call(this, 'POST', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, body, qs);
                    }
                    if (operation === 'delete') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await clockifyApiRequest.call(this, 'DELETE', `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {}, qs);
                    }
                    if (operation === 'get') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {}, qs);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const filters = this.getNodeParameter('filters', i);
                        Object.assign(qs, filters);
                        if (returnAll) {
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, {}, qs);
                        }
                        else {
                            qs['page-size'] = this.getNodeParameter('limit', i);
                            responseData = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, {}, qs);
                        }
                    }
                    if (operation === 'update') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const projectId = this.getNodeParameter('projectId', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        Object.assign(body, updateFields);
                        if (body.estimate) {
                            const [hour, minute] = body.estimate.split(':');
                            body.estimate = `PT${hour}H${minute}M`;
                        }
                        responseData = await clockifyApiRequest.call(this, 'PUT', `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, body, qs);
                    }
                }
                if (resource === 'timeEntry') {
                    if (operation === 'create') {
                        const timezone = this.getTimezone();
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const start = this.getNodeParameter('start', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            start: moment.tz(start, timezone).utc().format(),
                        };
                        Object.assign(body, additionalFields);
                        if (body.end) {
                            body.end = moment.tz(body.end, timezone).utc().format();
                        }
                        if (body.customFieldsUi) {
                            const customFields = body.customFieldsUi
                                .customFieldsValues;
                            body.customFields = customFields;
                        }
                        responseData = await clockifyApiRequest.call(this, 'POST', `/workspaces/${workspaceId}/time-entries`, body, qs);
                    }
                    if (operation === 'delete') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const timeEntryId = this.getNodeParameter('timeEntryId', i);
                        responseData = await clockifyApiRequest.call(this, 'DELETE', `/workspaces/${workspaceId}/time-entries/${timeEntryId}`, {}, qs);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const timeEntryId = this.getNodeParameter('timeEntryId', i);
                        responseData = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/time-entries/${timeEntryId}`, {}, qs);
                    }
                    if (operation === 'update') {
                        const timezone = this.getTimezone();
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const timeEntryId = this.getNodeParameter('timeEntryId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        Object.assign(body, updateFields);
                        if (body.end) {
                            body.end = moment.tz(body.end, timezone).utc().format();
                        }
                        if (body.start) {
                            body.start = moment.tz(body.start, timezone).utc().format();
                        }
                        else {
                            // even if you do not want to update the start time, it always has to be set
                            // to make it more simple to the user, if they did not set a start time look for the current start time
                            // and set it
                            const { timeInterval: { start }, } = await clockifyApiRequest.call(this, 'GET', `/workspaces/${workspaceId}/time-entries/${timeEntryId}`, {}, qs);
                            body.start = start;
                        }
                        responseData = await clockifyApiRequest.call(this, 'PUT', `/workspaces/${workspaceId}/time-entries/${timeEntryId}`, body, qs);
                    }
                }
                if (resource === 'user') {
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const workspaceId = this.getNodeParameter('workspaceId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/users`, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await clockifyApiRequestAllItems.call(this, 'GET', `/workspaces/${workspaceId}/users`, {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
                if (resource === 'workspace') {
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        responseData = await clockifyApiRequest.call(this, 'GET', '/workspaces', {}, qs);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {} });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Clockify.node.js.map