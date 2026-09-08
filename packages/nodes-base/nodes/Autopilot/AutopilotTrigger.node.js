import { snakeCase } from 'change-case';
import { NodeConnectionTypes } from 'n8n-workflow';
import { autopilotApiRequest } from './GenericFunctions';
export class AutopilotTrigger {
    description = {
        displayName: 'Autopilot Trigger',
        name: 'autopilotTrigger',
        icon: 'file:autopilot.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Handle Autopilot events via webhooks',
        defaults: {
            name: 'Autopilot Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'autopilotApi',
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
                displayName: 'Event',
                name: 'event',
                type: 'options',
                required: true,
                default: '',
                options: [
                    {
                        name: 'Contact Added',
                        value: 'contactAdded',
                    },
                    {
                        name: 'Contact Added To List',
                        value: 'contactAddedToList',
                    },
                    {
                        name: 'Contact Entered Segment',
                        value: 'contactEnteredSegment',
                    },
                    {
                        name: 'Contact Left Segment',
                        value: 'contactLeftSegment',
                    },
                    {
                        name: 'Contact Removed From List',
                        value: 'contactRemovedFromList',
                    },
                    {
                        name: 'Contact Unsubscribed',
                        value: 'contactUnsubscribed',
                    },
                    {
                        name: 'Contact Updated',
                        value: 'contactUpdated',
                    },
                ],
            },
        ],
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const event = this.getNodeParameter('event');
                const { hooks: webhooks } = await autopilotApiRequest.call(this, 'GET', '/hooks');
                for (const webhook of webhooks) {
                    if (webhook.target_url === webhookUrl && webhook.event === snakeCase(event)) {
                        webhookData.webhookId = webhook.hook_id;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const event = this.getNodeParameter('event');
                const body = {
                    event: snakeCase(event),
                    target_url: webhookUrl,
                };
                const webhook = await autopilotApiRequest.call(this, 'POST', '/hook', body);
                webhookData.webhookId = webhook.hook_id;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                try {
                    await autopilotApiRequest.call(this, 'DELETE', `/hook/${webhookData.webhookId}`);
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
//# sourceMappingURL=AutopilotTrigger.node.js.map