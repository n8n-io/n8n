const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [5380, 3940] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5640, 3820], name: 'Test Node' },
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
								id: '3e271a03-2dc7-42e8-a16d-ea604d3e25a1',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '',
								rightValue: '',
							},
						],
					},
				},
				position: [5540, 3920],
				name: 'Test IF',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5720, 3800], name: 'Test Node (1)' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5700, 3960], name: 'Test Node (2)' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [4620, 4540], name: 'Execute Set Node' },
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
								id: '12345',
								name: 'status',
								type: 'string',
								value: 'Data is ready!',
							},
						],
					},
				},
				position: [4920, 4540],
				name: '➡️ Pin My Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5260, 4540], name: '➡️ Open the Execution Data Panel' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [4640, 2880], name: '➡️ First, Rename Me!' },
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
								id: '12345',
								name: 'my_value',
								type: 'string',
								value: 'Hello World',
							},
						],
					},
				},
				position: [4920, 2880],
				name: '➡️ Now, Edit Me!',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5200, 2880], name: '➡️ This one is extra. Deactivate Me!' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5480, 2880], name: '➡️ We need another one. Duplicate Me!' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5780, 2880], name: '➡️ Copy Me' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [6080, 2880], name: '➡️ Delete me!' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [6360, 2880], name: '➡️ Add a Sticky Node' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [4640, 3420], name: "➡️ Let's add a new node" },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [4920, 3420], name: '➡️ Select these three nodes' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5140, 3420], name: 'Node 2' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5360, 3420], name: 'Node 3' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [4640, 3980], name: '➡️ Now select everything' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [4900, 3980], name: '➡️ Zoom out to see it all' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5640, 3420], name: 'Node A' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [5880, 3420], name: 'Node B' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [6120, 3420], name: 'Node C' },
		}),
	)
	.add(
		sticky(
			"# Tutorial - n8n Keyboard Shortcuts!\n\nWelcome! This workflow is an interactive playground to help you master the most useful keyboard shortcuts in n8n.\n\n**How to use this tutorial:**\nFollow the main path from top to bottom. Each step will give you a small task to complete using a keyboard shortcut. Just do what the sticky notes say!\n\nLet's begin!",
			{ name: 'Introduction', color: 6, position: [4540, 2280], width: 620, height: 260 },
		),
	)
	.add(
		sticky(
			"## Chapter 1: Node Basics\n\nLet's start with the fundamentals of interacting with a single node.",
			{ name: 'Chapter 1 Header', position: [4540, 2580], width: 2020, height: 500 },
		),
	)
	.add(
		sticky(
			"## Chapter 2: Canvas Navigation & Selection\n\nNow let's learn how to move around the canvas and manage multiple nodes like a pro.",
			{ name: 'Chapter 2 Header', color: 2, position: [4540, 3120], width: 1780, height: 500 },
		),
	)
	.add(
		sticky(
			'## Chapter 3: Advanced Actions\n\nTime for some powerful moves:\n- Repositioning (Tidy Up)\n- Creating sub-workflows.\n- Canvas Zoom Control',
			{ name: 'Chapter 3 Header', color: 4, position: [4540, 3660], width: 1420, height: 500 },
		),
	)
	.add(
		sticky(
			"## Chapter 4: Execution & Debugging\n\nThese shortcuts are essential when you're testing your workflows.",
			{ name: 'Chapter 4 Header', color: 5, position: [4540, 4200], width: 960, height: 520 },
		),
	)
	.add(
		sticky(
			"## 🎉 You've Mastered the Basics!\n\nThe most important shortcut of all?\n\n## `Ctrl + S`\n### to Save your workflow!**\n\nDo it often. Congratulations!",
			{ name: 'Conclusion', color: 6, position: [4540, 4740], width: 540, height: 240 },
		),
	)
	.add(
		sticky(
			'**Task:** Select this node.\n\nPress **`Space`** to rename it.\n\nCall it "My First Node" and press Enter.',
			{ name: 'Sticky Note13', position: [4560, 2720], width: 260, height: 340 },
		),
	)
	.add(
		sticky(
			'**Task:** Select this Set node.\n\nPress **`Enter`** to open its settings panel.\n\nChange the value from "Hello World" to your name!',
			{ name: 'Sticky Note14', position: [4840, 2700], width: 260, height: 360 },
		),
	)
	.add(
		sticky(
			'**Task:** Select this node.\n\nPress **`D`** to deactivate it.\n\nNotice how it turns grey and would be skipped during an execution.',
			{ name: 'Sticky Note15', position: [5120, 2700], width: 260, height: 360 },
		),
	)
	.add(
		sticky('**Task:** Select this node.\n\nPress **`Ctrl + D`** to create an exact copy of it.', {
			name: 'Sticky Note16',
			position: [5400, 2760],
			width: 260,
			height: 300,
		}),
	)
	.add(
		sticky(
			'**Task:** Press **`Tab`** anywhere on the canvas.\n\nThis opens the node search menu. Type "Set" and press Enter to add a new Set Node.',
			{ name: 'Sticky Note17', color: 2, position: [4560, 3260], width: 260, height: 340 },
		),
	)
	.add(
		sticky(
			'**Task:** Select multiple nodes.\n\n**Method 1:** Hold **`Ctrl`** and click on Node A, B, and C.\n\n**Method 2:** Click and drag a selection box around all three nodes.\n\n**Method 3:** Click on the first or last node, then hold **`Shift`** and press the Left or Right arrow key.',
			{ name: 'Sticky Note18', color: 2, position: [4840, 3240], width: 700, height: 360 },
		),
	)
	.add(
		sticky(
			'**Task:** Press **`Ctrl + A`** to select every single node and sticky note on the canvas.',
			{ name: 'Sticky Note19', color: 4, position: [4560, 3860], width: 260, height: 280 },
		),
	)
	.add(
		sticky(
			'**Task:** Press **`1`** to fit the entire workflow to your screen.\n\n**Bonus:** Hold **`Ctrl`** and use your mouse wheel to zoom in and out.',
			{ name: 'Sticky Note20', color: 4, position: [4840, 3840], height: 300 },
		),
	)
	.add(
		sticky(
			'**Task:**\n1. Select this node and press **`Ctrl + C`** (Copy) or **`Ctrl + X`** (Cut).\n2. Click anywhere on the empty canvas.\n3. Press **`Ctrl + V`** (Paste).',
			{ name: 'Sticky Note21', position: [5680, 2740], width: 300, height: 320 },
		),
	)
	.add(
		sticky(
			'**Task:**\n1. Click "Execute Workflow" on the left of the "Execute Set Node".\n2. After it runs, select **this** Set node.\n3. Press **`P`** to **Pin** its data.\n\n\nPinned data stays visible even after you run the workflow again, which is great for comparing results or avoiding run costs and delays!',
			{ name: 'Sticky Note22', color: 5, position: [4800, 4320], width: 340, height: 380 },
		),
	)
	.add(
		sticky(
			'**Task:**\n1. Press **`L`** to open the **Execution Panel** and use the Down Arrow to select a node with input/output execution data.\n2. Press **`O`** to show/hide the **Outputs**\n3. Press **`I`** to show/hide the **Inputs**',
			{ name: 'Sticky Note24', color: 5, position: [5160, 4380], width: 320, height: 320 },
		),
	)
	.add(
		sticky(
			'**Task:** Select the nodes in this node.\n\nPress  **`Shift + Alt + T`**  to tidy up selected nodes.\n\nPress  **`Alt + X`**  to create a sub workflow with selected nodes.',
			{ color: 7, position: [5100, 3720], width: 840, height: 420 },
		),
	)
	.add(
		sticky(
			'**Task:**\n1. Select this node.\n2. Press **`Del`** to delete the selected node.\n3. Press **`Ctrl + Z`** to undo.\n4. Press **`Ctrl + Shift + Z`** to re-do (it will re-delete me!).',
			{ name: 'Sticky Note25', position: [6000, 2700], width: 280, height: 360 },
		),
	)
	.add(
		sticky('**Task:** Add a sticky note.\n\nPress **`Shift + S`** to add a new Sticky Note.', {
			name: 'Sticky Note26',
			position: [6300, 2760],
			height: 300,
		}),
	)
	.add(
		sticky(
			'**Task:** Move between nodes\n\n**Method 1:** Select a node, then use the arrow keys to move to the next or previous node.\n\n**Method 2:** Open a node (select it + Enter), then navigate to the next or previous node directly from the edit panel.\n👉 Look for the target node on the left or right edge of your screen, centered vertically.',
			{ name: 'Sticky Note27', color: 2, position: [5560, 3240], width: 740, height: 360 },
		),
	)
	.add(
		sticky(
			"## Was this helpful? Let me know!\n\nI really hope this tutorial helped you understand n8n shortcuts better. Your feedback is incredibly valuable and helps me create better resources for the n8n community.\n\n### **Share Your Thoughts & Ideas**\n\nWhether you have a suggestion, found a typo, or just want to say thanks, I'd love to hear from you!\nHere's a simple n8n form built for this purpose:\n\n#### ➡️ **[Click here to give feedback](https://api.ia2s.app/form/templates/feedback?template=Shortcuts%20Tutorial)**\n\n### **Ready to Build Something Great?**\n\nIf you're looking to take your n8n skills or business automation to the next level, I can help.\n\n**🎓 n8n Coaching:** Want to become an n8n pro? I offer one-on-one coaching sessions to help you master workflows, tackle specific problems, and build with confidence.\n#### ➡️ **[Book a Coaching Session](https://api.ia2s.app/form/templates/coaching?template=Shortcuts%20Tutorial)**\n\n**💼 n8n Consulting:** Have a complex project, an integration challenge, or need a custom workflow built for your business? Let's work together to create a powerful automation solution.\n#### ➡️ **[Inquire About Consulting Services](https://api.ia2s.app/form/templates/consulting?template=Shortcuts%20Tutorial)**\n\n---\n\nHappy Automating!\nLucas Peyrin",
			{ name: 'Sticky Note12', color: 3, position: [4540, 5000], width: 540, height: 800 },
		),
	);
