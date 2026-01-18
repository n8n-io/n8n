const wf = workflow('CDVBZRDH5gNUzIml', 'N8N for Beginners: Looping over Items', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-400, -540], name: 'Paste JSON into this node' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					options: { destinationFieldName: 'url' },
					fieldToSplitOut: 'urls',
				},
				position: [-20, 380],
				name: 'Split Array of Strings into Array of Objects',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [320, 60], name: 'Loop over Items 2' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [880, 40], name: 'Result2' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { amount: 1 },
				position: [480, 180],
				name: 'Wait one second(just for show)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode: '\n  $json.param1 =   "add_me_to_all_items_and_name_me_param1"\n\n\nreturn $json',
				},
				position: [680, 220],
				name: 'Add param1 to output2',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode: '\n  $json.param1 =   "add_me_to_all_items_and_name_me_param1"\n\n\nreturn $json',
				},
				position: [320, 780],
				name: 'Add param1 to output4',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [900, 780], name: 'Result4' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode: '\n  $json.param1 =   "add_me_to_all_items_and_name_me_param1"\n\n\nreturn $json',
				},
				position: [320, 500],
				name: 'Add param1 to output3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [900, 500], name: 'Result3' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode: "\n  $json.param1 =  'add_me_to_all_items_and_name_me_param1';\n\n\nreturn $json",
				},
				position: [320, -540],
				name: 'Add param1 to output5',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [880, -540], name: 'Result5' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: { reset: false } },
				position: [320, -260],
				name: 'Loop over Items 1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [880, -280], name: 'Result1' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode: '\n  $json.param1 = "add_me_to_all_items_and_name_me_param1"\n\nreturn $json',
				},
				position: [500, -180],
				name: 'Add param1 to output1',
			},
		}),
	)
	.add(
		sticky('\n### Result1 shows that the array of strings is seen as one item by Loop1', {
			color: 3,
			position: [800, -340],
			width: 320,
			height: 240,
		}),
	)
	.add(
		sticky(
			'### Result2 shows that the Loop2 sees 5 items after the array of strings is split into separate objects',
			{ name: 'Sticky Note1', color: 3, position: [800, -60], width: 320, height: 260 },
		),
	)
	.add(
		sticky(
			'# N8N for Beginners: Looping Over Items\n\n## Description\n\nThis workflow is designed for **n8n beginners** to understand how n8n handles **looping (iteration)** over multiple items. It highlights two key behaviors:\n\n- **Built-In Looping:** By default, most n8n nodes iterate over each item in an input array.\n- **Explicit Looping:** The **Loop Over Items** node allows controlled iteration, enabling **custom batch processing** and multi-step workflows.\n\nThis workflow demonstrates the difference between processing an **unsplit array of strings (single item)** vs. **a split array (multiple items)**.\n\n---\n\n## Setup\n\n### 1. Input Data\n\nTo begin, **paste the following JSON** into the **Manual Trigger** node:\n\n```json\n{\n  "urls": [\n    "https://www.reddit.com",\n    "https://www.n8n.io/",\n    "https://n8n.io/",\n    "https://supabase.com/",\n    "https://duckduckgo.com/"\n  ]\n}\n```\n\nðŸ“Œ **Steps to Paste Data:**\n- **Double-click** the "Manual Trigger" node.\n- Click **"Edit Output"** (top-right corner).\n- Paste the JSON and **Save**.\n- The node **turns purple**, indicating that test data is pinned. \n\n---\n\n## Explanation of the n8n Nodes in the Workflow\n\n### Manual Trigger  \nThis node starts the workflow manually and sends test data.  \n**Documentation:** [Manual Trigger Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualtrigger/)\n\n### Split Out (Split Array of Strings into Array of Objects)  \nExtracts the `urls` array and splits it so that each URL becomes a separate JSON object.  \n**Documentation:** [Split Out Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitout/)\n\n### Loop Over Items (Loop Over Items 1)  \nDemonstrates how an **unsplit** array is treated as one item, processing it as a single unit.  \n**Documentation:** [Loop Over Items Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/)\n\n### Loop Over Items (Loop Over Items 2)  \nProcesses the **split array** one item at a time. This demonstrates individual iteration and controlled looping.  \n**Documentation:** [Loop Over Items Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/)\n\n### Wait Node  \nIntroduces a **1-second delay** per iteration to demonstrate sequential execution. This can be removed for faster performance.  \n**Documentation:** [Wait Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/)\n\n### Code Nodes (Add param1 to outputX)  \nEach Code node adds a constant field (`param1`) to the data, ensuring that every item gets enriched with the same parameter.  \n**Documentation:** [Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/)\n\n### NoOp Nodes (Result1, Result2, Result3, Result4, Result5)\nThese nodes display the output at different stages of the workflow for inspection.\n**Documentation:** [NoOp Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.noop/)\n\n\n\n---\n\n## Execution Details\n\n### 1. How the Workflow Runs\n\n- **Manual Trigger starts execution** with the pasted JSON data.\n- The workflow follows **two paths**:\n\n#### Unsplit Array Path â†’ Loop Over Items 1  \n- The original JSON is processed **as a single item**.  \n- **Result1 & Result5:** Show that the array was **not split** before processing.\n\n#### Split Array Path â†’ Split Out â†’ Loop Over Items 2  \n- The **Split Out** node converts the `urls` array into separate objects.\n- The **Loop Over Items 2** node processes each URL **one by one**.\n- A **Wait node** (1-second delay) demonstrates **controlled execution**.\n- **Code nodes** modify the JSON, adding the field (`param1`).\n- **Result2, Result3, Result4:** Display the final processed output.\n\n### 2. What You Will See\n\n- **Result1 & Result5:** The entire array is processed **as one item** before splitting.\n- **Result2, Result3, Result4:** Each URL is processed **individually** after being split.\n- **Wait Node:** Adds a **1-second delay per item** in **Loop Over Items 2**.\n\n---\n\n## Notes\n\n- Sticky notes are included in the workflow **for easy reference**.\n- The **Wait node** is **optional**â€”remove it for faster execution.\n- This template is structured for **beginners** but serves as a **building block** for more advanced automations.\n\n---\n\n',
			{ name: 'Sticky Note2', position: [-1680, -1100], width: 1200, height: 2480 },
		),
	)
	.add(
		sticky(
			'### Result4 shows that we can turn off the looping feature by setting the looping behavior to "Run Once For All Items"',
			{ name: 'Sticky Note3', color: 3, position: [800, 700], width: 320, height: 260 },
		),
	)
	.add(
		sticky('### Result3 shows that looping over items is built in to n8n nodes', {
			name: 'Sticky Note4',
			color: 3,
			position: [800, 420],
			width: 320,
			height: 240,
		}),
	)
	.add(
		sticky(
			'### Result5 shows that the array of strings is seen as one item by Code5. So the behavior is the same as Loop1',
			{ name: 'Sticky Note5', color: 3, position: [800, -640], width: 320, height: 260 },
		),
	);
