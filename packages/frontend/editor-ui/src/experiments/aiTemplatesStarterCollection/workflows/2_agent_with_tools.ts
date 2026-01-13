import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const AGENT_WITH_TOOLS: WorkflowDataCreate = {
	meta: {
		templateId: '035_template_onboarding-agent_with_tools',
	},
	name: '2. Agent with tools',
	nodes: [
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [-48, -16],
			id: 'f6c9fe3c-cbde-4514-9fcf-9d618526965c',
			name: 'When chat message received',
			webhookId: '1bf95244-fbc3-4210-9420-f34a45c4f5f5',
		},
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2.1,
			position: [208, -16],
			id: '5db1043f-de79-425a-a66b-8288c3aaa7df',
			name: 'AI Agent',
		},
		{
			parameters: {},
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.3,
			position: [208, 288],
			id: '29f1ba2f-7511-4771-958a-be6463a64d83',
			name: 'Simple Memory',
		},
		{
			parameters: {
				operation: 'update',
				documentId: {
					__rl: true,
					value: '1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8',
					mode: 'list',
					cachedResultName: 'Demo',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk',
				},
				sheetName: {
					__rl: true,
					value: 'gid=0',
					mode: 'list',
					cachedResultName: 'Sheet1',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0',
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						ID: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('ID__using_to_match_', ``, 'string') }}",
						Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}",
					},
					matchingColumns: ['ID'],
					schema: [
						{
							id: 'ID',
							displayName: 'ID',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
							removed: false,
						},
						{
							id: 'Name',
							displayName: 'Name',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
							removed: false,
						},
						{
							id: 'row_number',
							displayName: 'row_number',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'number',
							canBeUsedToMatch: true,
							readOnly: true,
							removed: true,
						},
					],
					attemptToConvertTypes: false,
					convertFieldsToString: false,
				},
				options: {},
			},
			type: 'n8n-nodes-base.googleSheetsTool',
			typeVersion: 4.6,
			position: [656, 640],
			id: '24d82ca2-b666-415b-9020-f88cf3e095e6',
			name: 'Update',
			credentials: {},
		},
		{
			parameters: {
				operation: 'append',
				documentId: {
					__rl: true,
					value: '1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8',
					mode: 'list',
					cachedResultName: 'Demo',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk',
				},
				sheetName: {
					__rl: true,
					value: 'gid=0',
					mode: 'list',
					cachedResultName: 'Sheet1',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0',
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
						ID: "={{ `${Math.random()}`.replace('0.', '') }}",
						Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}",
					},
					matchingColumns: ['ID'],
					schema: [
						{
							id: 'ID',
							displayName: 'ID',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
							removed: false,
						},
						{
							id: 'Name',
							displayName: 'Name',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
							removed: false,
						},
						{
							id: 'row_number',
							displayName: 'row_number',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'number',
							canBeUsedToMatch: true,
							readOnly: true,
							removed: true,
						},
					],
					attemptToConvertTypes: false,
					convertFieldsToString: false,
				},
				options: {},
			},
			type: 'n8n-nodes-base.googleSheetsTool',
			typeVersion: 4.6,
			position: [464, 640],
			id: 'a0554e4a-8a7a-480c-a9e6-5f9746252cdb',
			name: 'Create',
			credentials: {},
		},
		{
			parameters: {
				documentId: {
					__rl: true,
					value: '1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8',
					mode: 'list',
					cachedResultName: 'Demo',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk',
				},
				sheetName: {
					__rl: true,
					value: 'gid=0',
					mode: 'list',
					cachedResultName: 'Sheet1',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0',
				},
				options: {},
			},
			type: 'n8n-nodes-base.googleSheetsTool',
			typeVersion: 4.6,
			position: [480, 288],
			id: 'ef476f0d-bdfe-4f41-8690-fb270ed82469',
			name: 'Read',
			credentials: {},
		},
		{
			parameters: {
				operation: 'delete',
				documentId: {
					__rl: true,
					value: '1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8',
					mode: 'list',
					cachedResultName: 'Demo',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk',
				},
				sheetName: {
					__rl: true,
					value: 'gid=0',
					mode: 'list',
					cachedResultName: 'Sheet1',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0',
				},
				startIndex:
					"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start_Row_Number', ``, 'number') }}",
				numberToDelete:
					"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Number_of_Rows_to_Delete', ``, 'number') }}",
			},
			type: 'n8n-nodes-base.googleSheetsTool',
			typeVersion: 4.6,
			position: [864, 640],
			id: 'd0cca35f-9e74-4935-92e2-9b5e37f1c7f4',
			name: 'Delete',
			credentials: {},
		},
		{
			parameters: {
				content:
					"### Readme\nThis agent uses tools to interact with a simple spreadsheet of orders.\n\n**Quick Start**\n1. Copy this [spreadsheet](https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=sharing) into your Google Drive.\n2. Open the **Read** tool and connect your Google account by creating a credential and selecting the spreadsheet.\n3. Ask the Agent to calculate the total in the amount column, you should see it use the **Read** tool followed by the **Calculator**.\n4. Try some other questions and see how the agent responds.\n5. Use what you've learned to connect the other tools in the **Next steps** section.\n\n---\n\n**Learn More**\n- [Google sheet tool documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.googleSheetsTool)\n- [Calculator tool documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcalculator/)",
				height: 460,
				width: 440,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [-576, -32],
			typeVersion: 1,
			id: 'e57c1fe3-3ef9-447c-81e3-bdf8717706b9',
			name: 'Sticky Note',
		},
		{
			parameters: {},
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			typeVersion: 1,
			position: [624, 288],
			id: '49030d8b-0818-455b-a472-356b620566c4',
			name: 'Calculator',
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4.1-mini',
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.2,
			position: [48, 288],
			id: '67c78b12-b088-41b4-aeb4-70a7f056c9a7',
			name: 'Model',
			credentials: {},
		},
		{
			parameters: {
				content: '## 🛠️ Tools',
				height: 224,
				width: 368,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [400, 224],
			typeVersion: 1,
			id: '14c03c2d-e0ea-4958-94c1-3598e5c273d9',
			name: 'Sticky Note1',
		},
		{
			parameters: {
				content:
					'## 🛠️ Next steps\n\nConnect these tools to perform create, read and update actions on your order list.',
				height: 320,
				width: 592,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [400, 496],
			typeVersion: 1,
			id: 'a683cb43-e740-497e-bb01-edebfe39a832',
			name: 'Sticky Note2',
		},
	],
	connections: {
		'When chat message received': {
			main: [
				[
					{
						node: 'AI Agent',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Simple Memory': {
			ai_memory: [
				[
					{
						node: 'AI Agent',
						type: 'ai_memory',
						index: 0,
					},
				],
			],
		},
		Update: {
			ai_tool: [[]],
		},
		Create: {
			ai_tool: [[]],
		},
		Read: {
			ai_tool: [
				[
					{
						node: 'AI Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		Delete: {
			ai_tool: [[]],
		},
		Calculator: {
			ai_tool: [
				[
					{
						node: 'AI Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		Model: {
			ai_languageModel: [
				[
					{
						node: 'AI Agent',
						type: 'ai_languageModel',
						index: 0,
					},
				],
			],
		},
	},
};
