import { IN8nTemplate } from '@/Interface';

const template = {
	id: '23',
	name: 'New/updated employee in BambooHR -> Create/Update user in Okta and Slack to group',
	description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris hendrerit iaculis ante quis pretium. Fusce eget lectus nec quam ornare finibus. Proin ut imperdiet velit. Donec at ligula mattis, sagittis     elit sit amet, volutpat quam. Nunc vel congue quam. Vivamus feugiat libero tellus, quis iaculis justo mattis sit amet. Nam vitae nunc vel urna interdum pretium ut quis odio. Maecenas porta scelerisque dolor eleifend suscipit. Ut venenatis orci eget neque vestibulum, id elementum nisi congue. Nulla facilisi. Suspendisse vitae venenatis urna. Fusce viverra sapien nec diam tincidunt, id scelerisque turpis viverra. Morbi finibus consequat nisi maximus malesuada. Integer vel ultricies odio. Donec at ligula mattis, sagittis elit sit amet Vivamus feugiat libero tellus, quis iaculis justo mattis sit amet. Nam vitae nunc vel urna interdum pretium ut quis odio. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris hendrerit iaculis ante quis pretium. Fusce eget lectus nec quam ornare finibus. I made this workflow after discovering that n8n does not have a Todoist trigger. \n\nSteps:\n\n- Configure Todoist webhook by visiting their portal [https://developer.todoist.com/appconsole.html](https://developer.todoist.com/appconsole.html) and checking off the triggers which you want to use. I only used item:completed in my case, but yours could be different.\n- Use the test webhook URL from n8n to test your trigger.\n- Once testing is successful, register the production webhook URL from n8n into the todoist developer portal\n- Adjust the date & time to your liking and appropriate timezone\n- In my case I am sending the data to a Google Sheet but you can change that to whatever app you want to send it to.\n- Profit!\n\nFeel free to reach out to me on [https://twitter.com/sami_abid](https://twitter.com/sami_abid) if you have any questions\n<script>alert("xss");</script>',
	image: [
		{
			id: '564',
			url: 'https://f000.backblazeb2.com/file/n8n-website-images/ffa19945d89a4feca922859899d435cf.png',
		},
	],
	mainImage: [
		{
			url: 'https://f000.backblazeb2.com/file/n8n-website-images/ffa19945d89a4feca922859899d435cf.png',
			metadata: {
				width: '1000',
			},
		},
		{
			url: 'https://f000.backblazeb2.com/file/n8n-website-images/ffa19945d89a4feca922859899d435cf.png',
			metadata: {
				width: '600',
			},
		},
	],
	nodes: [
		{
			defaults: {
				color: '#00e000',
			},
			displayName: 'Play',
			icon: 'fa:play',
			// iconData: {
			// 	fileBuffer: 'file:E:\projects\clients\n8n\packages\cli\node_modules\n8n-nodes-base\dist\nodes\Webhook\webhook.svg',
			// 	type: 'fa:play',
			// },
			name: 'n8n-nodes-base.start',
			typeVersion: 1,
		},
		{
			defaults: {
				color: '#000000',
			},
			displayName: 'Webhook',
			icon: `file:E:\projects\clients\n8n\packages\cli\node_modules\n8n-nodes-base\dist\nodes\Webhook\webhook.svg`,
			// iconData: {
			// 	fileBuffer: 'file:E:\projects\clients\n8n\packages\cli\node_modules\n8n-nodes-base\dist\nodes\Webhook\webhook.svg',
			// 	type: 'n8n-nodes-base.webhook',
			// },
			name: 'n8n-nodes-base.webhook',
			typeVersion: 1,
		},
	],
	totalViews: 120000,
	categories: [
		{
			id: '1',
			name: 'Security Ops',
		},
		{
			id: '2',
			name: 'Building Blocks',
		},
		{
			id: '3',
			name: 'Building Blocks',
		},
		{
			id: '4',
			name: 'Building Blocks',
		},
		{
			id: '5',
			name: 'Building Blocks',
		},
	],
	user: {
		username: 'someusername',
	},
	createdAt: '2021-12-15T11:56:35.412Z',
};

export async function getTemplateById(templateId: string): Promise<IN8nTemplate> {
	return template;
}
