import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class BrowserNotification implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browser Notification',
		name: 'browserNotification',
		icon: 'fa:bell',
		group: ['organization'],
		version: 1,
		subtitle: '={{$parameter["title"]}}',
		description: 'Send a browser notification to connected n8n sessions',
		defaults: {
			name: 'Browser Notification',
			color: '#ff6b35',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Sends a native browser notification to your connected n8n browser sessions.<br><br>' +
					'<strong>Setup required:</strong><br>' +
					'1. Browser notifications must be enabled in your browser<br>' +
					"2. If not enabled, you'll see a prompt when the workflow runs<br><br>" +
					'<em>Note: Notifications are sent to all your open n8n tabs, not to other users.</em>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: 'Workflow Notification',
				required: true,
				description: 'The title of the notification',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'The body text of the notification',
				placeholder: 'e.g. Your workflow has completed successfully!',
			},
			{
				displayName: 'Icon URL',
				name: 'iconUrl',
				type: 'string',
				default: '',
				description:
					'URL to an icon image to display in the notification. Defaults to the n8n favicon if not specified.',
				placeholder: 'e.g. https://example.com/icon.png',
			},
		],
		hints: [
			{
				type: 'info',
				message:
					"This node requires browser notification permissions. If you haven't enabled them yet, " +
					"you'll see a prompt when you run this workflow. Click the prompt to grant permission.",
				displayCondition: '=true',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const title = this.getNodeParameter('title', 0) as string;
		const message = this.getNodeParameter('message', 0) as string;
		const iconUrl = this.getNodeParameter('iconUrl', 0) as string;

		this.setMetadata({
			browserApi: {
				type: 'notification',
				notification: {
					title,
					body: message || undefined,
					icon: iconUrl || undefined,
				},
			},
		});

		return [
			items.map((item) => ({
				...item,
				json: {
					...item.json,
					notification: {
						title,
						message: message || null,
						iconUrl: iconUrl || null,
						status: 'sent',
						note: 'Notification was sent to your browser. If you did not see it, check that browser notifications are enabled.',
					},
				},
			})),
		];
	}
}
