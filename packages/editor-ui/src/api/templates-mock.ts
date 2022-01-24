import { IN8nTemplateResponse } from '@/Interface';

const response = {
	data: {
		workflow: {
			id: '23',
			name: 'New/updated employee in BambooHR -> Create/Update user in Okta and Slack to group',
			description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris hendrerit iaculis ante quis pretium. Fusce eget lectus nec quam ornare finibus. Proin ut imperdiet velit. Donec at ligula mattis, sagittis     elit sit amet, volutpat quam. Nunc vel congue quam. Vivamus feugiat libero tellus, quis iaculis justo mattis sit amet. Nam vitae nunc vel urna interdum pretium ut quis odio. Maecenas porta scelerisque dolor eleifend suscipit. Ut venenatis orci eget neque vestibulum, id elementum nisi congue. Nulla facilisi. Suspendisse vitae venenatis urna. Fusce viverra sapien nec diam tincidunt, id scelerisque turpis viverra. Morbi finibus consequat nisi maximus malesuada. Integer vel ultricies odio. Donec at ligula mattis, sagittis elit sit amet Vivamus feugiat libero tellus, quis iaculis justo mattis sit amet. Nam vitae nunc vel urna interdum pretium ut quis odio. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris hendrerit iaculis ante quis pretium. Fusce eget lectus nec quam ornare finibus. I made this workflow after discovering that n8n does not have a Todoist trigger. \n\nSteps:\n\n- Configure Todoist webhook by visiting their portal [https://developer.todoist.com/appconsole.html](https://developer.todoist.com/appconsole.html) and checking off the triggers which you want to use. I only used item:completed in my case, but yours could be different.\n- Use the test webhook URL from n8n to test your trigger.\n- Once testing is successful, register the production webhook URL from n8n into the todoist developer portal\n- Adjust the date & time to your liking and appropriate timezone\n- In my case I am sending the data to a Google Sheet but you can change that to whatever app you want to send it to.\n- Profit!\n\nFeel free to reach out to me on [https://twitter.com/sami_abid](https://twitter.com/sami_abid) if you have any questions\n<script>alert("xss");</script>\n\n\n\n**HTTP Request node:** This node fetches an image from Unsplash. Replace this node with any other node to fetch the image file.\n\n**HTTP Request1 node:** This node uploads the Twitter Profile Banner. The Twitter API requires OAuth 1.0 authentication. Follow the Twitter documentation to learn how to configure the authentication.\n\n**Cron node** schedules the workflow to run every minute.\n1. Copy workflow to your n8n\n2. Set telegram credentials and\n3. Copy workflow to your n8n\n2. Set telegram credentials and\n *Heading* \n ***Heading*** \n  **h1Headingh1** \n  ##Heading 2 \n ###Heading3 \n > Blockquote \n ~~Strikethrough~~ \n # 🛸 Technologies Used \n \n ## 🛸 Technologies Used \n ### 🛸 Technologies Used \n #### 🛸 Technologies Used \n ```bash npm install happiness ``` \n - [ ] Mercury \n - [x] Mercury',
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
						color: '#000000',
					},
					displayName: 'Airtable',
					icon: 'file:airtable.svg',
					iconData: {
						fileBuffer: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTcwIj48cGF0aCBkPSJNODkgNC44TDE2LjIgMzQuOWMtNC4xIDEuNy00IDcuNC4xIDkuMWw3My4yIDI5YzYuNCAyLjYgMTMuNiAyLjYgMjAgMGw3My4yLTI5YzQuMS0xLjYgNC4xLTcuNC4xLTkuMWwtNzMtMzAuMUMxMDMuMiAyIDk1LjcgMiA4OSA0LjgiIGZpbGw9IiNmY2I0MDAiLz48cGF0aCBkPSJNMTA1LjkgODguOXY3Mi41YzAgMy40IDMuNSA1LjggNi43IDQuNWw4MS42LTMxLjdjMS45LS43IDMuMS0yLjUgMy4xLTQuNVY1Ny4yYzAtMy40LTMuNS01LjgtNi43LTQuNUwxMDkgODQuM2MtMS45LjgtMy4xIDIuNi0zLjEgNC42IiBmaWxsPSIjMThiZmZmIi8+PHBhdGggZD0iTTg2LjkgOTIuNmwtMjQuMiAxMS43LTIuNSAxLjJMOS4xIDEzMGMtMy4yIDEuNi03LjQtLjgtNy40LTQuNFY1Ny41YzAtMS4zLjctMi40IDEuNi0zLjMuNC0uNC44LS43IDEuMi0uOSAxLjItLjcgMy0uOSA0LjQtLjNsNzcuNSAzMC43YzQgMS41IDQuMyA3LjEuNSA4LjkiIGZpbGw9IiNmODJiNjAiLz48cGF0aCBkPSJNODYuOSA5Mi42bC0yNC4yIDExLjctNTkuNC01MGMuNC0uNC44LS43IDEuMi0uOSAxLjItLjcgMy0uOSA0LjQtLjNsNzcuNSAzMC43YzQgMS40IDQuMyA3IC41IDguOCIgZmlsbD0iI2JhMWU0NSIvPjwvc3ZnPg==',
						type: 'file',
					},
					name: 'n8n-nodes-base.airtable',
					typeVersion: 1,
				},
				{
					defaults: {
						color: '#305b94',
					},
					displayName: 'AWS Rekognition',
					icon: `file:rekognition.svg`,
					iconData: {
						fileBuffer: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzQuMzc1IDg1IiBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48dXNlIHhsaW5rOmhyZWY9IiNhIiB4PSIyLjE4OCIgeT0iMi41Ii8+PHN5bWJvbCBpZD0iYSIgb3ZlcmZsb3c9InZpc2libGUiPjxnIHN0cm9rZT0ibm9uZSI+PHBhdGggZD0iTTIuODg2IDUyLjhMMTYuOCA1MS4yNjhWMjguNzMyTDIuODg2IDI3LjJ2MjUuNnoiIGZpbGw9IiM1Mjk0Y2YiLz48ZyBmaWxsPSIjMTk0ODZmIj48cGF0aCBkPSJNNjcuMjA3IDI4Ljg5OGwtNi40NjIgMi40My0zNi4yMzctNS4zNDZMMzQuOTkgMGwzMi4yMTcgMjguODk4eiIvPjxwYXRoIGQ9Ik0zLjUwNCAyOC45NjZMMzUgMTIuMjM0IDQ1LjU0MyAyNiAxNi44MSAzMC4yMjRsLTEzLjMwNS0xLjI2eiIvPjwvZz48ZyBmaWxsPSIjMjA1Yjk5Ij48cGF0aCBkPSJNMzUgMjRMMCAzMC42MjRWMTYuNTU2TDM1IDBsMTcuMDE2IDE4LjQ3OEwzNSAyNHoiLz48cGF0aCBkPSJNNy4wMDggMTYuNDc4TDAgMTkuMzk1djQ0LjA1bDcuMDA4IDMuMzA3VjE2LjQ3OHoiLz48L2c+PHBhdGggZD0iTTcwIDE2LjU2NkwzNSAwdjI0bDM1IDYuNjI0di0xNC4wNnoiIGZpbGw9IiM1Mjk0Y2YiLz48ZyBmaWxsPSIjOTliY2UzIj48cGF0aCBkPSJNMS4xNTQgNTEuMjZMMzQuOTkgODBsMTAuNTU0LTI2LTI4LjczNC00LjIyNEwxLjE1NCA1MS4yNnoiLz48cGF0aCBkPSJNNjcuNjQgNTEuMTQybC02LjQ5My0yLjUyNy0zNi42NCA1LjQwNSAxMC40OCAyNS4yMiAzMi42NS0yOC4wOTd6Ii8+PC9nPjxwYXRoIGQ9Ik02Ny4yMDcgNTEuMTAzbC0xMy45NjUtMS4zMjd2LTE5LjU1TDY3LjIwNyAyOC45djIyLjIwNXpNMzUgNTZsMTUuMTMtMTZMMzUgMjQgMTYuMzU2IDQwIDM1IDU2eiIgZmlsbD0iIzIwNWI5OSIvPjxwYXRoIGQ9Ik01My42MjQgNDBMMzUgNTZWMjRsMTguNjM0IDE2eiIgZmlsbD0iIzUyOTRjZiIvPjxwYXRoIGQ9Ik0wIDQ5LjM3NkwzNSA1NmwxOS4yMSA3Ljg3M0wzNSA4MCAwIDYzLjQ0NFY0OS4zNzZ6IiBmaWxsPSIjMjA1Yjk5Ii8+PGcgZmlsbD0iIzUyOTRjZiI+PHBhdGggZD0iTTcwIDYzLjQzNUwzNSA4MFY1NmwzNS02LjYyNHYxNC4wNnoiLz48cGF0aCBkPSJNNjIuOTcgNjYuNzVMNzAgNjMuNDM0VjE2LjU2NmwtNy4wMy0zLjMyN1Y2Ni43NXoiLz48L2c+PC9nPjwvc3ltYm9sPjwvc3ZnPg==',
						type: 'file',
					},
					name: 'n8n-nodes-base.awsRekognition',
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
		},
	},
};

export async function getTemplateById(templateId: string): Promise<IN8nTemplateResponse> {
	return response;
}
