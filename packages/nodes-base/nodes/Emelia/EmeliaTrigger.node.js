import { NodeConnectionTypes, } from 'n8n-workflow';
import { emeliaApiRequest, emeliaApiTest, emeliaGraphqlRequest } from './GenericFunctions';
export class EmeliaTrigger {
    description = {
        displayName: 'Emelia Trigger',
        name: 'emeliaTrigger',
        icon: 'file:emelia.svg',
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        group: ['trigger'],
        version: 1,
        description: 'Handle Emelia campaign activity events via webhooks',
        defaults: {
            name: 'Emelia Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'emeliaApi',
                required: true,
                testedBy: 'emeliaApiTest',
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
                displayName: 'Campaign Name or ID',
                name: 'campaignId',
                type: 'options',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                typeOptions: {
                    loadOptionsMethod: 'getCampaigns',
                },
                required: true,
                default: '',
            },
            {
                displayName: 'Events',
                name: 'events',
                type: 'multiOptions',
                required: true,
                default: [],
                options: [
                    {
                        name: 'Email Bounced',
                        value: 'bounced',
                    },
                    {
                        name: 'Email Opened',
                        value: 'opened',
                    },
                    {
                        name: 'Email Replied',
                        value: 'replied',
                    },
                    {
                        name: 'Email Sent',
                        value: 'sent',
                    },
                    {
                        name: 'Link Clicked',
                        value: 'clicked',
                    },
                    {
                        name: 'Unsubscribed Contact',
                        value: 'unsubscribed',
                    },
                ],
            },
        ],
    };
    methods = {
        credentialTest: {
            emeliaApiTest,
        },
        loadOptions: {
            async getCampaigns() {
                const responseData = await emeliaGraphqlRequest.call(this, {
                    query: `
					query GetCampaigns {
						campaigns {
							_id
							name
						}
					}`,
                    operationName: 'GetCampaigns',
                    variables: '{}',
                });
                return responseData.data.campaigns.map((campaign) => ({
                    name: campaign.name,
                    value: campaign._id,
                }));
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const campaignId = this.getNodeParameter('campaignId');
                const { webhooks } = await emeliaApiRequest.call(this, 'GET', '/webhook');
                for (const webhook of webhooks) {
                    if (webhook.url === webhookUrl && webhook.campaignId === campaignId) {
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const events = this.getNodeParameter('events');
                const campaignId = this.getNodeParameter('campaignId');
                const body = {
                    hookUrl: webhookUrl,
                    events: events.map((e) => e.toUpperCase()),
                    campaignId,
                };
                const { webhookId } = await emeliaApiRequest.call(this, 'POST', '/webhook/webhook', body);
                webhookData.webhookId = webhookId;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const campaignId = this.getNodeParameter('campaignId');
                try {
                    const body = {
                        hookUrl: webhookUrl,
                        campaignId,
                    };
                    await emeliaApiRequest.call(this, 'DELETE', '/webhook/webhook', body);
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
//# sourceMappingURL=EmeliaTrigger.node.js.map