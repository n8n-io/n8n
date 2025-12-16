import type { WorkflowMetadata } from '@/types';

import {
	mermaidStringify,
	processWorkflowExamples,
	stickyNotesStringify,
} from '../markdown-workflow.utils';
import { aiAssistantWorkflow } from './workflows/ai-assistant.workflow';

describe('markdown-workflow.utils', () => {
	describe('mermaidStringify', () => {
		it('should convert a workflow with AI agent and tools to mermaid diagram', () => {
			const result = mermaidStringify(aiAssistantWorkflow);

			const expected = `\`\`\`mermaid
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
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should convert a workflow with AI agent and tools to mermaid diagram without node parameters', () => {
			const result = mermaidStringify(aiAssistantWorkflow, { includeNodeParameters: false });

			const expected = `\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.googleCalendarTool
    n1["Google Calendar"]
    %% @n8n/n8n-nodes-langchain.memoryBufferWindow
    n2["Window Buffer Memory"]
    %% n8n-nodes-base.gmailTool
    n3["Get Email"]
    %% n8n-nodes-base.telegramTrigger
    n4["Listen for incoming events"]
    %% n8n-nodes-base.telegram
    n5["Telegram"]
    %% n8n-nodes-base.if
    n6["If"]
    %% n8n-nodes-base.set
    n7["Voice or Text"]
    %% n8n-nodes-base.telegram
    n8["Get Voice File"]
    %% @n8n/n8n-nodes-langchain.lmChatOpenRouter
    n9["OpenRouter"]
    %% n8n-nodes-base.googleTasksTool
    n10["Create a task in Google Tasks"]
    %% n8n-nodes-base.googleTasksTool
    n11["Get many tasks in Google Tasks"]
    %% @n8n/n8n-nodes-langchain.openAi
    n12["Transcribe a recording"]
    %% n8n-nodes-base.gmailTool
    n13["Send Email"]
    %% @n8n/n8n-nodes-langchain.agent
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
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should handle workflow with single node', () => {
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

			const result = mermaidStringify(workflow);

			const expected = `\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.noOp
    n1["Empty Node"]
\`\`\``;

			expect(result).toEqual(expected);
		});

		it('should exclude sticky notes from mermaid diagram', () => {
			const workflow: WorkflowMetadata = {
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
							parameters: { content: 'This is a note' },
							id: 'sticky1',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							position: [100, 100],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = mermaidStringify(workflow);

			const expected = `\`\`\`mermaid
flowchart TD
    %% n8n-nodes-base.manualTrigger
    n1["Start"]
\`\`\``;

			expect(result).toEqual(expected);
		});
	});

	describe('stickyNotesStringify', () => {
		it('should convert workflow sticky notes to bullet list', () => {
			const result = stickyNotesStringify(aiAssistantWorkflow);

			// Each sticky note should start with "- "
			const lines = result.split('\n');
			const bulletLines = lines.filter((line: string) => line.startsWith('- '));
			expect(bulletLines.length).toBeGreaterThan(0);

			// Should contain key content from sticky notes
			expect(result).toContain('Process Telegram Request');
			expect(result).toContain('OpenRouter');
			expect(result).toContain('Try It Out');
			expect(result).toContain('Video Tutorial');
			expect(result).toContain('youtube');
		});

		it('should return empty string for workflow without sticky notes', () => {
			const workflow: WorkflowMetadata = {
				name: 'No Sticky Notes',
				workflow: {
					name: 'No Sticky Notes',
					nodes: [
						{
							parameters: {},
							id: 'node1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							position: [0, 0],
							typeVersion: 1,
						},
					],
					connections: {},
				},
			};

			const result = stickyNotesStringify(workflow);

			expect(result).toEqual('');
		});
	});

	describe('processWorkflowExamples', () => {
		it('should generate mermaid diagrams and collect node configurations in one pass', () => {
			const workflow1: WorkflowMetadata = {
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
