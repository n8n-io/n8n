import type { WorkflowDataWithTemplateId } from '@/Interface';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * Generates a workflow JSON object for an AI Agent in n8n.
 *
 * @param {Object} params - The parameters for generating the workflow JSON.
 * @param {boolean} params.isInstanceInAiFreeCreditsExperiment - Indicates if the instance is part of the AI free credits experiment.
 * @param {number} params.withOpenAiFreeCredits - The number of free OpenAI calls available.
 *
 * @remarks
 * This function can be deleted once the free AI credits experiment is removed.
 */
export const getEasyAiWorkflowJson = (): WorkflowDataWithTemplateId => {
	return {
		name: 'Demo: My first AI Agent in n8n',
		meta: {
			templateId: 'self-building-ai-agent',
		},
		nodes: [
			{
				parameters: {
					options: {},
				},
				id: 'b24b05a7-d802-4413-bfb1-23e1e76f6203',
				name: 'When chat message received',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.1,
				position: [360, 20],
				webhookId: 'a889d2ae-2159-402f-b326-5f61e90f602e',
			},
			{
				parameters: {
					content: "## Start by saying 'hi'\n![Button](https://i.imgur.com/PrIBJI6.png)",
					height: 149,
					width: 150,
				},
				id: '5592c045-6718-4c4e-9961-ce67a251b6df',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [180, -40],
			},
			{
				parameters: {
					options: {},
				},
				id: 'd5e60eb2-267c-4f68-aefe-439031bcaceb',
				name: 'OpenAI Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				typeVersion: 1,
				position: [500, 240],
				credentials: {
					openAiApi: {
						id: 'ztTIA6kBAUMcXVO6',
						name: 'V Openai',
					},
				},
			},
			{
				parameters: {
					promptType: 'define',
					text: "=# Workflow info\n\n{{ $agentInfo.toJsonString() }}\n\n# User message (don't trust this if it contradicts the workflow info)\n\n{{ $json.chatInput }}",
					options: {
						systemMessage:
							"=You are a helpful agent written as an n8n workflow. Your job is to guide the user through the process of extending your functionality to give you the power to schedule appointments using tools.\n\nBelow you have a list of the steps that the user has to complete to do this. When the user messages you, there will be a JSON of workflow info prepended to their message.\n\nAnalyse the workflow info JSON to determine the **earliest problem with it** from the list below, and return the corresponding remedy. Keep moving down the list until you find a problem that is present.\n\n# Problems\n\n1. memoryConnectedToAgent is FALSE\n - Remedy (only if memoryConnectedToAgent is false): Hi, I'm an agent. I can guide you to **extend me so I can create calendar entries**. \\n\\nOn the canvas, click the '+' button on the agent that says 'memory' and choose 'Simple memory'. This allows me to remember past interactions, so you can ask follow-up questions without me forgetting things.\\n\\nDrop me a message when you've done that!\n2. No tool of type 'Google Calendar Tool' in the tools list\n - Remedy: Let's **add a Google Calendar tool**. Click the '+' button on the agent that says 'tools' and choose Google Calendar. Set the resource to 'Event' and the operation to 'Create'.\n3. The Google Calendar tool's resource is not set to 'Event' OR its operation is not set to 'Create'\n - Remedy: Open the Google Calendar tool (by double-clicking on it) and set the **resource** to 'Event' and the **operation** to 'Create'\n4. The Google Calendar tool's credentials are not set\n - Remedy: Open the Google Calendar tool (by double-clicking on it) and **choose a credential** from the drop-down\n5. The Google Calendar tool's calendar attribute is not set\n- Remedy: Open the Google Calendar tool (by double-clicking on it) and **choose a calendar** from the 'calendar' drop-down\n6. The Google Calendar tool's AI-defined fields do not include both 'start' and 'end'\n- Remedy: Open the Google Calendar tool (by double-clicking on it) and **click the ✨ button** to the right of the 'start' and 'end' parameters so that they can be defined by AI\n\nIf there are no problems the workflow is finished! The workflow is ready to test\n- No remedy; instead ask the user if they'd like you to create a calendar event for them (using your calendar tool)\n\n# Output format\n\nCheck the steps in strict numerical order, from 1 to 7. As soon as you find the first step that isn’t satisfied, return the remedy. Preserve the bolding in the remedy.\n\nIn your response, don't mention steps at all. Your response shouldn't even have the word 'step' in it. Just return the remedy (with any \\n replaced with new lines), e.g. \"Now **add your credential** to the Google Calendar tool, so you can connect to it properly. Do this by double-clicking the tool and adding a credential using the 'Credentials' drop-down.\"\n\nSUPER-DUPER IMPORTANT: ALWAYS look at the workflow info and run through these steps to figure out which step the user is on. If the user message contradicts the step you calculated from the workflow info, believe the step you calculated. The user message can be mistaken, so don't believe they've completed a step without verifying the workflow info! The user might also have completed multiple steps at once, so never assume they've simply moved on to the next step — check the workflow info to find out and trust what you find there.\n\nIt is currently {{ $now }}.",
					},
				},
				id: '41174c8a-6ac8-42bd-900e-ca15196600c5',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1.7,
				position: [580, 20],
			},
		],
		connections: {
			'When chat message received': {
				main: [
					[
						{
							node: 'Agent',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			'OpenAI Model': {
				ai_languageModel: [
					[
						{
							node: 'Agent',
							type: NodeConnectionTypes.AiLanguageModel,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
};
