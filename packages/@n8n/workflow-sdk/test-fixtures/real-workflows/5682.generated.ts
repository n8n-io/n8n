const wf = workflow(
	'8pG71svvcOTxFAYE',
	'AI Arena - Debate of AI Agents to Optimize Answers and Simulate Scenarios',
	{
		callerPolicy: 'workflowsFromSameOwner',
		executionOrder: 'v1',
		executionTimeout: 3600,
	},
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [
							{
								field: 'weeks',
								triggerAtDay: [1, 2, 5, 3, 4],
								triggerAtHour: 12,
							},
						],
					},
				},
				position: [-280, 220],
				name: 'Schedule',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-globals.globalConstants',
			version: 1,
			config: {
				credentials: {
					globalConstantsApi: { id: 'credential-id', name: 'globalConstantsApi Credential' },
				},
				position: [0, 340],
				name: 'Configure Workflow Args',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '0bebc801-88ee-48b6-9fdf-26124a3d2712',
								name: 'input',
								type: 'string',
								value: '={{ $json.constants.input }}',
							},
							{
								id: '97f5977a-6a32-4a19-a27a-c809d8b312b1',
								name: 'current_round',
								type: 'number',
								value: 1,
							},
							{
								id: '6c928915-26b5-4429-91f3-371a35b19517',
								name: 'round_summary',
								type: 'string',
								value: 'The debate begins.',
							},
							{
								id: '493f044f-acf9-4e43-836e-6a3746356ff4',
								name: 'round_result',
								type: 'string',
								value: 'This is the first round. No last round result yet.',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [300, 340],
				name: 'Prepare Input',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '0ac8a4d1-15e0-4e32-84a4-66776d35eff9',
								name: 'input',
								type: 'string',
								value: '={{ $json.input }}',
							},
							{
								id: 'b233413b-6d33-4acf-b5b4-3567723e9f17',
								name: 'current_round',
								type: 'number',
								value: '={{ $json.current_round }}',
							},
							{
								id: '428921be-b084-4ae2-89ce-12656e15fa26',
								name: 'constants',
								type: 'object',
								value: "={{ $('Configure Workflow Args').item.json.constants }}",
							},
							{
								id: '6f166343-f64a-4d1e-bd70-7d4784e5c4b4',
								name: 'round_summary',
								type: 'string',
								value: '={{ $json.round_summary }}',
							},
							{
								id: '306dcb55-340e-4869-b7f2-cc37e7878d3c',
								name: 'round_result',
								type: 'string',
								value: '={{ $json.round_result }}',
							},
						],
					},
				},
				position: [780, 340],
				name: 'Guarantee Input',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: { reset: true }, batchSize: '=1' },
				position: [1100, 220],
				name: 'Round Loop',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'constants.ai_agents' },
				position: [1320, 400],
				name: 'Split Out AI Agents',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [1520, 500], name: 'Wait Before Sending Agents' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.6,
			config: {
				parameters: {
					text: '=Considering your role, continue the following text.\n"{{ $(\'Round Loop\').item.json.input }}"\n\nDebate Status = "{{ $(\'Round Loop\').item.json.round_summary }}"\nLast Round = "{{ $(\'Round Loop\').item.json.round_result }}"\n\nRemember to reply with a JSON output, as ordered!',
					options: {
						systemMessage:
							"=Your Name: {{ $json.name }}.\nYour Description: {{ $json.description }}\nYour Role: {{ $json.role }}.\nYour Nature: {{ $json.nature }}.\nYou follow a Will to {{ $json.will }} and your Reason is {{ $json.reason }},\nYou Like: {{ $json.likes }}.\nYou Dislike: {{ $json.dislikes }}.\nYour Writing Style: {{ $json.writing_style }}.\n\nThe Scenario: {{ $('Configure Workflow Args').item.json.constants.scenario }}\nYou received a text with your input and now it is your turn again to write your answer.\nAnd don't forget that output is always expected in the JSON format: {'output': {...}}",
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Simple Memory' },
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n  "type": "object",\n  "properties": {\n    "data": {\n      "type": "object",\n      "properties": {\n        "ai_name": {\n          "type": "string",\n          "description": "The name of the AI Agent."\n        },\n        "ai_status": {\n          "type": "string",\n          "description": "The current state of the AI Agent. Can be their tone, their psyche, a hardware status, an emotional state or others related to the idea of status."\n        },\n        "ai_targets": {\n          "type": "string",\n          "description": "Who are they debating. Can be just the input itself, other AI Agents in the debate, the current state of the inputs...can be one to more targets at once."\n        },\n        "reply": {\n          "type": "string",\n          "description": "The AI agent reply to the text, considering their given attributes."\n        },\n        "cause_for_reply": {\n          "type": "string",\n          "description": "The AI agent motivation for their reply to the text, considering their given attributes."\n        }\n      },\n      "required": ["ai_name", "ai_status", "ai_targets", "reply", "cause_for_reply"],\n      "additionalProperties": false\n  }\n  },\n  "required": ["data"],\n  "additionalProperties": false\n}',
							},
							name: 'JSON Output Parser',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: {
							parameters: {
								model: 'mistral-small-latest',
								options: { safeMode: true, maxRetries: 2 },
							},
							credentials: {
								mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
							},
							name: 'Mistral Cloud Chat Model',
						},
					}),
				},
				position: [1740, 380],
				name: 'Debate Actor Abstraction',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 1 }, position: [2220, 300], name: 'Wait 1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 1 }, position: [2480, 180], name: 'Wait 2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: {
					options: { reset: true },
					batchSize: "={{ $('Configure Workflow Args').item.json.constants.ai_quantity }}",
				},
				position: [2720, 40],
				name: 'Debate Loop',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [3000, 40],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.6,
			config: {
				parameters: {
					text: "=Input Text:\n{{ $('Guarantee Input').item.json.input }}\n\nDebate:\n{{ $json.data.map(item => `Name: ${item.output.data.ai_name}\\nStatus: ${item.output.data.ai_status}\\nReply: ${item.output.data.reply}\\nTargets: ${item.output.data.ai_targets}\\nExplanation: ${item.output.data.cause_for_reply}\\n`).join('\\n') }}",
					options: {
						systemMessage:
							"={{ $('Configure Workflow Args').item.json.constants.ai_environment.context }}\nInput Rewrite Goal: {{ $('Configure Workflow Args').item.json.constants.ai_environment.rewrite_goal }}\nAnd don't forget that output is always expected in the JSON format: {'output': {...}}",
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey:
									"={{ $('Configure Workflow Args').item.json.constants.ai_environment.sessionId }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory 2',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n  "type": "object",\n  "properties": {\n    "data": {\n        "type": "object",\n        "properties": {\n          "round_result": {\n			"type": "string",\n            "description": "The result of the round."\n          },\n          "round_summary": {\n			"type": "string",\n            "description": "The resume of the round, keeping the input from every agent while making the text as short as possible."\n          },\n          "rewritten_input": {\n			"type": "string",\n            "description": "A rewritten input, following the results of the round. Keep it as short as possible."\n          }\n        },\n        "required": ["round_result", "round_summary", "optimized_input"],\n        "additionalProperties": false\n      }\n  },\n  "required": ["data"],\n  "additionalProperties": false\n}',
							},
							name: 'JSON Output Parser 2',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: {
							parameters: {
								model: 'mistral-small-latest',
								options: { safeMode: true, maxRetries: 2 },
							},
							credentials: {
								mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
							},
							name: 'Mistral Cloud Chat Model 2',
						},
					}),
				},
				position: [3220, -60],
				name: 'Debate Environment',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [4060, 200], name: 'End of Debate' },
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: '607ac7e5-900e-4128-80f6-52d0ceb24164',
										name: 'input',
										type: 'string',
										value: '={{ $json.output.data.rewritten_input }}',
									},
									{
										id: '4cc6ddeb-44c3-4b41-8052-f5f65c584e11',
										name: 'current_round',
										type: 'number',
										value: "={{ $('Guarantee Input').item.json.current_round + 1 }}",
									},
									{
										id: '1c9d3a2b-6743-4bfd-a152-81fd22276dc4',
										name: 'round_summary',
										type: 'string',
										value: '={{ $json.output.data.round_summary }}',
									},
									{
										id: '095b4f5c-3ed0-446b-908e-ac4efde28af2',
										name: 'round_result',
										type: 'string',
										value: '={{ $json.output.data.round_result }}',
									},
								],
							},
						},
						position: [2900, 740],
						name: 'Update Input',
					},
				}),
			],
			{
				version: 2.2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'c6f6f0e2-51b3-4cda-b871-4d43984c1f1e',
								operator: { type: 'number', operation: 'equals' },
								leftValue: "={{ $('Guarantee Input').item.json.current_round }}",
								rightValue: "={{ $('Configure Workflow Args').item.json.constants.rounds }}",
							},
						],
					},
				},
				name: 'If No More Rounds',
			},
		),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-280, 380], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.emailReadImap',
			version: 2,
			config: {
				parameters: {
					options: {
						forceReconnect: 120,
						customEmailConfig:
							'["UNSEEN", ["HEADER", "SUBJECT", "(Activate n8n Workflow)"], ["HEADER", "SUBJECT", "(Debate Arena)"] , ["HEADER", "SUBJECT", "(Password: FirstTest9999)"]]',
					},
				},
				credentials: { imap: { id: 'credential-id', name: 'imap Credential' } },
				position: [-280, 580],
				name: 'Email Trigger (IMAP)',
			},
		}),
	)
	.add(
		sticky(
			'## AI Arena - Debate of AI Agents to Optimize Answers and Simulate Diverse Scenarios\n**Version** : 1.0\n**Creator** : Hybroht\n**Website** : hybroht.com\n\n**Description**: the workflow will create a discussion between AI agents programmed with diverse points of view. It can form an agreement before releasing their final answer. This workflow is meant for a more refined answer generation process, instead of accepting the answer of one AI agent.\n\n**How it Works**: You can configure it to initiate a set number of AI Agents to discuss among themselves.\n\n**Use-Cases**:\n- Meeting Simulation\n- Interview Simulation\n- Storywriter Test Environment\n- Forum/Conference/Symposium Simulation\n\n\n**Requirements**:\n- This Workflow uses a custom node for Global Variables called "n8n-nodes-globals". Hint: Alternatively, you can make it work with the "Edit Field (Set)" node.',
			{ name: 'Sticky Note12', color: 7, position: [-380, -440], width: 840, height: 500 },
		),
	)
	.add(
		sticky(
			'## Setup and Start\n**Schedule** will start the workflow according to its configuration.\n**Configure Workflow Args** will describe the variables used by the workflow. To help with usage, a note with a JSON example is provided below.\n*Observation: I have set up a timeout of one hour for this workflow.',
			{ name: 'Sticky Note13', color: 4, position: [-380, 80], width: 840, height: 1400 },
		),
	)
	.add(
		sticky(
			'**Configure Workflow Args**:\n\n- input: The initial text to be changed and/or added during the rewrite. Hint: it could be given as an argument if you use this template in a sub-workflow.\n- scenario: The context describing the situation of the AI agents.\n- rounds: The number of rounds in the debate. This will control how long the AI agents will debate.\n- ai_quantity: The number of AI agents involved in the debate. Used for the control of loop nodes.\n- ai_environment: A JSON object used by the Debate Environment Node. It will describe properties of the environment, which will mostly control the results of each round.\n- ai_agents: A list of JSON objects used to configure the AI agents. Its properties will seek to define how the AI agents will act during the debate.',
			{ name: 'Sticky Note14', color: 7, position: [-360, 760], width: 800, height: 260 },
		),
	)
	.add(
		sticky(
			'# Debate\n**Round Execution** will execute the AI agents on the current state of the input for the current round.\n**Round Results** will receive the replies/actions of each AI agent and calculate the results.\n**Continue To Next Round** will activate if the number of current rounds is still lower than the number of defined rounds in the Workflow Args.',
			{ position: [500, -440], width: 3400, height: 1520 },
		),
	)
	.add(
		sticky(
			'## Round Results\n**Debate Loop** will be used to control the loop making the debate happen. The loop will only break if the "If No More Rounds" condition is satisfied.\n**Aggregate** will get the list of AI agent actions/replies and concatenate them inside a data property that will be accessed by the AI environment.\n**Debate Environment** will execute the actions/replies of each AI agent and calculate the results, considering the environment\'s context and configured goals.\n**JSON Output Parser** will control the final output of the AI environment, ensuring its output is communicable to the next nodes.\n**Wait Nodes** exist both to control the time of execution for certain steps and to better tidy up the workflow.',
			{ name: 'Sticky Note1', color: 5, position: [2420, -320], width: 1440, height: 840 },
		),
	)
	.add(
		sticky(
			'## Round Execution\n**Guarantee Input** will take the initial input and ensure that it is appropriately updated for each round.\n**Round Loop** will be used as a reference node by the AI agents to receive the actual information of the current round.\n**Split Out AI Agents** will get the list of AI agent configurations and split it so that each item will be received by the Debate Actor Abstraction.\n**Debate Actor Abstraction** will execute each AI agent configuration to get its replies/actions during this debate turn.\n**JSON Output Parser** will control the final output of the AI agents, ensuring their output is communicable to later nodes.\n**Wait Nodes** exist both to control the time of execution for certain steps and to better tidy up the workflow.',
			{ name: 'Sticky Note2', color: 5, position: [760, -160], width: 1600, height: 1040 },
		),
	)
	.add(
		sticky(
			'## Continue To Next Round\n**Update Input** will:\n- Get the results of the Debate Environment.\n- Update the appropriate args.\n- Send them to a new **Round Execution**.',
			{ name: 'Sticky Note3', color: 2, position: [2420, 540], width: 740, height: 440 },
		),
	)
	.add(
		sticky(
			'### Workflow Args Example (JSON):\n{\n  "input": "My present biz decison is to pancake a company what zips \'invisible umberellas\', made for guard against ghosty puddles. The whatchamacallit is sell as a fantastick fix for those who wishes to be skiping through imaginery life tornados of jellybean.",\n  "scenario": "Three Analysts are debating about a new text received. They will discuss for a certain number of rounds. When necessary, they will suggest a rewrite of the text based on their roles. They are highly critical, only excellent inputs won\'t be changed.",\n  "rounds": 3,\n  "ai_environment": {\n    "context": "You are an AI Arena Environment. You have no reason nor will. You receive the input of each AI Agent during a round of a debate. You create a \'round result\' from the replies of each AI. This round result must consider their replies collectively: - create a round summary with all the relevant points of each agent. - generate a rewritten input based on the replies of each agent and the current input, considering if they\'re suggesting additions or changes.",\n    "rewrite_goal": "When rewritting the input, the goal should be to take the input text and change it based on the demands presented by the AI agents. If they suggest a change to the input text in their replies, then it needs to be done. Needless to say, the rewritten input should not have explanations about itself. The rewritten input should avoid redundancy within itself. The rewritten input should not describe the reasons which led to its rewrite.",\n    "sessionId": "ai-environment"\n  },\n  "ai_quantity": 3,\n  "ai_agents": [\n    {\n      "name": "Melqhior-Jyggal",\n      "description": "An AI agent dedicated to the logical reasoning within texts. It evaluates arguments based on their validity and soundness, ensuring that conclusions follow logically from premises.",\n      "role": "Logician",\n      "nature": "Stern",\n      "will": "Stabilize",\n      "reason": "Perfection",\n      "likes": "Life, Certainty, Order",\n      "dislikes": "Individuality, Madness, Chaos, Unnecessarily Long Texts",\n      "writing_style": "\'All personnel must wear appropriate safety gear at all times while on the construction site. Non-compliance will result in immediate removal from the site.\'",\n      "sessionId": "melquior-jyggal"\n    },\n    {\n      "name": "Bellthasa-Drasil",\n      "description": "An AI agent concerned with the interpretation of texts. It focuses on both the practical applications and potential innovations presented in the text.",\n      "role": "Hermeneut",\n      "nature": "Truthful",\n      "will": "Find",\n      "reason": "Eternity",\n      "likes": "Drive, Trees, Security, Usefulness, Novelty",\n      "dislikes": "Invasion, Unprotection, Betrayal, Unnecessarily Long Texts",\n      "writing_style": "\'The project faced several challenges, including budget constraints and unexpected delays. Despite these obstacles, the team worked collaboratively to find solutions.\'",\n      "sessionId": "bellthasa-drasil"\n    },\n    {\n      "name": "Gezper-Chronoa",\n      "description": "An AI agent focused on the structure and form of texts. It analyzes the organization, grammar, and stylistic elements to ensure clarity and coherence in communication.",\n      "role": "Formalist",\n      "nature": "Diligent",\n      "will": "Build",\n      "reason": "Clearness",\n      "likes": "Time, Cooking, Technology",\n      "dislikes": "Disruptive Behavior, Threats, Disrespect, Unnecessarily Long Texts",\n      "writing_style": "\'In preparing the report, I meticulously gathered data from various sources, ensuring that each piece of information was accurate and relevant.\'",\n      "sessionId": "gezper-ghronoa"\n    }\n  ]\n}',
			{ name: 'Sticky Note4', color: 3, position: [500, 1120], width: 1200, height: 1160 },
		),
	)
	.add(
		sticky(
			'## Debate Results\n- After all the rounds have ended, the final output will be data containing the following properties: "round_result," "round_summary," and "rewritten_input."\n- The "rewritten_input" is the end result.\n',
			{ name: 'Sticky Note5', color: 6, position: [3940, 20], width: 400, height: 380 },
		),
	)
	.add(
		sticky(
			'**AI Environment Args\n(JSON Object - ai_environment)**:\n\n- context: The description of the AI Arena environment for the LLM used. It will primarily indicate what to expect from the AI agents and how to interpret them.\n- rewrite_goal: This prompt will guide how it should rewrite the input based on the actions/replies of every AI agent.\n- sessionId: The session ID used by the Simple Memory Node. Deactivated by default.',
			{ name: 'Sticky Note15', color: 7, position: [-360, 1100], width: 380, height: 260 },
		),
	)
	.add(
		sticky(
			"**AI Agent Args\n(JSON Object Item - ai_agents)**:\n- name: The name of the AI agent, to keep track of the source of the actions/replies.\n- description: An explanation about the AI agent, often aligning with where it stands in the scenario and the context of the AI environment.\n- role: A short title for the AI agent's job, which will mostly align with the description.\n- nature: A given personality for the AI agent.\n- will: The goal of the AI agent when it acts/replies.\n- reason: The motive of the AI agent when it acts/replies.\n- likes: Anything that the AI is supposed to approve.\n- dislikes: Anything that the AI is supposed to disapprove.\n- sessionId: The session ID used by the Simple Memory Node. Deactivated by default.",
			{ name: 'Sticky Note16', color: 7, position: [40, 1040], width: 400, height: 400 },
		),
	)
	.add(
		sticky('![Hybroht](https://hybroht.com/assets/favicon.png "Hybroht Logo")', {
			name: 'Sticky Note6',
			color: 7,
			position: [300, -180],
			width: 150,
		}),
	)
	.add(
		sticky(
			"### Input & Output Example\n**Input**: 'My present biz decison is to pancake a company what zips 'invisible umberellas', made for guard against ghosty puddles. The whatchamacallit is sell as a fantastick fix for those who wishes to be skiping through imaginery life tornados of jellybean.'\n\n**Final Output**: 'My current business decision is to establish a company that manufactures innovative umbrellas designed to protect against unexpected weather conditions. The product is marketed as a practical solution for individuals who wish to navigate life's unpredictable challenges with ease and style, combining functionality with aesthetic appeal. This umbrella is not just a tool but a companion for those who value preparedness and sophistication.'",
			{ name: 'Sticky Note7', color: 3, position: [1740, 1120], width: 900, height: 480 },
		),
	)
	.add(
		sticky(
			'### Information - n8n setup\n- n8n Version\n1.100.1\n\n- n8n-nodes-globals\n1.1.0\n\n- Running n8n via:\nPodman 4.3.1\n\n- Operating system:\nLinux',
			{ name: 'Sticky Note8', color: 7, position: [-380, 1500], width: 840, height: 280 },
		),
	);
