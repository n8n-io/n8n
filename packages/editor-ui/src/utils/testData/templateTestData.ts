// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker/locale/en';
import type { ITemplatesWorkflowFull, IWorkflowTemplateNode } from '@/Interface';

export const newWorkflowTemplateNode = ({
	type,
	...optionalOpts
}: Pick<IWorkflowTemplateNode, 'type'> &
	Partial<IWorkflowTemplateNode>): IWorkflowTemplateNode => ({
	type,
	name: faker.commerce.productName(),
	position: [0, 0],
	parameters: {},
	typeVersion: 1,
	...optionalOpts,
});

export const fullShopifyTelegramTwitterTemplate = {
	full: true,
	id: 1205,
	name: 'Promote new Shopify products on Twitter and Telegram',
	totalViews: 485,
	createdAt: '2021-08-24T10:40:50.007Z',
	description:
		'This workflow automatically promotes your new Shopify products on Twitter and Telegram. This workflow is also featured in the blog post [*6 e-commerce workflows to power up your Shopify store*](https://n8n.io/blog/no-code-ecommerce-workflow-automations/#promote-your-new-products-on-social-media).\n\n## Prerequisites\n\n- A Shopify account and [credentials](https://docs.n8n.io/integrations/credentials/shopify/)\n- A Twitter account and [credentials](https://docs.n8n.io/integrations/credentials/twitter/)\n- A Telegram account and [credentials](https://docs.n8n.io/integrations/credentials/telegram/) for the channel you want to send messages to.\n\n## Nodes\n\n- [Shopify Trigger node](https://docs.n8n.io/integrations/trigger-nodes/n8n-nodes-base.shopifytrigger/) triggers the workflow when you create a new product in Shopify.\n- [Twitter node](https://docs.n8n.io/integrations/nodes/n8n-nodes-base.twitter/) posts a tweet with the text "Hey there, my design is now on a new product! Visit my {shop name} to get this cool {product title} (and check out more {product type})".\n- [Telegram node](https://docs.n8n.io/integrations/nodes/n8n-nodes-base.telegram/) posts a message with the same text as above in a Telegram channel.',
	workflow: {
		nodes: [
			{
				name: 'Twitter',
				type: 'n8n-nodes-base.twitter',
				position: [720, -220],
				parameters: {
					text: '=Hey there, my design is now on a new product ✨\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}}) 🛍️',
					additionalFields: {},
				},
				credentials: {
					twitterOAuth1Api: 'twitter',
				},
				typeVersion: 1,
			},
			{
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				position: [720, -20],
				parameters: {
					text: '=Hey there, my design is now on a new product!\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}})',
					chatId: '123456',
					additionalFields: {},
				},
				credentials: {
					telegramApi: 'telegram_habot',
				},
				typeVersion: 1,
			},
			{
				name: 'product created',
				type: 'n8n-nodes-base.shopifyTrigger',
				position: [540, -110],
				webhookId: '2a7e0e50-8f09-4a2b-bf54-a849a6ac4fe0',
				parameters: {
					topic: 'products/create',
				},
				credentials: {
					shopifyApi: 'shopify_nodeqa',
				},
				typeVersion: 1,
			},
		],
		connections: {
			'product created': {
				main: [
					[
						{
							node: 'Twitter',
							type: 'main',
							index: 0,
						},
						{
							node: 'Telegram',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
	},
	workflowInfo: {
		nodeCount: 3,
		nodeTypes: {
			'n8n-nodes-base.twitter': {
				count: 1,
			},
			'n8n-nodes-base.telegram': {
				count: 1,
			},
			'n8n-nodes-base.shopifyTrigger': {
				count: 1,
			},
		},
	},
	user: {
		username: 'lorenanda',
	},
	nodes: [
		{
			id: 49,
			icon: 'file:telegram.svg',
			name: 'n8n-nodes-base.telegram',
			defaults: {
				name: 'Telegram',
			},
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNjYgNjYiIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjx1c2UgeGxpbms6aHJlZj0iI2EiIHg9Ii41IiB5PSIuNSIvPjxzeW1ib2wgaWQ9ImEiIG92ZXJmbG93PSJ2aXNpYmxlIj48ZyBzdHJva2U9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyI+PHBhdGggZD0iTTAgMzJjMCAxNy42NzMgMTQuMzI3IDMyIDMyIDMyczMyLTE0LjMyNyAzMi0zMlM0OS42NzMgMCAzMiAwIDAgMTQuMzI3IDAgMzIiIGZpbGw9IiMzN2FlZTIiLz48cGF0aCBkPSJNMjEuNjYxIDM0LjMzOGwzLjc5NyAxMC41MDhzLjQ3NS45ODMuOTgzLjk4MyA4LjA2OC03Ljg2NCA4LjA2OC03Ljg2NGw4LjQwNy0xNi4yMzctMjEuMTE5IDkuODk4eiIgZmlsbD0iI2M4ZGFlYSIvPjxwYXRoIGQ9Ik0yNi42OTUgMzcuMDM0bC0uNzI5IDcuNzQ2cy0uMzA1IDIuMzczIDIuMDY4IDBsNC42NDQtNC4yMDMiIGZpbGw9IiNhOWM2ZDgiLz48cGF0aCBkPSJNMjEuNzMgMzQuNzEybC03LjgwOS0yLjU0NXMtLjkzMi0uMzc4LS42MzMtMS4yMzdjLjA2Mi0uMTc3LjE4Ni0uMzI4LjU1OS0uNTg4IDEuNzMxLTEuMjA2IDMyLjAyOC0xMi4wOTYgMzIuMDI4LTEyLjA5NnMuODU2LS4yODggMS4zNjEtLjA5N2MuMjMxLjA4OC4zNzguMTg3LjUwMy41NDguMDQ1LjEzMi4wNzEuNDExLjA2OC42ODktLjAwMy4yMDEtLjAyNy4zODYtLjA0NS42NzgtLjE4NCAyLjk3OC01LjcwNiAyNS4xOTgtNS43MDYgMjUuMTk4cy0uMzMgMS4zLTEuNTE0IDEuMzQ1Yy0uNDMyLjAxNi0uOTU2LS4wNzEtMS41ODItLjYxLTIuMzIzLTEuOTk4LTEwLjM1Mi03LjM5NC0xMi4xMjYtOC41OGEuMzQuMzQgMCAwMS0uMTQ2LS4yMzljLS4wMjUtLjEyNS4xMDgtLjI4LjEwOC0uMjhzMTMuOTgtMTIuNDI3IDE0LjM1Mi0xMy43MzFjLjAyOS0uMTAxLS4wNzktLjE1MS0uMjI2LS4xMDctLjkyOS4zNDItMTcuMDI1IDEwLjUwNi0xOC44MDEgMTEuNjI5LS4xMDQuMDY2LS4zOTUuMDIzLS4zOTUuMDIzIi8+PC9nPjwvc3ltYm9sPjwvc3ZnPg==',
			},
			categories: [
				{
					id: 6,
					name: 'Communication',
				},
			],
			displayName: 'Telegram',
			typeVersion: 1,
		},
		{
			id: 107,
			icon: 'file:shopify.svg',
			name: 'n8n-nodes-base.shopifyTrigger',
			defaults: {
				name: 'Shopify Trigger',
			},
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNTggNjYiIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjx1c2UgeGxpbms6aHJlZj0iI2EiIHg9Ii41IiB5PSIuNSIvPjxzeW1ib2wgaWQ9ImEiIG92ZXJmbG93PSJ2aXNpYmxlIj48ZyBzdHJva2U9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyI+PHBhdGggZD0iTTQ5LjI1NSAxMi40ODRhLjYzMy42MzMgMCAwMC0uNTY0LS41MjdjLS4yMjUtLjAzNy01LjE3LS4zNzYtNS4xNy0uMzc2bC0zLjc3LTMuNzdjLS4zNC0uMzc2LTEuMDkyLS4yNjYtMS4zNzYtLjE4OC0uMDM3IDAtLjc1Mi4yMjUtMS45MjIuNjA1LTEuMTM3LTMuMy0zLjE1LTYuMzA2LTYuNjk2LTYuMzA2aC0uMzAzQzI4LjQzOC42MDUgMjcuMTk0IDAgMjYuMTQ0IDBjLTguMjU2LjAzNy0xMi4yIDEwLjMzMy0xMy40MzQgMTUuNTk0bC01Ljc3IDEuNzdjLTEuNzcuNTY0LTEuODM1LjYwNS0yLjA3MyAyLjI5M0wwIDU3LjE3NSAzNi40NjggNjRsMTkuNzYzLTQuMjZjMC0uMDM3LTYuOTQtNDYuODk3LTYuOTc2LTQ3LjI1NXpNMzQuNDMxIDguODZjLS45MTcuMzAzLTEuOTYzLjYwNS0zLjEuOTQ1di0uNjhhMTUuMDMgMTUuMDMgMCAwMC0uNzUyLTQuOTk5YzEuODQ4LjI4NCAzLjEgMi4zNTcgMy44NDMgNC43MzN6bS02LjA2OC00LjI5OGMuNjAzIDEuNzc4Ljg4MyAzLjY1LjgyNiA1LjUyN3YuMzRsLTYuMzc1IDEuOTYzYzEuMjQ4LTQuNjYgMy41NS02Ljk2MiA1LjU1LTcuODN6bS0yLjQ1LTIuMjkzYTEuOTQgMS45NCAwIDAxMS4wNTUuMzM5Yy0yLjY2IDEuMjM4LTUuNDcyIDQuMzY2LTYuNjc4IDEwLjYyN2wtNS4wNDUgMS41NDZDMTYuNjY4IDEwLjAzIDE5Ljk4OCAyLjI2IDI1LjkxIDIuMjZ6IiBmaWxsPSIjOTViZjQ3Ii8+PHBhdGggZD0iTTQ4LjY5MSAxMS45NTdjLS4yMjUtLjAzNy01LjE3LS4zNzYtNS4xNy0uMzc2bC0zLjc3LTMuNzdhLjc1My43NTMgMCAwMC0uNTI3LS4yMjVMMzYuNDcyIDY0bDE5Ljc2My00LjI2LTYuOTgtNDcuMjE4YS42OC42OCAwIDAwLS41NjQtLjU2NHoiIGZpbGw9IiM1ZThlM2UiLz48cGF0aCBkPSJNMjkuNzU4IDIyLjlsLTIuNDU0IDcuMjQyYTExLjM2IDExLjM2IDAgMDAtNC43NTItMS4xMzNjLTMuODQ4IDAtNC4wMzYgMi40MTItNC4wMzYgMy4wMTggMCAzLjI5OCA4LjYzNiA0LjU2NCA4LjYzNiAxMi4zMzMgMCA2LjEtMy44ODUgMTAuMDMtOS4xIDEwLjAzLTYuMjYgMC05LjQ2Ny0zLjg4NS05LjQ2Ny0zLjg4NWwxLjY2NS01LjU1czMuMjggMi44MyA2LjA3MyAyLjgzYTIuNDcgMi40NyAwIDAwMi41NjQtMi40OWMwLTQuMzQtNy4xLTQuNTI3LTcuMS0xMS42MTggMC01Ljk2MiA0LjI5OC0xMS43NyAxMi45MzQtMTEuNzcgMy4zOTQuMDUgNS4wMTggMSA1LjAxOCAxeiIvPjwvZz48L3N5bWJvbD48L3N2Zz4=',
			},
			categories: [
				{
					id: 2,
					name: 'Sales',
				},
			],
			displayName: 'Shopify Trigger',
			typeVersion: 1,
		},
		{
			id: 325,
			icon: 'file:x.svg',
			name: 'n8n-nodes-base.twitter',
			defaults: {
				name: 'X',
			},
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE4LjI0NCAyLjI1aDMuMzA4bC03LjIyNyA4LjI2IDguNTAyIDExLjI0SDE2LjE3bC01LjIxNC02LjgxN0w0Ljk5IDIxLjc1SDEuNjhsNy43My04LjgzNUwxLjI1NCAyLjI1SDguMDhsNC43MTMgNi4yMzF6bS0xLjE2MSAxNy41MmgxLjgzM0w3LjA4NCA0LjEyNkg1LjExN3oiPjwvcGF0aD48L3N2Zz4K',
			},
			categories: [
				{
					id: 1,
					name: 'Marketing & Content',
				},
			],
			displayName: 'X (Formerly Twitter)',
			typeVersion: 2,
		},
	],
	categories: [
		{
			id: 2,
			name: 'Sales',
		},
		{
			id: 19,
			name: 'Marketing & Growth',
		},
	],
	image: [
		{
			id: 527,
			url: 'https://n8niostorageaccount.blob.core.windows.net/n8nio-strapi-blobs-prod/assets/89a078b208fe4c6181902608b1cd1332.png',
		},
	],
} satisfies ITemplatesWorkflowFull;

export const fullSaveEmailAttachmentsToNextCloudTemplate = {
	id: 1344,
	name: 'Save email attachments to Nextcloud',
	totalViews: 649,
	createdAt: '2021-11-29T13:59:16.771Z',
	description:
		'This workflow will take all emails you put into a certain folder, upload any attachements to Nextcloud, and mark the emails as read (configurable).\n\nAttachements will be saved with automatically generated filenames:\n`2021-01-01_From-Sender-Name_Filename-of-attachement.pdf`\n\nInstructions:\n1. **Allow lodash to be used in n8n** (or rewrite the code...)\n  `NODE_FUNCTION_ALLOW_EXTERNAL=lodash` (environment variable)\n2. Import workflow\n3. Set credentials for Email & Nextcloud nodes\n4. Configure to use correct folder / custom filters\n5. Activate\n\nCustom filter examples:\n- Only unread emails:\n  `Custom Email Config` = `["UNSEEN"]`\n- Filter emails by \'to\' address:\n  `Custom Email Config` = `[["TO", "example+invoices@posteo.de"]]`',
	workflow: {
		nodes: [
			{
				name: 'IMAP Email',
				type: 'n8n-nodes-base.emailReadImap',
				position: [240, 420],
				parameters: {
					format: 'resolved',
					mailbox: 'Invoices',
					options: { customEmailConfig: '["ALL"]' },
				},
				typeVersion: 1,
			},
			{
				name: 'Nextcloud',
				type: 'n8n-nodes-base.nextCloud',
				position: [940, 420],
				parameters: {
					path: '=Documents/Invoices/{{$json["date"]}}_{{$json["from"]}}_{{$binary.file.fileName}}',
					binaryDataUpload: true,
					binaryPropertyName: 'file',
				},
				typeVersion: 1,
			},
			{
				name: 'Map each attachment',
				type: 'n8n-nodes-base.function',
				position: [620, 420],
				parameters: {
					functionCode:
						"const _ = require('lodash')\n\nconst sanitize = str => _.chain(str)\n  .replace(/[^A-Za-z0-9&.-]/g, '-') // sanitise via whitelist of characters\n  .replace(/-(?=-)/g, '') // remove repeated dashes - https://regexr.com/6ag8h\n  .trim('-') // trim any leading/trailing dashes\n  .truncate({\n    length: 60,\n    omission: '-' // when the string ends with '-', you'll know it was truncated\n  })\n  .value()\n\nconst result = _.flatMap(items.map(item => {\n  //console.log({item})\n\n  // Maps each attachment to a separate item\n  return _.values(item.binary).map(file => {\n    console.log(\"Saving attachement:\", file.fileName, 'from:', ...item.json.from.value)\n    \n    // sanitize filename but exclude extension\n    const filename_parts = file.fileName.split('.')\n    const ext = _.slice(filename_parts, filename_parts.length-1)\n    const filename_main = _.join(_.dropRight(filename_parts), '.')\n    file.fileName = sanitize(filename_main) + '.' + ext\n    \n    return {\n      json: {\n        from: sanitize(item.json.from.value[0].name),\n        date: sanitize(new Date(item.json.date).toISOString().split(\"T\")[0]) // get date part \"2020-01-01\"\n      }, \n      binary: { file }\n    }\n  })\n}))\n\n//console.log(result)\nreturn result",
				},
				typeVersion: 1,
			},
		],
		connections: {
			'IMAP Email': { main: [[{ node: 'Map each attachment', type: 'main', index: 0 }]] },
			'Map each attachment': { main: [[{ node: 'Nextcloud', type: 'main', index: 0 }]] },
		},
	},
	workflowInfo: {
		nodeCount: 3,
		nodeTypes: {
			'n8n-nodes-base.function': { count: 1 },
			'n8n-nodes-base.nextCloud': { count: 1 },
			'n8n-nodes-base.emailReadImap': { count: 1 },
		},
	},
	user: { username: 'tennox' },
	nodes: [
		{
			id: 10,
			icon: 'fa:inbox',
			name: 'n8n-nodes-base.emailReadImap',
			defaults: { name: 'Email Trigger (IMAP)', color: '#44AA22' },
			iconData: { icon: 'inbox', type: 'icon' },
			categories: [
				{ id: 6, name: 'Communication' },
				{ id: 9, name: 'Core Nodes' },
			],
			displayName: 'Email Trigger (IMAP)',
			typeVersion: 2,
		},
		{
			id: 14,
			icon: 'fa:code',
			name: 'n8n-nodes-base.function',
			defaults: { name: 'Function', color: '#FF9922' },
			iconData: { icon: 'code', type: 'icon' },
			categories: [
				{ id: 5, name: 'Development' },
				{ id: 9, name: 'Core Nodes' },
			],
			displayName: 'Function',
			typeVersion: 1,
		},
		{
			id: 25,
			icon: 'file:nextcloud.svg',
			name: 'n8n-nodes-base.nextCloud',
			defaults: { name: 'Nextcloud' },
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzYgNTEiIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjx1c2UgeGxpbms6aHJlZj0iI0EiIHg9Ii41IiB5PSIuNSIvPjxzeW1ib2wgaWQ9IkEiIG92ZXJmbG93PSJ2aXNpYmxlIj48cGF0aCBkPSJNMzcuNTMzIDBjLTcuNzcgMC0xNC4zNTUgNS4yNjgtMTYuMzk2IDEyLjM3OS0xLjc3OC0zLjgxOS01LjU5Ny02LjQ1My0xMC4wNzUtNi40NTNDNS4wMDQgNS45MjYgMCAxMC45MzEgMCAxNy4wNTRhMTEuMTYgMTEuMTYgMCAwIDAgMTEuMTI4IDExLjEyOGM0LjQxMiAwIDguMjk3LTIuNjM0IDEwLjA3NS02LjQ1M2ExNi45OSAxNi45OSAwIDAgMCAxNi4zMyAxMi4zNzljNy43MDQgMCAxNC4yODktNS4yMDIgMTYuMzk2LTEyLjI0OCAxLjc3OCAzLjY4NyA1LjU5NyA2LjI1NiA5Ljk0MyA2LjI1NkExMS4xNiAxMS4xNiAwIDAgMCA3NSAxNi45ODljMC02LjEyNC01LjAwNC0xMS4wNjItMTEuMTI4LTExLjA2Mi00LjM0NiAwLTguMTY1IDIuNTY4LTkuOTQzIDYuMjU2QzUxLjgyMiA1LjIwMiA0NS4zMDMgMCAzNy41MzMgMHptMCA2LjUxOWExMC40OCAxMC40OCAwIDAgMSAxMC41MzUgMTAuNTM2QTEwLjQ4IDEwLjQ4IDAgMCAxIDM3LjUzMyAyNy41OWExMC40OCAxMC40OCAwIDAgMS0xMC41MzYtMTAuNTM1QTEwLjQ4IDEwLjQ4IDAgMCAxIDM3LjUzMyA2LjUxOXptLTI2LjQwNSA1LjkyNmE0LjU4IDQuNTggMCAwIDEgNC42MDkgNC42MDkgNC41OCA0LjU4IDAgMCAxLTQuNjA5IDQuNjA5IDQuNTggNC41OCAwIDAgMS00LjYwOS00LjYwOSA0LjU4IDQuNTggMCAwIDEgNC42MDktNC42MDl6bTUyLjc0NCAwYTQuNTggNC41OCAwIDAgMSA0LjYwOSA0LjYwOSA0LjYwOSA0LjYwOSAwIDEgMS05LjIxOCAwYy4wNjYtMi41NjggMi4wNDEtNC42MDkgNC42MDktNC42MDl6TTE5LjE3NiA0MS45NTdjMS44MjcgMCAyLjg1IDEuMzAxIDIuODUgMy4yNTIgMCAuMTg2LS4xNTUuMzQxLS4zNDEuMzQxSDE2Ljc2Yy4wMzEgMS43MzQgMS4yMzkgMi43MjYgMi42MzMgMi43MjZhMi44OSAyLjg5IDAgMCAwIDEuNzk2LS42MTljLjE4Ni0uMTI0LjM0MS0uMDkzLjQzNC4wOTNsLjA5My4xNTVjLjA5My4xNTUuMDYyLjMxLS4wOTMuNDM0YTMuODQgMy44NCAwIDAgMS0yLjI2MS43NDNjLTIuMDEzIDAtMy41NjItMS40NTYtMy41NjItMy41NjIuMDMxLTIuMjMgMS41MTgtMy41NjIgMy4zNzYtMy41NjJ6bTEuODg5IDIuOTExYy0uMDYyLTEuNDI1LS45MjktMi4xMzctMS45Mi0yLjEzNy0xLjE0NiAwLTIuMTM3Ljc0My0yLjM1NCAyLjEzN2g0LjI3NHptMTAuMjUzLTEuOTJ2LS43NzQtMS42MTFjMC0uMjE3LjEyNC0uMzQxLjM0MS0uMzQxaC4yNDhjLjIxNyAwIC4zMS4xMjQuMzEuMzQxdjEuNjExaDEuMzk0Yy4yMTcgMCAuMzQxLjEyNC4zNDEuMzQxdi4wOTNjMCAuMjE3LS4xMjQuMzEtLjM0MS4zMWgtMS4zOTR2My40MDdjMCAxLjU4Ljk2IDEuNzY2IDEuNDg3IDEuNzk2LjI3OS4wMzEuMzcyLjA5My4zNzIuMzQxdi4xODZjMCAuMjE3LS4wOTMuMzEtLjM3Mi4zMS0xLjQ4NyAwLTIuMzg1LS44OTgtMi4zODUtMi41MDl2LTMuNXptNy4wOTMtLjk5MWMxLjE3NyAwIDEuOTIuNDk2IDIuMjYxLjc3NC4xNTUuMTI0LjE4Ni4yNzkuMDMxLjQ2NWwtLjA5My4xNTVjLS4xMjQuMTg2LS4yNzkuMTg2LS40NjUuMDYyLS4zMS0uMjE3LS44OTgtLjYxOS0xLjcwMy0uNjE5LTEuNDg3IDAtMi42NjQgMS4xMTUtMi42NjQgMi43NTcgMCAxLjYxMSAxLjE3NyAyLjcyNiAyLjY2NCAyLjcyNi45NiAwIDEuNjExLS40MzQgMS45Mi0uNzEyLjE4Ni0uMTI0LjMxLS4wOTMuNDM0LjA5M2wuMDkzLjEyNGMuMDkzLjE4Ni4wNjIuMzEtLjA5My40NjVhMy44MSAzLjgxIDAgMCAxLTIuNDE2Ljg2N2MtMi4wMTMgMC0zLjU2Mi0xLjQ1Ni0zLjU2Mi0zLjU2Mi4wMzEtMi4xMDYgMS41OC0zLjU5MyAzLjU5My0zLjU5M3ptNC4xMTktMi4xOTljMC0uMjE3LS4xMjQtLjM0MS4wOTMtLjM0MWguMjQ4Yy4yMTcgMCAuNTU4LjEyNC41NTguMzQxdjcuNDAzYzAgLjg2Ny40MDMuOTYuNzEyLjk5MS4xNTUgMCAuMjc5LjA5My4yNzkuMzF2LjIxN2MwIC4yMTctLjA5My4zNDEtLjM0MS4zNDEtLjU1NyAwLTEuNTQ5LS4xODYtMS41NDktMS42NzN2LTcuNTg5em02LjM1IDIuMTk5YzEuOTgyIDAgMy41OTMgMS41MTggMy41OTMgMy41MzEgMCAyLjA0NC0xLjYxMSAzLjU5My0zLjU5MyAzLjU5M3MtMy41OTMtMS41NDktMy41OTMtMy41OTNjMC0yLjAxMyAxLjYxMS0zLjUzMSAzLjU5My0zLjUzMXptMCA2LjMxOWMxLjQ1NiAwIDIuNjMzLTEuMTc3IDIuNjMzLTIuNzg4IDAtMS41NDktMS4xNzctMi42OTUtMi42MzMtMi42OTVhMi42NyAyLjY3IDAgMCAwLTIuNjY0IDIuNjk1Yy4wMzEgMS41OCAxLjIwOCAyLjc4OCAyLjY2NCAyLjc4OHptMTUuNDU2LTYuMzE5YTIuNDUgMi40NSAwIDAgMSAyLjIzIDEuMzYzaC4wMzFzLS4wMzEtLjIxNy0uMDMxLS41MjZ2LTMuMDY2YzAtLjIxNy0uMDkzLS4zNDEuMTI0LS4zNDFoLjI0OGMuMjE3IDAgLjU1OC4xMjQuNTU4LjM0MXY4LjgyN2MwIC4yMTctLjA5My4zNDEtLjMxLjM0MWgtLjIxN2MtLjIxNyAwLS4zNDEtLjA5My0uMzQxLS4zMXYtLjUyN2MwLS4yNDguMDYyLS40MzQuMDYyLS40MzRoLS4wMzFzLS41ODkgMS40MjUtMi4zNTQgMS40MjVjLTEuODI3IDAtMi45NzMtMS40NTYtMi45NzMtMy41NjItLjA2Mi0yLjEwNiAxLjIwOC0zLjUzMSAzLjAwNC0zLjUzMWgwem0uMDMxIDYuMzE5YzEuMTQ2IDAgMi4xOTktLjgwNSAyLjE5OS0yLjc1NyAwLTEuMzk0LS43MTItMi43MjYtMi4xNjgtMi43MjYtMS4yMDggMC0yLjE5OS45OTEtMi4xOTkgMi43MjYuMDMxIDEuNjczLjg5OCAyLjc1NyAyLjE2OCAyLjc1N3ptLTU2LjU1OC42NWguMjQ4Yy4yMTcgMCAuMzQxLS4xMjQuMzQxLS4zNDF2LTYuNjI4YzAtMS4wNTMgMS4xNDYtMS43OTYgMi40NDctMS43OTZzMi40NDcuNzQzIDIuNDQ3IDEuNzk2djYuNjU5YzAgLjIxNy4xMjQuMzQxLjM0MS4zNDFoLjI0OGMuMjE3IDAgLjMxLS4xMjQuMzEtLjM0MXYtNi43MjFjMC0xLjc2Ni0xLjc2NS0yLjYzMy0zLjM3Ni0yLjYzM2gwIDAgMCAwYy0xLjU0OSAwLTMuMzE0Ljg2Ny0zLjMxNCAyLjYzM3Y2LjY5YzAgLjIxNy4wOTMuMzQxLjMxLjM0MXptNTEuNjk1LTYuODE0aC0uMjQ4Yy0uMjE3IDAtLjM0MS4xMjQtLjM0MS4zNDF2My43NDhjMCAxLjA1My0uNjgxIDIuMDEzLTIuMDEzIDIuMDEzLTEuMzAxIDAtMi4wMTMtLjk2LTIuMDEzLTIuMDEzdi0zLjc0OGMwLS4yMTctLjEyNC0uMzQxLS4zNDEtLjM0MUg1NC4zYy0uMjE3IDAtLjMxLjEyNC0uMzEuMzQxdjMuOTk2YzAgMS43NjUgMS4zMDEgMi42MzMgMi45MTIgMi42MzNoMCAwIDAgMGMxLjYxMSAwIDIuOTExLS44NjcgMi45MTEtMi42MzN2LTMuOTk2Yy4wMzEtLjIxNy0uMDkzLS4zNDEtLjMxLS4zNDFoMHptLTMwLjY2NC0uMDMxYy0uMDYyIDAtLjE1NS4wNjItLjIxNy4xNTVsLTEuMjM5IDEuNDg3LS45MjkgMS4xMTUtMS40MjUtMS43MDQtLjc3NC0uOTI5Yy0uMDYyLS4wOTMtLjE1NS0uMTI0LS4yMTctLjEyNHMtLjE1NS4wMzEtLjI0OC4wOTNsLS4xODYuMTU1Yy0uMTU1LjEyNC0uMTU1LjI3OS0uMDMxLjQ2NWwxLjIzOSAxLjQ4NyAxLjA1MyAxLjIzOS0xLjUxOCAxLjgyN2gwbC0uNzc0LjkyOWMtLjEyNC4xNTUtLjEyNC4zNDEuMDMxLjQ5NmwuMTg2LjE1NWMuMTU1LjEyNC4zMS4wOTMuNDY1LS4wNjJsMS4yMzktMS40ODcuOTI5LTEuMTE1IDEuNDI1IDEuNzA0aDBsLjc3NC45MjljLjEyNC4xNTUuMzEuMTg2LjQ2NS4wMzFsLjE4Ni0uMTU1Yy4xNTUtLjEyNC4xNTUtLjI3OS4wMzEtLjQ2NWwtMS4yMzktMS40ODctMS4wNTMtMS4yMzkgMS41MTgtMS44MjdoMGwuNzc0LS45MjljLjEyNC0uMTU1LjEyNC0uMzQxLS4wMzEtLjQ5NWwtLjE4Ni0uMTg2Yy0uMDkzLS4wNjItLjE1NS0uMDkzLS4yNDgtLjA2MmgweiIgZmlsbD0iIzAwODJjOSIgZmlsbC1ydWxlPSJub256ZXJvIiBzdHJva2U9Im5vbmUiLz48L3N5bWJvbD48L3N2Zz4=',
			},
			categories: [{ id: 3, name: 'Data & Storage' }],
			displayName: 'Nextcloud',
			typeVersion: 1,
		},
	],
	categories: [
		{ id: 2, name: 'Sales' },
		{ id: 8, name: 'Finance & Accounting' },
	],
	image: [],
	full: true,
} satisfies ITemplatesWorkflowFull;

/** Template that doesn't contain nodes requiring credentials */
export const fullCreateApiEndpointTemplate = {
	id: 1750,
	name: 'Creating an API endpoint',
	recentViews: 9899,
	totalViews: 13265,
	createdAt: '2022-07-06T14:45:19.659Z',
	description:
		'**Task:**\nCreate a simple API endpoint using the Webhook and Respond to Webhook nodes\n\n**Why:**\nYou can prototype or replace a backend process with a single workflow\n\n**Main use cases:**\nReplace backend logic with a workflow',
	workflow: {
		nodes: [
			{
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				position: [375, 115],
				webhookId: '6f7b288e-1efe-4504-a6fd-660931327269',
				parameters: {
					path: '6f7b288e-1efe-4504-a6fd-660931327269',
					options: {},
					responseMode: 'responseNode',
				},
				typeVersion: 1,
			},
			{
				name: 'Note1',
				type: 'n8n-nodes-base.stickyNote',
				position: [355, -25],
				parameters: {
					width: 600,
					height: 280,
					content:
						'## Create a simple API endpoint\n\nIn this workflow we show how to create a simple API endpoint with `Webhook` and `Respond to Webhook` nodes\n\n',
				},
				typeVersion: 1,
			},
			{
				name: 'Respond to Webhook',
				type: 'n8n-nodes-base.respondToWebhook',
				position: [815, 115],
				parameters: {
					options: {},
					respondWith: 'text',
					responseBody:
						'=The URL of the Google search query for the term "{{$node["Webhook"].json["query"]["first_name"]}} {{$node["Webhook"].json["query"]["last_name"]}}" is: {{$json["product"]}}',
				},
				typeVersion: 1,
			},
			{
				name: 'Create URL string',
				type: 'n8n-nodes-base.set',
				position: [595, 115],
				parameters: {
					values: {
						string: [
							{
								name: 'product',
								value:
									'=https://www.google.com/search?q={{$json["query"]["first_name"]}}+{{$json["query"]["last_name"]}}',
							},
						],
					},
					options: {},
					keepOnlySet: true,
				},
				typeVersion: 1,
			},
			{
				name: 'Note3',
				type: 'n8n-nodes-base.stickyNote',
				position: [355, 275],
				parameters: {
					width: 600,
					height: 220,
					content:
						'### How to use it\n1. Execute the workflow so that the webhook starts listening\n2. Make a test request by pasting, **in a new browser tab**, the test URL from the `Webhook` node and appending the following test at the end `?first_name=bob&last_name=dylan`\n\nYou will receive the following output in the new tab `The URL of the Google search query for the term "bob dylan" is: https://www.google.com/search?q=bob+dylan`\n\n',
				},
				typeVersion: 1,
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Create URL string', type: 'main', index: 0 }]] },
			'Create URL string': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
		},
	},
	lastUpdatedBy: 1,
	workflowInfo: {
		nodeCount: 2,
		nodeTypes: {},
	},
	user: { username: 'jon-n8n' },
	nodes: [
		{
			id: 38,
			icon: 'fa:pen',
			name: 'n8n-nodes-base.set',
			defaults: { name: 'Edit Fields', color: '#0000FF' },
			iconData: { icon: 'pen', type: 'icon' },
			categories: [{ id: 9, name: 'Core Nodes' }],
			displayName: 'Edit Fields (Set)',
			typeVersion: 3,
		},
		{
			id: 47,
			icon: 'file:webhook.svg',
			name: 'n8n-nodes-base.webhook',
			defaults: { name: 'Webhook' },
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciICB2aWV3Qm94PSIwIDAgNDggNDgiIHdpZHRoPSI0OHB4IiBoZWlnaHQ9IjQ4cHgiPjxwYXRoIGZpbGw9IiMzNzQ3NGYiIGQ9Ik0zNSwzN2MtMi4yLDAtNC0xLjgtNC00czEuOC00LDQtNHM0LDEuOCw0LDRTMzcuMiwzNywzNSwzN3oiLz48cGF0aCBmaWxsPSIjMzc0NzRmIiBkPSJNMzUsNDNjLTMsMC01LjktMS40LTcuOC0zLjdsMy4xLTIuNWMxLjEsMS40LDIuOSwyLjMsNC43LDIuM2MzLjMsMCw2LTIuNyw2LTZzLTIuNy02LTYtNiBjLTEsMC0yLDAuMy0yLjksMC43bC0xLjcsMUwyMy4zLDE2bDMuNS0xLjlsNS4zLDkuNGMxLTAuMywyLTAuNSwzLTAuNWM1LjUsMCwxMCw0LjUsMTAsMTBTNDAuNSw0MywzNSw0M3oiLz48cGF0aCBmaWxsPSIjMzc0NzRmIiBkPSJNMTQsNDNDOC41LDQzLDQsMzguNSw0LDMzYzAtNC42LDMuMS04LjUsNy41LTkuN2wxLDMuOUM5LjksMjcuOSw4LDMwLjMsOCwzM2MwLDMuMywyLjcsNiw2LDYgczYtMi43LDYtNnYtMmgxNXY0SDIzLjhDMjIuOSwzOS42LDE4LjgsNDMsMTQsNDN6Ii8+PHBhdGggZmlsbD0iI2U5MWU2MyIgZD0iTTE0LDM3Yy0yLjIsMC00LTEuOC00LTRzMS44LTQsNC00czQsMS44LDQsNFMxNi4yLDM3LDE0LDM3eiIvPjxwYXRoIGZpbGw9IiMzNzQ3NGYiIGQ9Ik0yNSwxOWMtMi4yLDAtNC0xLjgtNC00czEuOC00LDQtNHM0LDEuOCw0LDRTMjcuMiwxOSwyNSwxOXoiLz48cGF0aCBmaWxsPSIjZTkxZTYzIiBkPSJNMTUuNywzNEwxMi4zLDMybDUuOS05LjdjLTItMS45LTMuMi00LjUtMy4yLTcuM2MwLTUuNSw0LjUtMTAsMTAtMTBjNS41LDAsMTAsNC41LDEwLDEwIGMwLDAuOS0wLjEsMS43LTAuMywyLjVsLTMuOS0xYzAuMS0wLjUsMC4yLTEsMC4yLTEuNWMwLTMuMy0yLjctNi02LTZzLTYsMi43LTYsNmMwLDIuMSwxLjEsNCwyLjksNS4xbDEuNywxTDE1LjcsMzR6Ii8+PC9zdmc+Cg==',
			},
			categories: [
				{ id: 5, name: 'Development' },
				{ id: 9, name: 'Core Nodes' },
			],
			displayName: 'Webhook',
			typeVersion: 1,
		},
		{
			id: 535,
			icon: 'file:webhook.svg',
			name: 'n8n-nodes-base.respondToWebhook',
			defaults: { name: 'Respond to Webhook' },
			iconData: {
				type: 'file',
				fileBuffer:
					'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciICB2aWV3Qm94PSIwIDAgNDggNDgiIHdpZHRoPSI0OHB4IiBoZWlnaHQ9IjQ4cHgiPjxwYXRoIGZpbGw9IiMzNzQ3NGYiIGQ9Ik0zNSwzN2MtMi4yLDAtNC0xLjgtNC00czEuOC00LDQtNHM0LDEuOCw0LDRTMzcuMiwzNywzNSwzN3oiLz48cGF0aCBmaWxsPSIjMzc0NzRmIiBkPSJNMzUsNDNjLTMsMC01LjktMS40LTcuOC0zLjdsMy4xLTIuNWMxLjEsMS40LDIuOSwyLjMsNC43LDIuM2MzLjMsMCw2LTIuNyw2LTZzLTIuNy02LTYtNiBjLTEsMC0yLDAuMy0yLjksMC43bC0xLjcsMUwyMy4zLDE2bDMuNS0xLjlsNS4zLDkuNGMxLTAuMywyLTAuNSwzLTAuNWM1LjUsMCwxMCw0LjUsMTAsMTBTNDAuNSw0MywzNSw0M3oiLz48cGF0aCBmaWxsPSIjMzc0NzRmIiBkPSJNMTQsNDNDOC41LDQzLDQsMzguNSw0LDMzYzAtNC42LDMuMS04LjUsNy41LTkuN2wxLDMuOUM5LjksMjcuOSw4LDMwLjMsOCwzM2MwLDMuMywyLjcsNiw2LDYgczYtMi43LDYtNnYtMmgxNXY0SDIzLjhDMjIuOSwzOS42LDE4LjgsNDMsMTQsNDN6Ii8+PHBhdGggZmlsbD0iI2U5MWU2MyIgZD0iTTE0LDM3Yy0yLjIsMC00LTEuOC00LTRzMS44LTQsNC00czQsMS44LDQsNFMxNi4yLDM3LDE0LDM3eiIvPjxwYXRoIGZpbGw9IiMzNzQ3NGYiIGQ9Ik0yNSwxOWMtMi4yLDAtNC0xLjgtNC00czEuOC00LDQtNHM0LDEuOCw0LDRTMjcuMiwxOSwyNSwxOXoiLz48cGF0aCBmaWxsPSIjZTkxZTYzIiBkPSJNMTUuNywzNEwxMi4zLDMybDUuOS05LjdjLTItMS45LTMuMi00LjUtMy4yLTcuM2MwLTUuNSw0LjUtMTAsMTAtMTBjNS41LDAsMTAsNC41LDEwLDEwIGMwLDAuOS0wLjEsMS43LTAuMywyLjVsLTMuOS0xYzAuMS0wLjUsMC4yLTEsMC4yLTEuNWMwLTMuMy0yLjctNi02LTZzLTYsMi43LTYsNmMwLDIuMSwxLjEsNCwyLjksNS4xbDEuNywxTDE1LjcsMzR6Ii8+PC9zdmc+Cg==',
			},
			categories: [
				{ id: 7, name: 'Utility' },
				{ id: 9, name: 'Core Nodes' },
			],
			displayName: 'Respond to Webhook',
			typeVersion: 1,
		},
	],
	categories: [{ id: 20, name: 'Building Blocks' }],
	image: [],
	full: true,
} satisfies ITemplatesWorkflowFull;
