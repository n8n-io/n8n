const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.3,
			config: {
				parameters: {
					options: { buttonLabel: 'Select a Workflow' },
					formTitle: '⚡Auto Rename n8n Workflow Nodes with AI✨',
					formDescription:
						"This workflow uses AI to automatically generate clear and descriptive names for every node in your n8n workflows.\nIt analyzes each node's type, parameters, and connections to create meaningful names, making your workflows instantly readable.",
				},
				position: [2176, -1568],
				name: 'Form Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: { filters: {}, requestOptions: {} },
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [2400, -1568],
				name: 'Fetch All Workflows',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					include: 'specifiedFields',
					options: {},
					aggregate: 'aggregateAllItemData',
					fieldsToInclude: 'id,name',
					destinationFieldName: 'workflows',
				},
				position: [2624, -1568],
				name: 'Aggregate Workflow List',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					defineForm: 'json',
					jsonOutput:
						'={{\n  [\n    {\n      "fieldLabel": "Select a Workflow:",\n      "fieldType": "dropdown",\n      "fieldOptions": {\n        "values": $json.workflows.map(option => ({ option: `${option.name} (#${option.id})` })),\n      },\n      "requiredField": true\n    }\n  ]\n}}',
					limitWaitTime: true,
				},
				position: [2848, -1568],
				name: 'Form Dynamic Workflow List',
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
								id: '2e17c48e-c158-42b7-a8ff-6fce97ff1003',
								name: 'id',
								type: 'string',
								value: '={{ $json["Select a Workflow:"].match(/\\(#([^)]+)\\)/)[1] }}',
							},
						],
					},
				},
				position: [3072, -1568],
				name: 'Parse Selected Workflow Id',
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
								id: 'c6058f80-386c-4f10-aa27-a71c43124a64',
								name: 'workflow_id',
								type: 'string',
								value: '={{ $json.id }}',
							},
						],
					},
				},
				position: [3296, -1568],
				name: 'Set Target Workflow Id',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: {
					operation: 'get',
					workflowId: { __rl: true, mode: 'id', value: '={{ $json.workflow_id }}' },
					requestOptions: {},
				},
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [3520, -1568],
				name: 'Fetch Target Workflow JSON',
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
								id: '77460441-6e86-4940-ac7c-76dd99cb0de4',
								name: 'old_workflow',
								type: 'object',
								value: "={{\n  $json\n    .removeField('pinData')\n    .removeField('shared')\n}}",
							},
							{
								id: '88723b17-bb0e-437d-8ed3-8d412c4491b1',
								name: 'nodes',
								type: 'array',
								value: '={{ $json.nodes }}',
							},
							{
								id: '7464b93e-e357-4ed3-a933-6aab1f1d606a',
								name: 'connections',
								type: 'object',
								value: '={{ $json.connections }}',
							},
						],
					},
				},
				position: [3744, -1568],
				name: 'Extract Workflow Nodes Connections',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: "=<system>\nYou are renaming nodes in an n8n workflow to make their purpose immediately clear.\n</system>\n\n<instructions>\n1. Extract ALL node names from the workflow's `nodes` array\n2. For each node, create a descriptive name based on:\n   - Its `type` (what kind of node it is)\n   - Its `parameters` (what it's configured to do)\n   - Its connections/position in the workflow flow (input from where, output to where)\n3. Return a mapping for EVERY SINGLE NODE\n\nRules:\n- Maximum 5 words per name\n- Use Title Case\n- Each name must be unique\n- Keep technical accuracy while being human-readable\n- If a name is already good, you can keep it (but still include it in output)\n</instructions>\n\n<critical>\nYour output array MUST have exactly the same number of items as the input workflow has nodes.\n\nBefore responding:\n- Count nodes in input: ___\n- Count items in your output: ___\n- If these don't match, you've made an error\n\nThe `old_name` must match the exact node name character-for-character (including spaces, capitals, etc.)\n</critical>\n\n<workflow>\n```json\n{{ JSON.stringify($json.old_workflow) }}\n```\n</workflow>",
					batching: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [2160, -1216],
				name: 'Generate Node Rename Mapping',
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
								id: 'ba5c59f1-4de6-460d-9685-037d791962cc',
								name: 'old_workflow',
								type: 'object',
								value: '={{ $("Extract Workflow Nodes Connections").item.json.old_workflow }}',
							},
							{
								id: '7a6c8968-70db-4c1b-8592-1a98cfcef4fc',
								name: 'nodes_name',
								type: 'array',
								value:
									"={{ $('Extract Workflow Nodes Connections').item.json.nodes.map(node => node.name) }}",
							},
							{
								id: '9ee4702e-533f-4999-b9ea-fb6bdaf4e1f7',
								name: 'connections_nodes_name_reference',
								type: 'array',
								value:
									"={{\n  (() => {\n    const names = [];\n    \n    // Get source nodes (keys)\n    names.push(...Object.keys($('Extract Workflow Nodes Connections').item.json.connections));\n    \n    // Get target nodes\n    for (const conn of Object.values($('Extract Workflow Nodes Connections').item.json.connections)) {\n      for (const type of Object.values(conn)) {          // main, error, etc.\n        for (const outputArray of type) {                // [[...]]\n          for (const target of outputArray) {            // [{node: \"...\"}]\n            if (target.node) names.push(target.node);\n          }\n        }\n      }\n    }\n    \n    return names;\n  })()\n}}",
							},
							{
								id: 'caf69cb1-6d78-4aec-8180-d3bad85529bf',
								name: 'parameters_names',
								type: 'array',
								value:
									"={{\n  (() => {\n    const allNodeNames = $('Extract Workflow Nodes Connections').item.json.nodes.map(node => node.name);\n    const nodesString = JSON.stringify($('Extract Workflow Nodes Connections').item.json.nodes);\n    const foundPatterns = [];\n    \n    allNodeNames.forEach(nodeName => {\n      const patterns = [\n        `$('${nodeName}')`,\n        `$(\"${nodeName}\")`\n      ];\n      \n      patterns.forEach(pattern => {\n        if (nodesString.includes(pattern)) {\n          foundPatterns.push(pattern);\n        }\n      });\n    });\n    \n    return foundPatterns;\n  })()\n}}",
							},
							{
								id: 'b2ab8b7a-ffd0-413e-9a68-27d5466fe181',
								name: 'AI_output',
								type: 'array',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [2464, -1216],
				name: 'Prepare LLM Validation Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
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
								id: '79e8a51f-63f7-4624-bf8b-6c529f0363db',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ [...$json.nodes_name].sort().toJsonString() }}',
								rightValue:
									'={{ [...$json.AI_output.map(item => item.old_name)].sort().toJsonString() }}',
							},
						],
					},
				},
				position: [2688, -1216],
				name: 'Validate All Nodes Renamed',
			},
		}),
	)
	.output(0)
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
								id: 'de87c369-7ca7-4242-8278-effec174c191',
								name: 'new_nodes',
								type: 'array',
								value:
									"={{ $json.old_workflow.nodes.map(node => {\n  // Find mapping for the node name\n  const mapping = $json.AI_output.find(item => item.old_name === node.name);\n  \n  // Update parameters by replacing all node name references\n  let updatedParameters = JSON.stringify(node.parameters);\n  $json.AI_output.forEach(aiMapping => {\n    const pattern = new RegExp(aiMapping.old_name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g');\n    updatedParameters = updatedParameters.replace(pattern, aiMapping.new_name);\n  });\n  \n  return {\n    ...node,\n    name: mapping ? mapping.new_name : node.name,\n    parameters: JSON.parse(updatedParameters)\n  };\n}) }}",
							},
							{
								id: '90f8a9c1-e9a1-46ae-8af9-2130993a51f3',
								name: 'new_connections',
								type: 'object',
								value:
									'={{\n  (() => {\n    const newConnections = {};\n    \n    for (const [sourceNode, connections] of Object.entries($json.old_workflow.connections)) {\n      // Find mapping for the source node (key)\n      const sourceMapping = $json.AI_output.find(item => item.old_name === sourceNode);\n      const newSourceNode = sourceMapping ? sourceMapping.new_name : sourceNode;\n      \n      // Deep copy and update target nodes\n      const updatedConnections = {};\n      for (const [connectionType, connectionArrays] of Object.entries(connections)) {\n        updatedConnections[connectionType] = connectionArrays.map(connArray => \n          connArray.map(conn => {\n            const targetMapping = $json.AI_output.find(item => item.old_name === conn.node);\n            return {\n              ...conn,\n              node: targetMapping ? targetMapping.new_name : conn.node\n            };\n          })\n        );\n      }\n      \n      newConnections[newSourceNode] = updatedConnections;\n    }\n    \n    return newConnections;\n  })()\n}}',
							},
							{
								id: '3bf1958f-17e9-4719-824c-2282f807e4a6',
								name: 'new_workflow_without',
								type: 'object',
								value:
									"={{\n  $json.old_workflow\n    .removeField('nodes')\n    .removeField('connections')\n}}",
							},
						],
					},
				},
				position: [2896, -1232],
				name: 'Apply Renamed Nodes Connections',
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
								id: 'bb6e8c56-60dd-42ad-9e13-695478a6891a',
								name: 'new_workflow',
								type: 'object',
								value:
									'={{\n  Object.assign($json.new_workflow_without, {\n    nodes: $json.new_nodes,\n    connections: $json.new_connections,\n  })\n}}',
							},
						],
					},
				},
				position: [3120, -1232],
				name: 'Assemble New Workflow Object',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: {
					operation: 'update',
					workflowId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Target Workflow Id').item.json.workflow_id }}",
					},
					requestOptions: {},
					workflowObject: '={{ $json.new_workflow.toJsonString() }}',
				},
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [3344, -1232],
				name: 'Save Renamed Workflow Version',
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
								id: 'b9ddd66c-a4b6-4738-8cd1-4f1bb398e955',
								name: 'Link_to_new_version',
								type: 'string',
								value:
									'={{ $execution.resumeUrl.split(\'/\').slice(0, 3).join(\'/\') + "/workflow" + "/" + $(\'Set Target Workflow Id\').item.json.workflow_id + "/history/" + $json.versionId }}',
							},
							{
								id: '969e8ea8-7dbd-4ddc-9ddf-d0c44284463f',
								name: 'Link_to_previous_version',
								type: 'string',
								value:
									"={{ $execution.resumeUrl.split('/').slice(0, 3).join('/') + \"/workflow\" + \"/\" + $('Set Target Workflow Id').item.json.workflow_id + \"/history/\" + $('Assemble New Workflow Object').item.json.new_workflow.versionId }}",
							},
						],
					},
				},
				position: [3552, -1232],
				name: 'Build Workflow Version Links',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
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
								id: '3ad65d54-64d5-4f62-a435-09b931e8d066',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: "={{ $('Form Trigger').isExecuted }}",
								rightValue: '',
							},
						],
					},
				},
				position: [3744, -1232],
				name: 'Check Trigger Source Type',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					operation: 'completion',
					completionTitle: 'Terminate Workflow Execution!',
					completionMessage:
						"=<a href='{{ $json.Link_to_new_version }}'>Go to new version</a>\n<br>\n<a href='{{ $json.Link_to_previous_version }}'>Go to previous version</a>",
				},
				position: [3968, -1328],
				name: 'Display Workflow Version Links',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: { options: {}, includeOtherFields: true },
				position: [3968, -1104],
				name: 'Done',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.stopAndError',
			version: 1,
			config: {
				parameters: { errorMessage: 'Validation Error' },
				position: [2896, -1040],
				name: 'Stop',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [2176, -1888], name: 'Manual Trigger' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: {
					operation: 'get',
					workflowId: {
						__rl: true,
						mode: 'list',
						value: 'MImEVkDXF7TQkggJ',
						cachedResultName: 'Auto Rename n8n Workflow Nodes with AI (#MImEVkDXF7TQkggJ)',
					},
					requestOptions: {},
				},
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [3040, -1888],
				name: 'Select a Workflow',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					schemaType: 'manual',
					inputSchema:
						'{\n  "type": "array",\n  "items": {\n    "type": "object",\n    "properties": {\n      "old_name": {\n        "type": "string",\n        "description": "The exact match original node name"\n      },\n      "new_name": {\n        "type": "string",\n        "description": "The new node name"\n      }\n    },\n    "required": [\n      "old_name",\n      "new_name"\n    ]\n  }\n}',
				},
				position: [2320, -1040],
				name: 'Parse LLM Mapping ToJson',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			version: 1,
			config: {
				parameters: { model: 'openai/gpt-5.1-codex-mini', options: {} },
				credentials: {
					openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
				},
				position: [2144, -1040],
				name: 'OpenRouter Chat Model',
			},
		}),
	)
	.add(
		sticky(
			'## Get & Prepare Workflow\nGet target workflow JSON, extract nodes and connections, prepare clean structure for processing.',
			{ name: 'LLM Flow Sticky Note', color: 7, position: [3216, -1696], width: 944, height: 304 },
		),
	)
	.add(
		sticky(
			'## AI Rename Generation\nSend workflow to the AI, generate rename mapping for every node, parse structured JSON output.',
			{
				name: 'Post Processing Sticky Note',
				color: 7,
				position: [2112, -1376],
				width: 528,
				height: 480,
			},
		),
	)
	.add(
		sticky(
			'## Form Trigger\nLaunch a form where you can select from a dropdown of all available workflows.',
			{
				name: 'Triggers Section Sticky Note1',
				color: 7,
				position: [2112, -1696],
				width: 1088,
				height: 304,
			},
		),
	)
	.add(
		sticky(
			'## Validate & Apply Renames\nVerify all nodes are covered, update node names in nodes array, connections object, and parameter references.',
			{
				name: 'Post Processing Sticky Note1',
				color: 7,
				position: [2656, -1376],
				width: 624,
				height: 480,
			},
		),
	)
	.add(
		sticky(
			'## Save & Display Results\nPublish updated workflow version, generate history links, show completion form or end execution.',
			{
				name: 'Post Processing Sticky Note2',
				color: 7,
				position: [3296, -1376],
				width: 864,
				height: 480,
			},
		),
	)
	.add(
		sticky(
			'## Mohamed Anan\n![Anan](https://1.gravatar.com/avatar/2c212891367a29a481ce306de2a3c936abab9dd120e11aae24782b47f5d856bd?size=64)\nA curious EnGiNeEr who enjoys `SoLviNg` PrObLeMs..\n___\n- [x] [Top Supporter](https://community.n8n.io/u/mohamed3nan/badges) in the [n8n community](https://community.n8n.io/u/mohamed3nan/summary) with **200+ hours** of contribution and **+200 solutions** provided, ranked **12th** on the [all-time leaderboard](https://community.n8n.io/leaderboard/1#:~:text=12-,mohamed3nan,-4%2C078).\n\n___\n⚡[n8n Workflows](https://n8n.io/creators/mohamed3nan/)\n💼[LinkedIn](https://link.anan.dev/Linkedin)',
			{
				name: 'Triggers Section Sticky Note2',
				color: 4,
				position: [3504, -2000],
				width: 656,
				height: 288,
			},
		),
	)
	.add(
		sticky(
			'## Manual Trigger\nSelect workflow directly from the n8n node, then execute manually for quick testing.',
			{
				name: 'Triggers Section Sticky Note',
				color: 7,
				position: [2112, -2000],
				width: 1376,
				height: 288,
			},
		),
	)
	.add(
		sticky('### Select a workflow', { color: 3, position: [2992, -1936], width: 192, height: 208 }),
	)
	.add(
		sticky(
			'### Stop workflow\nYou can modify the error handling to retry or loop back to the AI node.',
			{ name: 'Sticky Note1', color: 3, position: [3008, -1040], width: 192, height: 112 },
		),
	)
	.add(
		sticky(
			"## ⚡Auto Rename n8n Workflow Nodes with AI✨\nThis workflow uses AI to automatically generate clear and descriptive names for every node in your n8n workflows.\nIt analyzes each node's type, parameters, and connections to create meaningful names, making your workflows instantly readable.\n\n### Who is it for?\nThis workflow is for n8n users who manage complex workflows with dozens of nodes. If you've ever:\n- Built workflows full of generic names like `HTTP Request 2` or `Edit Fields 1`\n- Struggled to understand your own work after a few weeks\n- Copied workflows from others with unclear node names\n- Spent hours manually renaming nodes one by one\n\n...then this workflow will save you significant time and effort.\n\n### Requirements\n- **n8n API Credentials**: Must be configured to allow listing and updating workflows\n- **AI Provider Credentials**: An API key for your preferred AI provider (OpenRouter is used currently)\n\n### How it works\n1. **Trigger**: Launch via form (select from dropdown) or manual trigger (quick testing with pre-selected workflow)\n2. **Fetch**: Retrieve the target workflow's JSON and extract nodes and connections\n3. **Generate**: Send the workflow JSON to the AI, which creates a unique, descriptive name for every node\n4. **Validate**: Verify the AI mapping covers all original node names\n5. **Apply**: If valid, update all node names, parameter references, and connections throughout the workflow\n6. **Save**: Save/Update the workflow with renamed nodes and provide links to both new and previous versions\n\n\nIf validation fails (e.g., AI missed nodes), the workflow stops with an error. You can modify the error handling to retry or loop back to the AI node.\n\n###  Setup\n1. **Connect n8n API credentials**\n   - Open any n8n node in the workflow and make sure your n8n API credentials is connected\n\n2. **Configure AI provider credentials**\n   - Open the \"OpenRouter\" node (or replace with your preferred AI)\n   - Add your API credentials\n   - Adjust the model if needed (current: `openai/gpt-5.1-codex-mini`)\n\n3. **Test the workflow**\n   - Use Manual Trigger for quick testing with a pre-selected workflow\n   - Use Form Trigger for a user-friendly interface with workflow selection\n\n###  Important notice\n**If you're renaming a currently opened workflow**, you must **reload the page** after execution to see the latest version, n8n doesn't automatically refresh the canvas when workflow versions are updated via API.",
			{ name: 'Post Processing Sticky Note4', position: [1264, -2000], width: 832, height: 1104 },
		),
	);
