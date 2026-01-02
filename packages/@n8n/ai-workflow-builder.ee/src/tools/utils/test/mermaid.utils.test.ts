import type { WorkflowMetadata } from '@/types';

import { mermaidStringify, processWorkflowExamples } from '../mermaid.utils';
import { aiAssistantWorkflow } from './workflows/ai-assistant.workflow';

describe('markdown-workflow.utils', () => {
	describe('mermaidStringify', () => {
		it('should convert a workflow with AI agent and tools to mermaid diagram', () => {
			const result = mermaidStringify(aiAssistantWorkflow);
			const expected = `\`\`\`mermaid
flowchart TD
%% # Try It Out! Launch Jackie—your personal AI assistant that handles voice & text via Telegram to manage your digital life. **To get started:** 1. **Connect all credentials** (Telegram, OpenAI, Gmail, etc.) 2. **Activate the workflow** and message your Telegram bot: • "What emails do I have today?" • "Show me my calendar for tomorrow" • "Craete new to-do item" • 🎤 Send voice messages for hands-free interaction ## Questions or Need Help? For setup assistance, customization, or workflow support, join my Skool community! ### [AI Automation Engineering Community](https://www.skool.com/ai-automation-engineering-3014) Happy learning! -- Derek Cheung
%% ## [Video Tutorial](https://youtu.be/ROgf5dVqYPQ) @[youtube](ROgf5dVqYPQ)
%% n8n-nodes-base.telegramTrigger | {"updates":["message"],"additionalFields":{}}
n4["Listen for incoming events"]
%% ## Process Telegram Request
subgraph sg1["## Process Telegram Request"]
%% n8n-nodes-base.set | {"fields":{"values":[{"name":"text","stringValue":"={{ $json?.message?.text || \\"\\" }}"}]},"options":{}}
n7["Voice or Text"]
%% n8n-nodes-base.if | {"conditions":{"options":{"version":2,"leftValue":"","caseSensitive":true,"typeValidation":"strict"},"combinator":"and","conditions":[{"id":"a0bf9719-4272-46f6-ab3b-eda6f7b44fd8","operator":{"type":"string","operation":"empty","singleValue":true},"leftValue":"={{ $json.message.text }}","rightValue":""}]},"options":{}}
n7 --> n6{"If"}
%% n8n-nodes-base.telegram:file | {"resource":"file","fileId":"={{ $('Listen for incoming events').item.json.message.voice.file_id }}","additionalFields":{}}
n6 --> n8["Get Voice File"]
end
subgraph sg2["Jackie, AI Assistant 👩🏻‍🏫"]
%% This node allows your agent access your Google calendar
%% n8n-nodes-base.googleCalendarTool:getAll | {"operation":"getAll","calendar":{"__rl":true,"mode":"id","value":"=<insert email here>"},"options":{"timeMin":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', \`\`, 'string') }}","timeMax":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', \`\`, 'string') }}","fields":"=items(summary, start(dateTime))"}}
n1["Google Calendar"]
%% This node helps your agent remember the last few messages to stay on topic.
%% @n8n/n8n-nodes-langchain.memoryBufferWindow | {"sessionIdType":"customKey","sessionKey":"={{ $('Listen for incoming events').first().json.message.from.id }}"}
n2["Window Buffer Memory"]
%% 1. [In OpenRouter](https://openrouter.ai/settings/keys) click **“Create API key”** and copy it. 2. Open the \`\`\`OpenRouter\`\`\` node: * **Select Credential → Create New** * Paste into **API Key** and **Save**
%% @n8n/n8n-nodes-langchain.lmChatOpenRouter | {"options":{}}
n9["OpenRouter"]
%% This node allows your agent create and get tasks from Google Tasks
subgraph sg3["This node allows your agent create and get tasks from Google Tasks"]
%% n8n-nodes-base.googleTasksTool | {"task":"MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow","title":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', \`\`, 'string') }}","additionalFields":{}}
n10["Create a task in Google Tasks"]
%% n8n-nodes-base.googleTasksTool:getAll | {"operation":"getAll","task":"MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow","additionalFields":{}}
n11["Get many tasks in Google Tasks"]
end
%% This node allows your agent access your gmail
subgraph sg4["This node allows your agent access your gmail"]
%% n8n-nodes-base.gmailTool:getAll | {"operation":"getAll","limit":20,"filters":{"labelIds":["INBOX"],"readStatus":"unread","receivedAfter":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_After', \`\`, 'string') }}","receivedBefore":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_Before', \`\`, 'string') }}"}}
n3["Get Email"]
%% n8n-nodes-base.gmailTool | {"sendTo":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', \`\`, 'string') }}","subject":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', \`\`, 'string') }}","message":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', \`Please format this nicely in html\`, 'string') }}","options":{"appendAttribution":false}}
n13["Send Email"]
end
%% Caylee, your peronal AI Assistant: 1. Get email 2. Check calendar 3. Get and create to-do tasks Edit the **System Message** to adjust your agent’s thinking, behavior, and replies.
%% @n8n/n8n-nodes-langchain.agent | {"promptType":"define","text":"={{ $json.text }}","options":{"systemMessage":"=You are a helpful personal assistant called Jackie. \\n\\nToday's date is {{ $today.format('yyyy-MM-dd') }}.\\n\\nGuidelines:\\n- When summarizing emails, include Sender, Message date, subject, and brief summary of email.\\n- if the user did not specify a date in the request assume they are asking for today\\n- When answering questions about calendar events, filter out events that don't apply to the question.  For example, the question is about events for today, only reply with events for today. Don't mention future events if it's more than 1 week away\\n- When creating calendar entry, the attendee email is optional"}}
n1 -.ai_tool.-> n14["Jackie, AI Assistant 👩🏻‍🏫"]
n2 -.ai_memory.-> n14
n9 -.ai_languageModel.-> n14
n10 -.ai_tool.-> n14
n11 -.ai_tool.-> n14
n3 -.ai_tool.-> n14
n13 -.ai_tool.-> n14
end
n4 --> n7
%% Uses OpenAI to convert voice to text. [In OpenAI](https://platform.openai.com/api-keys) click **“Create new secret key”** and copy it.
%% @n8n/n8n-nodes-langchain.openAi:audio:transcribe | {"resource":"audio","operation":"transcribe","options":{}}
n8 --> n12["Transcribe a recording"]
%% Send message back to Telegram
%% n8n-nodes-base.telegram | {"chatId":"={{ $('Listen for incoming events').first().json.message.from.id }}","text":"={{ $json.output }}","additionalFields":{"appendAttribution":false,"parse_mode":"Markdown"}}
n14 --> n5["Telegram"]
n12 --> n14
n6 --> n14
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should convert a workflow with AI agent and tools to mermaid diagram without node parameters', () => {
			const result = mermaidStringify(aiAssistantWorkflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% # Try It Out! Launch Jackie—your personal AI assistant that handles voice & text via Telegram to manage your digital life. **To get started:** 1. **Connect all credentials** (Telegram, OpenAI, Gmail, etc.) 2. **Activate the workflow** and message your Telegram bot: • "What emails do I have today?" • "Show me my calendar for tomorrow" • "Craete new to-do item" • 🎤 Send voice messages for hands-free interaction ## Questions or Need Help? For setup assistance, customization, or workflow support, join my Skool community! ### [AI Automation Engineering Community](https://www.skool.com/ai-automation-engineering-3014) Happy learning! -- Derek Cheung
%% ## [Video Tutorial](https://youtu.be/ROgf5dVqYPQ) @[youtube](ROgf5dVqYPQ)
%% n8n-nodes-base.telegramTrigger
n4["Listen for incoming events"]
%% ## Process Telegram Request
subgraph sg1["## Process Telegram Request"]
%% n8n-nodes-base.set
n7["Voice or Text"]
%% n8n-nodes-base.if
n7 --> n6{"If"}
%% n8n-nodes-base.telegram:file
n6 --> n8["Get Voice File"]
end
subgraph sg2["Jackie, AI Assistant 👩🏻‍🏫"]
%% This node allows your agent access your Google calendar
%% n8n-nodes-base.googleCalendarTool:getAll
n1["Google Calendar"]
%% This node helps your agent remember the last few messages to stay on topic.
%% @n8n/n8n-nodes-langchain.memoryBufferWindow
n2["Window Buffer Memory"]
%% 1. [In OpenRouter](https://openrouter.ai/settings/keys) click **“Create API key”** and copy it. 2. Open the \`\`\`OpenRouter\`\`\` node: * **Select Credential → Create New** * Paste into **API Key** and **Save**
%% @n8n/n8n-nodes-langchain.lmChatOpenRouter
n9["OpenRouter"]
%% This node allows your agent create and get tasks from Google Tasks
subgraph sg3["This node allows your agent create and get tasks from Google Tasks"]
%% n8n-nodes-base.googleTasksTool
n10["Create a task in Google Tasks"]
%% n8n-nodes-base.googleTasksTool:getAll
n11["Get many tasks in Google Tasks"]
end
%% This node allows your agent access your gmail
subgraph sg4["This node allows your agent access your gmail"]
%% n8n-nodes-base.gmailTool:getAll
n3["Get Email"]
%% n8n-nodes-base.gmailTool
n13["Send Email"]
end
%% Caylee, your peronal AI Assistant: 1. Get email 2. Check calendar 3. Get and create to-do tasks Edit the **System Message** to adjust your agent’s thinking, behavior, and replies.
%% @n8n/n8n-nodes-langchain.agent
n1 -.ai_tool.-> n14["Jackie, AI Assistant 👩🏻‍🏫"]
n2 -.ai_memory.-> n14
n9 -.ai_languageModel.-> n14
n10 -.ai_tool.-> n14
n11 -.ai_tool.-> n14
n3 -.ai_tool.-> n14
n13 -.ai_tool.-> n14
end
n4 --> n7
%% Uses OpenAI to convert voice to text. [In OpenAI](https://platform.openai.com/api-keys) click **“Create new secret key”** and copy it.
%% @n8n/n8n-nodes-langchain.openAi:audio:transcribe
n8 --> n12["Transcribe a recording"]
%% Send message back to Telegram
%% n8n-nodes-base.telegram
n14 --> n5["Telegram"]
n12 --> n14
n6 --> n14
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle workflow with single node', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1001,
				name: 'Simple Workflow',
				workflow: {
					name: 'Simple Workflow',
					nodes: [
						{
							parameters: { updates: ['message'] },
							id: 'node1',
							name: 'Trigger',
							type: 'n8n-nodes-base.telegramTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow);

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.telegramTrigger | {"updates":["message"]}
n1["Trigger"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle workflow with branching connections', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1002,
				name: 'Branching Workflow',
				workflow: {
					name: 'Branching Workflow',
					nodes: [
						{
							parameters: {},
							id: 'if1',
							name: 'If',
							type: 'n8n-nodes-base.if',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'node1',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							position: [100, 0],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'node2',
							name: 'False Branch',
							type: 'n8n-nodes-base.set',
							position: [100, 100],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'node3',
							name: 'Send Success Email',
							type: 'n8n-nodes-base.emailSend',
							position: [200, 0],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'node4',
							name: 'Send Failure Email',
							type: 'n8n-nodes-base.emailSend',
							position: [200, 100],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						If: {
							main: [
								[{ node: 'True Branch', type: 'main', index: 0 }],
								[{ node: 'False Branch', type: 'main', index: 0 }],
							],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'True Branch': {
							main: [[{ node: 'Send Success Email', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'False Branch': {
							main: [[{ node: 'Send Failure Email', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow);

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.if
n1{"If"}
%% n8n-nodes-base.set
n1 --> n2["True Branch"]
%% n8n-nodes-base.set
n1 --> n3["False Branch"]
%% n8n-nodes-base.emailSend
n2 --> n4["Send Success Email"]
%% n8n-nodes-base.emailSend
n3 --> n5["Send Failure Email"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should render conditional nodes (if, switch, filter) with diamond shape', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1003,
				name: 'Conditional Workflow',
				workflow: {
					name: 'Conditional Workflow',
					nodes: [
						{
							parameters: {},
							id: 'trigger1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: {
								conditions: {
									options: { caseSensitive: true },
									conditions: [{ leftValue: '', rightValue: '' }],
								},
							},
							id: 'if1',
							name: 'If',
							type: 'n8n-nodes-base.if',
							position: [200, 0],
							typeVersion: 2.3,
						},
						{
							parameters: {
								rules: { values: [{ conditions: {} }] },
							},
							id: 'switch1',
							name: 'Switch',
							type: 'n8n-nodes-base.switch',
							position: [400, -100],
							typeVersion: 3.4,
						},
						{
							parameters: {
								conditions: {
									conditions: [{ leftValue: '', rightValue: '' }],
								},
							},
							id: 'filter1',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							position: [600, -100],
							typeVersion: 2.3,
						},
						{
							parameters: {},
							id: 'end1',
							name: 'End',
							type: 'n8n-nodes-base.noOp',
							position: [800, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Start: {
							main: [[{ node: 'If', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						If: {
							main: [[{ node: 'Switch', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Switch: {
							main: [[{ node: 'Filter', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Filter: {
							main: [[{ node: 'End', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.manualTrigger
n1["Start"]
%% n8n-nodes-base.if
n1 --> n2{"If"}
%% n8n-nodes-base.switch
n2 --> n3{"Switch"}
%% n8n-nodes-base.filter
n3 --> n4{"Filter"}
%% n8n-nodes-base.noOp
n4 --> n5["End"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should include resource and operation in node type comment', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1004,
				name: 'Resource Operation Workflow',
				workflow: {
					name: 'Resource Operation Workflow',
					nodes: [
						{
							parameters: {
								resource: 'file',
								operation: 'download',
								fileId: '123',
							},
							id: 'node1',
							name: 'Download File',
							type: 'n8n-nodes-base.googleDrive',
							position: [0, 0],
							typeVersion: 3,
						},
						{
							parameters: {
								operation: 'getAll',
								limit: 10,
							},
							id: 'node2',
							name: 'Get Rows',
							type: 'n8n-nodes-base.googleSheets',
							position: [200, 0],
							typeVersion: 4,
						},
						{
							parameters: {
								resource: 'contact',
							},
							id: 'node3',
							name: 'Get Contact',
							type: 'n8n-nodes-base.hubspot',
							position: [400, 0],
							typeVersion: 2,
						},
						{
							parameters: {
								url: 'https://example.com',
							},
							id: 'node4',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							position: [600, 0],
							typeVersion: 4,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.googleDrive:file:download
n1["Download File"]
%% n8n-nodes-base.googleSheets:getAll
n2["Get Rows"]
%% n8n-nodes-base.hubspot:contact
n3["Get Contact"]
%% n8n-nodes-base.httpRequest
n4["HTTP Request"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle nodes without parameters', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1005,
				name: 'Empty Params',
				workflow: {
					name: 'Empty Params',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Empty Node',
							type: 'n8n-nodes-base.noOp',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow);

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.noOp
n1["Empty Node"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should add non-overlapping sticky notes as comments at start', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1006,
				name: 'With Sticky',
				workflow: {
					name: 'With Sticky',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { content: 'This is a note', width: 100, height: 80 },
							id: 'sticky1',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							position: [500, 500],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% This is a note
%% n8n-nodes-base.manualTrigger
n1["Start"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should add sticky overlapping single node as comment before that node', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1007,
				name: 'Sticky Over Node',
				workflow: {
					name: 'Sticky Over Node',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.start',
							position: [100, 100],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'node2',
							name: 'End',
							type: 'n8n-nodes-base.noOp',
							position: [400, 100],
							typeVersion: 1,
						},
						{
							parameters: { content: 'This triggers the workflow', width: 200, height: 200 },
							id: 'sticky1',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							position: [50, 50],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Start: {
							main: [[{ node: 'End', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% This triggers the workflow
%% n8n-nodes-base.start
n1["Start"]
%% n8n-nodes-base.noOp
n1 --> n2["End"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should wrap multiple overlapping nodes in a subgraph', () => {
			// Based on the user-provided example with If and Switch inside a sticky
			const workflow: WorkflowMetadata = {
				templateId: 1008,
				name: 'Multi Node Sticky',
				workflow: {
					name: 'Multi Node Sticky',
					nodes: [
						{
							parameters: {
								conditions: { conditions: [] },
							},
							type: 'n8n-nodes-base.if',
							typeVersion: 2.3,
							position: [208, 0],
							id: '7a6a98ee-564e-4200-b26b-b5548ccfb571',
							name: 'If',
						},
						{
							parameters: {
								rules: { values: [] },
							},
							type: 'n8n-nodes-base.switch',
							typeVersion: 3.4,
							position: [416, -96],
							id: '57dd331c-0d3d-427c-96c8-7ffa10224fa1',
							name: 'Switch',
						},
						{
							parameters: {
								conditions: { conditions: [] },
							},
							type: 'n8n-nodes-base.filter',
							typeVersion: 2.3,
							position: [624, -96],
							id: '2f37e366-a7b6-4022-b6fa-2231aae5c308',
							name: 'Filter',
						},
						{
							parameters: {
								content: "## I'm a Sticky",
								height: 416,
								width: 400,
							},
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [144, -208],
							id: '55473414-5980-4e0b-ada4-d5e10ee8f08b',
							name: 'Sticky Note',
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						If: {
							main: [[{ node: 'Switch', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Switch: {
							main: [[{ node: 'Filter', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% ## I'm a Sticky
subgraph sg1["## I'm a Sticky"]
%% n8n-nodes-base.if
n1{"If"}
%% n8n-nodes-base.switch
n1 --> n2{"Switch"}
end
%% n8n-nodes-base.filter
n2 --> n3{"Filter"}
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should skip sticky notes without content', () => {
			const workflow: WorkflowMetadata = {
				templateId: 1009,
				name: 'Empty Sticky',
				workflow: {
					name: 'Empty Sticky',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { content: '', width: 200, height: 200 },
							id: 'sticky1',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
%% n8n-nodes-base.manualTrigger
n1["Start"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should render AI capability connections with dotted arrows and type labels', () => {
			const workflow: WorkflowMetadata = {
				templateId: 9001,
				name: 'AI Connection Types',
				workflow: {
					name: 'AI Connection Types',
					nodes: [
						{
							parameters: {},
							id: 'trigger1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'model1',
							name: 'OpenAI Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							position: [100, 100],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'agent1',
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							position: [300, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Start: {
							main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'OpenAI Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			// Should contain dotted arrow with connection type for AI connections
			expect(result).toContain('-.ai_languageModel.->');
			// Should contain solid arrow for main connections
			expect(result).toContain('-->');
		});

		it('should handle nodes with only AI connections and no main output', () => {
			const workflow: WorkflowMetadata = {
				templateId: 9002,
				name: 'AI Only Node',
				workflow: {
					name: 'AI Only Node',
					nodes: [
						{
							parameters: {},
							id: 'model1',
							name: 'Chat Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							position: [0, 100],
							typeVersion: 1,
						},
						{
							parameters: {},
							id: 'agent1',
							name: 'Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							position: [200, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Chat Model': {
							ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			// Chat Model should appear in output
			expect(result).toContain('Chat Model');
			// Should have the AI connection
			expect(result).toContain('-.ai_languageModel.->');
			// Chat Model should NOT have any main arrows going FROM it (no "n1 -->" pattern)
			const lines = result.split('\n');
			const chatModelId = lines.find((l) => l.includes('Chat Model'))?.match(/^(n\d+)/)?.[1];
			expect(chatModelId).toBeDefined();
			// No main connection arrows FROM the chat model node
			expect(result).not.toMatch(new RegExp(`${chatModelId} -->`));
		});

		it('should respect includeNodeType: false option', () => {
			const workflow: WorkflowMetadata = {
				templateId: 9003,
				name: 'Type Option Test',
				workflow: {
					name: 'Type Option Test',
					nodes: [
						{
							parameters: { text: 'hello' },
							id: 'node1',
							name: 'Set Data',
							type: 'n8n-nodes-base.set',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow, {
				includeNodeType: false,
				includeNodeParameters: true,
			});

			// Should NOT contain node type comment
			expect(result).not.toContain('n8n-nodes-base.set');
			// Should still contain node name
			expect(result).toContain('Set Data');
			// Should contain parameters since includeNodeParameters is true
			expect(result).toContain('text');
		});

		it('should handle cyclic workflows without infinite loops', () => {
			const workflow: WorkflowMetadata = {
				templateId: 9004,
				name: 'Loop Workflow',
				workflow: {
					name: 'Loop Workflow',
					nodes: [
						{
							parameters: {},
							id: 'trigger1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { batchSize: 10 },
							id: 'loop1',
							name: 'Loop Over Items',
							type: 'n8n-nodes-base.splitInBatches',
							position: [200, 0],
							typeVersion: 3,
						},
						{
							parameters: {},
							id: 'process1',
							name: 'Process Item',
							type: 'n8n-nodes-base.set',
							position: [400, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Start: {
							main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Loop Over Items': {
							main: [
								[], // Done output (empty for this test)
								[{ node: 'Process Item', type: 'main', index: 0 }], // Loop output
							],
						},
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Process Item': {
							main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]], // Loop back
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			// Should complete without hanging
			expect(result).toContain('```mermaid');
			// Each node should appear only once in definitions
			const loopMatches = result.match(/Loop Over Items/g);
			expect(loopMatches?.length).toBeLessThanOrEqual(2); // Definition + connection reference
		});

		it('should render agent node even without AI sub-nodes connected', () => {
			const workflow: WorkflowMetadata = {
				templateId: 9005,
				name: 'Standalone Agent',
				workflow: {
					name: 'Standalone Agent',
					nodes: [
						{
							parameters: {},
							id: 'trigger1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { promptType: 'define', text: 'Hello' },
							id: 'agent1',
							name: 'Lonely Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							position: [200, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Start: {
							main: [[{ node: 'Lonely Agent', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const result = mermaidStringify(workflow, { includeNodeParameters: false });

			// Agent should still be rendered
			expect(result).toContain('Lonely Agent');
			// Should have main connection to agent
			expect(result).toContain('--> ');
			expect(result).toContain('Lonely Agent');
		});
	});

	describe('processWorkflowExamples', () => {
		it('should generate mermaid diagrams and collect node configurations in one pass', () => {
			const workflow1: WorkflowMetadata = {
				templateId: 2001,
				name: 'Workflow 1',
				workflow: {
					name: 'Workflow 1',
					nodes: [
						{
							parameters: { updates: ['message'] },
							id: 'node1',
							name: 'Telegram Trigger',
							type: 'n8n-nodes-base.telegramTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { chatId: '123', text: 'Hello' },
							id: 'node2',
							name: 'Send Message',
							type: 'n8n-nodes-base.telegram',
							position: [200, 0],
							typeVersion: 1,
						},
					],
					connections: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Telegram Trigger': {
							main: [[{ node: 'Send Message', type: 'main', index: 0 }]],
						},
					},
				},
			};

			const workflow2: WorkflowMetadata = {
				templateId: 2002,
				name: 'Workflow 2',
				workflow: {
					name: 'Workflow 2',
					nodes: [
						{
							parameters: { chatId: '456', text: 'World' },
							id: 'node3',
							name: 'Another Telegram',
							type: 'n8n-nodes-base.telegram',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { operation: 'getAll' },
							id: 'node4',
							name: 'Gmail',
							type: 'n8n-nodes-base.gmail',
							position: [200, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const results = processWorkflowExamples([workflow1, workflow2], {
				includeNodeParameters: false,
			});

			// Should return results for each workflow
			expect(results).toHaveLength(2);

			// Each result should have mermaid string
			expect(results[0].mermaid).toContain('```mermaid');
			expect(results[0].mermaid).toContain('n8n-nodes-base.telegramTrigger');
			expect(results[1].mermaid).toContain('n8n-nodes-base.gmail');

			// Node configurations should be accumulated across all workflows
			const nodeConfigs = results[1].nodeConfigurations;

			// Should have telegram trigger config from workflow1 with version info
			expect(nodeConfigs['n8n-nodes-base.telegramTrigger']).toHaveLength(1);
			expect(nodeConfigs['n8n-nodes-base.telegramTrigger'][0]).toEqual({
				version: 1,
				parameters: { updates: ['message'] },
			});

			// Should have both telegram configs (from workflow1 and workflow2) with version info
			expect(nodeConfigs['n8n-nodes-base.telegram']).toHaveLength(2);
			expect(nodeConfigs['n8n-nodes-base.telegram']).toContainEqual({
				version: 1,
				parameters: { chatId: '123', text: 'Hello' },
			});
			expect(nodeConfigs['n8n-nodes-base.telegram']).toContainEqual({
				version: 1,
				parameters: { chatId: '456', text: 'World' },
			});

			// Should have gmail config from workflow2 with version info
			expect(nodeConfigs['n8n-nodes-base.gmail']).toHaveLength(1);
			expect(nodeConfigs['n8n-nodes-base.gmail'][0]).toEqual({
				version: 1,
				parameters: { operation: 'getAll' },
			});
		});

		it('should return empty configurations for empty workflow list', () => {
			const results = processWorkflowExamples([]);

			expect(results).toHaveLength(0);
		});

		it('should skip nodes with empty parameters', () => {
			const workflow: WorkflowMetadata = {
				templateId: 2003,
				name: 'Empty Params',
				workflow: {
					name: 'Empty Params',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Empty Node',
							type: 'n8n-nodes-base.noOp',
							position: [0, 0],
							typeVersion: 1,
						},
						{
							parameters: { value: 'test' },
							id: 'node2',
							name: 'Set Node',
							type: 'n8n-nodes-base.set',
							position: [200, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const results = processWorkflowExamples([workflow]);
			const nodeConfigs = results[0].nodeConfigurations;

			// Should not have noOp since it has empty parameters
			expect(nodeConfigs['n8n-nodes-base.noOp']).toBeUndefined();

			// Should have set node config with version info
			expect(nodeConfigs['n8n-nodes-base.set']).toHaveLength(1);
			expect(nodeConfigs['n8n-nodes-base.set'][0]).toEqual({
				version: 1,
				parameters: { value: 'test' },
			});
		});
	});
});
