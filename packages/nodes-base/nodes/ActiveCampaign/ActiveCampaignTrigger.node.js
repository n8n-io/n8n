import { NodeConnectionTypes } from 'n8n-workflow';
import { activeCampaignApiRequest, activeCampaignApiRequestAllItems } from './GenericFunctions';
export class ActiveCampaignTrigger {
    description = {
        displayName: 'ActiveCampaign Trigger',
        name: 'activeCampaignTrigger',
        icon: { light: 'file:activeCampaign.svg', dark: 'file:activeCampaign.dark.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Handle ActiveCampaign events via webhooks',
        defaults: {
            name: 'ActiveCampaign Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'activeCampaignApi',
                required: true,
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
                displayName: 'Event Names or IDs',
                name: 'events',
                type: 'multiOptions',
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                typeOptions: {
                    loadOptionsMethod: 'getEvents',
                },
                default: [],
                options: [],
            },
            {
                displayName: 'Source',
                name: 'sources',
                type: 'multiOptions',
                options: [
                    {
                        name: 'Public',
                        value: 'public',
                        description: 'Run the hooks when a contact triggers the action',
                    },
                    {
                        name: 'Admin',
                        value: 'admin',
                        description: 'Run the hooks when an admin user triggers the action',
                    },
                    {
                        name: 'Api',
                        value: 'api',
                        description: 'Run the hooks when an API call triggers the action',
                    },
                    {
                        name: 'System',
                        value: 'system',
                        description: 'Run the hooks when automated systems triggers the action',
                    },
                ],
                default: [],
            },
        ],
    };
    methods = {
        loadOptions: {
            // Get all the events to display them to user so that they can
            // select them easily
            async getEvents() {
                const returnData = [];
                const events = await activeCampaignApiRequestAllItems.call(this, 'GET', '/api/3/webhook/events', {}, {}, 'webhookEvents');
                for (const event of events) {
                    const eventName = event;
                    const eventId = event;
                    returnData.push({
                        name: eventName,
                        value: eventId,
                    });
                }
                return returnData;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId === undefined) {
                    return false;
                }
                const endpoint = `/api/3/webhooks/${webhookData.webhookId}`;
                try {
                    await activeCampaignApiRequest.call(this, 'GET', endpoint, {});
                }
                catch (error) {
                    return false;
                }
                return true;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const events = this.getNodeParameter('events', []);
                const sources = this.getNodeParameter('sources', '');
                const body = {
                    webhook: {
                        name: `n8n-webhook:${webhookUrl}`,
                        url: webhookUrl,
                        events,
                        sources,
                    },
                };
                const { webhook } = await activeCampaignApiRequest.call(this, 'POST', '/api/3/webhooks', body);
                webhookData.webhookId = webhook.id;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                try {
                    await activeCampaignApiRequest.call(this, 'DELETE', `/api/3/webhooks/${webhookData.webhookId}`, {});
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
        return {
            workflowData: [this.helpers.returnJsonArray(req.body)],
        };
    }
}
//# sourceMappingURL=ActiveCampaignTrigger.node.js.map