import type { WorkflowMetadata } from '@/types';

import { markdownStringify } from '../markdown-workflow.utils';
import { aiAssistantWorkflow } from './workflows/ai-assistant.workflow';

describe('markdown-workflow.utils', () => {
	describe('markdownStringify', () => {
		it('should convert a workflow with AI agent, tools, and sticky notes to markdown', () => {
			const result = markdownStringify(aiAssistantWorkflow);

			const expected = `# Personal Life Manager with Telegram, Google Services & Voice-Enabled AI

This project teaches you to create a personal AI assistant named Jackie that operates through Telegram. Jackie can summarize unread emails, check calendar events, manage Google Tasks, and handle both voice and text interactions. The assistant provides a comprehensive digital life management solution accessible via Telegram messaging.

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.googleCalendarTool | {"operation":"getAll","calendar":{"__rl":true,"mode":"id","value":"=<insert email here>"},"options":{"timeMin":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', \`\`, 'string') }}","timeMax":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', \`\`, 'string') }}","fields":"=items(summary, start(dateTime))"}}
    n1["Google Calendar"]
    %% @n8n/n8n-nodes-langchain.memoryBufferWindow | {"sessionIdType":"customKey","sessionKey":"={{ $('Listen for incoming events').first().json.message.from.id }}"}
    n2["Window Buffer Memory"]
    %% n8n-nodes-base.gmailTool | {"operation":"getAll","limit":20,"filters":{"labelIds":["INBOX"],"readStatus":"unread","receivedAfter":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_After', \`\`, 'string') }}","receivedBefore":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_Before', \`\`, 'string') }}"}}
    n3["Get Email"]
    %% n8n-nodes-base.telegramTrigger | {"updates":["message"],"additionalFields":{}}
    n4["Listen for incoming events"]
    %% n8n-nodes-base.telegram | {"chatId":"={{ $('Listen for incoming events').first().json.message.from.id }}","text":"={{ $json.output }}","additionalFields":{"appendAttribution":false,"parse_mode":"Markdown"}}
    n5["Telegram"]
    %% n8n-nodes-base.if | {"conditions":{"options":{"version":2,"leftValue":"","caseSensitive":true,"typeValidation":"strict"},"combinator":"and","conditions":[{"id":"a0bf9719-4272-46f6-ab3b-eda6f7b44fd8","operator":{"type":"string","operation":"empty","singleValue":true},"leftValue":"={{ $json.message.text }}","rightValue":""}]},"options":{}}
    n6["If"]
    %% n8n-nodes-base.set | {"fields":{"values":[{"name":"text","stringValue":"={{ $json?.message?.text || \\"\\" }}"}]},"options":{}}
    n7["Voice or Text"]
    %% n8n-nodes-base.telegram | {"resource":"file","fileId":"={{ $('Listen for incoming events').item.json.message.voice.file_id }}","additionalFields":{}}
    n8["Get Voice File"]
    %% @n8n/n8n-nodes-langchain.lmChatOpenRouter | {"options":{}}
    n9["OpenRouter"]
    %% n8n-nodes-base.googleTasksTool | {"task":"MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow","title":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', \`\`, 'string') }}","additionalFields":{}}
    n10["Create a task in Google Tasks"]
    %% n8n-nodes-base.googleTasksTool | {"operation":"getAll","task":"MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow","additionalFields":{}}
    n11["Get many tasks in Google Tasks"]
    %% @n8n/n8n-nodes-langchain.openAi | {"resource":"audio","operation":"transcribe","options":{}}
    n12["Transcribe a recording"]
    %% n8n-nodes-base.gmailTool | {"sendTo":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', \`\`, 'string') }}","subject":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', \`\`, 'string') }}","message":"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', \`Please format this nicely in html\`, 'string') }}","options":{"appendAttribution":false}}
    n13["Send Email"]
    %% @n8n/n8n-nodes-langchain.agent | {"promptType":"define","text":"={{ $json.text }}","options":{"systemMessage":"=You are a helpful personal assistant called Jackie. \\n\\nToday's date is {{ $today.format('yyyy-MM-dd') }}.\\n\\nGuidelines:\\n- When summarizing emails, include Sender, Message date, subject, and brief summary of email.\\n- if the user did not specify a date in the request assume they are asking for today\\n- When answering questions about calendar events, filter out events that don't apply to the question.  For example, the question is about events for today, only reply with events for today. Don't mention future events if it's more than 1 week away\\n- When creating calendar entry, the attendee email is optional"}}
    n14["Jackie, AI Assistant 👩🏻‍🏫"]
    n1 -.ai_tool.-> n14
    n2 -.ai_memory.-> n14
    n3 -.ai_tool.-> n14
    n4 --> n7
    n7 --> n6
    n6 --> n8
    n6 --> n14
    n8 --> n12
    n12 --> n14
    n14 --> n5
    n9 -.ai_languageModel.-> n14
    n10 -.ai_tool.-> n14
    n11 -.ai_tool.-> n14
    n13 -.ai_tool.-> n14
\`\`\`

## Sticky Notes

- ## Process Telegram Request
- 1. [In OpenRouter](https://openrouter.ai/settings/keys) click **“Create API key”** and copy it.

  2. Open the \`\`\`OpenRouter\`\`\` node:
     * **Select Credential → Create New**
     * Paste into **API Key** and **Save**
- This node helps your agent remember the last few messages to stay on topic.
- This node allows your agent create and get tasks from Google Tasks
- This node allows your agent access your gmail
- This node allows your agent access your Google calendar
- Uses OpenAI to convert voice to text.
  [In OpenAI](https://platform.openai.com/api-keys) click **“Create new secret key”** and copy it.
- Caylee, your peronal AI Assistant:
  1. Get email
  2. Check calendar
  3. Get and create to-do tasks

  Edit the **System Message** to adjust your agent’s thinking, behavior, and replies.
- # Try It Out!

  Launch Jackie—your personal AI assistant that handles voice & text via Telegram to manage your digital life.

  **To get started:**

  1. **Connect all credentials** (Telegram, OpenAI, Gmail, etc.)
  2. **Activate the workflow** and message your Telegram bot:
     • "What emails do I have today?"
     • "Show me my calendar for tomorrow"
     • "Craete new to-do item"
     • 🎤 Send voice messages for hands-free interaction

  ## Questions or Need Help?

  For setup assistance, customization, or workflow support, join my Skool community!

  ### [AI Automation Engineering Community](https://www.skool.com/ai-automation-engineering-3014)

  Happy learning! -- Derek Cheung
- Send message back to Telegram
- ## [Video Tutorial](https://youtu.be/ROgf5dVqYPQ)
  @[youtube](ROgf5dVqYPQ)`;

			expect(result).toEqual(expected);
		});

		it('should handle workflow without description', () => {
			const workflow: WorkflowMetadata = {
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

			const result = markdownStringify(workflow);

			const expected = `# Simple Workflow

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.telegramTrigger | {"updates":["message"]}
    n1["Trigger"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle workflow without sticky notes', () => {
			const workflow: WorkflowMetadata = {
				name: 'No Sticky Notes',
				workflow: {
					name: 'No Sticky Notes',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.start',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = markdownStringify(workflow);

			const expected = `# No Sticky Notes

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.start
    n1["Start"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle workflow with branching connections', () => {
			const workflow: WorkflowMetadata = {
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

			const result = markdownStringify(workflow);

			const expected = `# Branching Workflow

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.if
    n1["If"]
    %% n8n-nodes-base.set
    n2["True Branch"]
    %% n8n-nodes-base.set
    n3["False Branch"]
    %% n8n-nodes-base.emailSend
    n4["Send Success Email"]
    %% n8n-nodes-base.emailSend
    n5["Send Failure Email"]
    n1 --> n2
    n1 --> n3
    n2 --> n4
    n3 --> n5
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle nodes without parameters', () => {
			const workflow: WorkflowMetadata = {
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

			const result = markdownStringify(workflow);

			const expected = `# Empty Params

## Workflow Diagram

\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.noOp
    n1["Empty Node"]
\`\`\``;

			expect(result).toEqual(expected);
		});
	});
});
