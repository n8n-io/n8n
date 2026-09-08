import { NodeConnectionTypes, } from 'n8n-workflow';
import { bitbucketApiRequest, bitbucketApiRequestAllItems } from './GenericFunctions';
export class BitbucketTrigger {
    description = {
        displayName: 'Bitbucket Trigger',
        name: 'bitbucketTrigger',
        icon: 'file:bitbucket.svg',
        group: ['trigger'],
        version: [1, 1.1],
        defaultVersion: 1.1,
        description: 'Handle Bitbucket events via webhooks',
        defaults: {
            name: 'Bitbucket Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'bitbucketApi',
                required: true,
                testedBy: 'bitbucketApiTest',
                displayOptions: {
                    show: {
                        authentication: ['password'],
                    },
                },
            },
            {
                name: 'bitbucketAccessTokenApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['accessToken'],
                    },
                },
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'webhook',
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Password (Deprecated)',
                        value: 'password',
                    },
                    {
                        name: 'Access Token',
                        value: 'accessToken',
                    },
                ],
                default: 'password',
                displayOptions: {
                    show: {
                        '@version': [1],
                    },
                },
            },
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Password (Deprecated)',
                        value: 'password',
                    },
                    {
                        name: 'Access Token',
                        value: 'accessToken',
                    },
                ],
                default: 'accessToken',
                displayOptions: {
                    show: {
                        '@version': [1.1],
                    },
                },
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                required: true,
                options: [
                    {
                        name: 'Repository',
                        value: 'repository',
                    },
                    {
                        name: 'Workspace',
                        value: 'workspace',
                    },
                ],
                default: 'workspace',
            },
            {
                displayName: 'Workspace Name or ID',
                name: 'workspace',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['workspace', 'repository'],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'getWorkspaces',
                },
                required: true,
                default: '',
                description: 'The repository of which to listen to the events. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Event Names or IDs',
                name: 'events',
                type: 'multiOptions',
                displayOptions: {
                    show: {
                        resource: ['workspace'],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'getWorkspaceEvents',
                },
                options: [],
                required: true,
                default: [],
                description: 'The events to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Repository Name or ID',
                name: 'repository',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: ['repository'],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'getRepositories',
                    loadOptionsDependsOn: ['workspace'],
                },
                required: true,
                default: '',
                description: 'The repository of which to listen to the events. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Event Names or IDs',
                name: 'events',
                type: 'multiOptions',
                displayOptions: {
                    show: {
                        resource: ['repository'],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'getRepositoriesEvents',
                },
                options: [],
                required: true,
                default: [],
                description: 'The events to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
        ],
    };
    methods = {
        credentialTest: {
            async bitbucketApiTest(credential) {
                const credentials = credential.data;
                const options = {
                    method: 'GET',
                    auth: {
                        user: credentials.username,
                        password: credentials.appPassword,
                    },
                    uri: 'https://api.bitbucket.org/2.0/user',
                    json: true,
                    timeout: 5000,
                };
                try {
                    const response = await this.helpers.request(options);
                    // Bitbucket scoped API tokens may not include a `username` field,
                    // but always return `account_id` and `uuid` for valid credentials.
                    if (!response.account_id && !response.uuid) {
                        return {
                            status: 'Error',
                            message: `Token is not valid: ${response.error}`,
                        };
                    }
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: `Settings are not valid: ${error}`,
                    };
                }
                return {
                    status: 'OK',
                    message: 'Authentication successful!',
                };
            },
        },
        loadOptions: {
            async getWorkspaceEvents() {
                const returnData = [];
                const events = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/hook_events/workspace');
                for (const event of events) {
                    returnData.push({
                        name: event.event,
                        value: event.event,
                        description: event.description,
                    });
                }
                return returnData;
            },
            async getRepositoriesEvents() {
                const returnData = [];
                const events = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/hook_events/repository');
                for (const event of events) {
                    returnData.push({
                        name: event.event,
                        value: event.event,
                        description: event.description,
                    });
                }
                return returnData;
            },
            async getRepositories() {
                const returnData = [];
                const workspace = this.getCurrentNodeParameter('workspace');
                const repositories = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', `/repositories/${workspace}`);
                for (const repository of repositories) {
                    returnData.push({
                        name: repository.slug,
                        value: repository.slug,
                        description: repository.description,
                    });
                }
                return returnData;
            },
            async getWorkspaces() {
                const returnData = [];
                const workspaces = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/user/workspaces');
                for (const { workspace } of workspaces) {
                    returnData.push({
                        name: workspace.name ?? workspace.slug,
                        value: workspace.slug,
                    });
                }
                return returnData;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                let endpoint = '';
                const resource = this.getNodeParameter('resource', 0);
                const workspace = this.getNodeParameter('workspace', 0);
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                if (resource === 'workspace') {
                    endpoint = `/workspaces/${workspace}/hooks`;
                }
                if (resource === 'repository') {
                    const repository = this.getNodeParameter('repository', 0);
                    endpoint = `/repositories/${workspace}/${repository}/hooks`;
                }
                const { values: hooks } = await bitbucketApiRequest.call(this, 'GET', endpoint);
                for (const hook of hooks) {
                    if (webhookUrl === hook.url && hook.active === true) {
                        webhookData.webhookId = hook.uuid.replace('{', '').replace('}', '');
                        return true;
                    }
                }
                return false;
            },
            async create() {
                let endpoint = '';
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const events = this.getNodeParameter('events');
                const resource = this.getNodeParameter('resource', 0);
                const workspace = this.getNodeParameter('workspace', 0);
                if (resource === 'workspace') {
                    endpoint = `/workspaces/${workspace}/hooks`;
                }
                if (resource === 'repository') {
                    const repository = this.getNodeParameter('repository', 0);
                    endpoint = `/repositories/${workspace}/${repository}/hooks`;
                }
                const body = {
                    description: 'n8n webhook',
                    url: webhookUrl,
                    active: true,
                    events,
                };
                const responseData = await bitbucketApiRequest.call(this, 'POST', endpoint, body);
                webhookData.webhookId = responseData.uuid.replace('{', '').replace('}', '');
                return true;
            },
            async delete() {
                let endpoint = '';
                const webhookData = this.getWorkflowStaticData('node');
                const workspace = this.getNodeParameter('workspace', 0);
                const resource = this.getNodeParameter('resource', 0);
                if (resource === 'workspace') {
                    endpoint = `/workspaces/${workspace}/hooks/${webhookData.webhookId}`;
                }
                if (resource === 'repository') {
                    const repository = this.getNodeParameter('repository', 0);
                    endpoint = `/repositories/${workspace}/${repository}/hooks/${webhookData.webhookId}`;
                }
                try {
                    await bitbucketApiRequest.call(this, 'DELETE', endpoint);
                }
                catch (error) {
                    return false;
                }
                delete webhookData.webhookId;
                return true;
            },
        },
    };
    async webhook() {
        const req = this.getRequestObject();
        const headerData = this.getHeaderData();
        const webhookData = this.getWorkflowStaticData('node');
        if (headerData['x-hook-uuid'] !== webhookData.webhookId) {
            return {};
        }
        return {
            workflowData: [this.helpers.returnJsonArray(req.body)],
        };
    }
}
//# sourceMappingURL=BitbucketTrigger.node.js.map