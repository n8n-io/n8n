const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-7360, 992], name: 'Start Tutorial' },
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
							{ id: '12345', name: 'name', type: 'string', value: 'Alice' },
							{ id: '67890', name: 'age', type: 'number', value: 30 },
							{
								id: 'abcde',
								name: 'is_active',
								type: 'boolean',
								value: true,
							},
							{
								id: 'fghij',
								name: 'skills',
								type: 'array',
								value: '["JavaScript","Python","n8n"]',
							},
							{
								id: 'klmno',
								name: 'projects',
								type: 'array',
								value:
									'[{"name":"Project A","status":"Done"},{"name":"Project B","status":"In Progress"}]',
							},
							{
								id: 'pqrst',
								name: 'contact',
								type: 'object',
								value: '{"email":"user@example.com","phone":null}',
							},
						],
					},
				},
				position: [-6720, 992],
				name: 'Source Data',
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
								id: '12345',
								name: 'user_name',
								type: 'string',
								value: "={{ $('Source Data').item.json.name }}",
							},
						],
					},
				},
				position: [-6192, 992],
				name: '1. The Basics',
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
								id: '12345',
								name: 'user_name_from_first',
								type: 'string',
								value: "={{ $('Source Data').last().json.name }}",
							},
						],
					},
				},
				position: [-5568, 992],
				name: '2. The n8n Selectors',
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
								id: '12345',
								name: 'second_skill',
								type: 'string',
								value: "={{ $('Source Data').last().json.skills[1] }}",
							},
						],
					},
				},
				position: [-4960, 992],
				name: '3. Working with Arrays',
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
								id: '12345',
								name: 'user_email',
								type: 'string',
								value: "={{ $('Source Data').last().json.contact.email }}",
							},
						],
					},
				},
				position: [-4400, 992],
				name: '4. Going Deeper',
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
								id: '12345',
								name: 'first_project_status',
								type: 'string',
								value: "={{ $('Source Data').last().json.projects[0].status }}",
							},
						],
					},
				},
				position: [-3808, 992],
				name: '5. The Combo Move',
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
								id: '12345',
								name: 'name_in_caps',
								type: 'string',
								value: "={{ $('Source Data').last().json.name.toUpperCase() }}",
							},
							{
								id: '67890',
								name: 'age_in_dog_years',
								type: 'number',
								value: "={{ Math.round($('Source Data').last().json.age / 7) }}",
							},
							{
								id: 'abcde',
								name: 'age_data_type',
								type: 'string',
								value: "={{ typeof $('Source Data').last().json.age }}",
							},
						],
					},
				},
				position: [-3200, 992],
				name: '6. A Touch of Magic',
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
								id: '12345',
								name: 'contact_keys',
								type: 'array',
								value: "={{ Object.keys($('Source Data').last().json.contact) }}",
							},
						],
					},
				},
				position: [-2640, 992],
				name: '7. Inspecting Objects',
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
								id: '12345',
								name: 'contact_as_string',
								type: 'string',
								value: "={{ JSON.stringify($('Source Data').last().json.contact, null, 2) }}",
							},
							{
								id: '06003b65-7482-4d5a-b2c0-1794859ab461',
								name: 'skills',
								type: 'array',
								value: "={{ $('Source Data').last().json.skills }}",
							},
						],
					},
				},
				position: [-2064, 992],
				name: '8. Utility Functions',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					include: 'allOtherFields',
					options: {},
					fieldToSplitOut: 'skills',
				},
				position: [-1488, 992],
				name: 'Split Out Skills',
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
								id: '12345',
								name: 'all_skills_string',
								type: 'string',
								value:
									"={{ $('Split Out Skills').all().map(item => item.json.skills).join(', ') }}",
							},
						],
					},
				},
				position: [-1264, 992],
				name: '9. The "All Items" View',
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
								id: '12345',
								name: 'final_summary',
								type: 'string',
								value:
									"=User {{ $('2. The n8n Selectors').last().json.user_name_from_first }} is {{ $('Source Data').last().json.age }}.\n\nTheir best skill is {{ $('3. Working with Arrays').last().json.second_skill }}.\n\nTheir first project was {{ $('Source Data').last().json.projects[0].name }}, which is now {{ $('5. The Combo Move').last().json.first_project_status }}.\n\nAll skills: {{ $('9. The \"All Items\" View').last().json.all_skills_string }}.",
							},
						],
					},
				},
				position: [-688, 992],
				name: 'Final Exam',
			},
		}),
	)
	.add(
		sticky(
			"# Tutorial - Mastering n8n Expressions\n\nWelcome! You know what JSON is. Now, let's learn how to **use it**. This workflow teaches you how to pull data from one node and use it in another using n8n's powerful expressions.\n\n**What is an Expression?**\nAn expression is a small piece of code inside double curly braces `{{ }}` that gets replaced with a dynamic value when the workflow runs. It's the \"glue\" that connects your nodes.\n\n**How to use this tutorial:**\n1.  The first node, **\"Source Data\"**, contains all the data we will use. Execute it once to see what's inside.\n2.  Follow the path from top to bottom. Each node is a new lesson.\n3.  Read the sticky note for each lesson, then look at the node's configuration and its output to understand the concept.",
			{ color: 5, position: [-7616, 592], width: 640, height: 560 },
		),
	)
	.add(
		sticky(
			'## Our Data Source\n\nThis node holds all the sample data for our tutorial. Think of it as a filing cabinet. All the other nodes will be reaching into this cabinet to pull out specific pieces of information.\n\nTake a look at its output to familiarize yourself with the structure.\nWe have:\n- Simple text (`name`)\n- A number (`age`)\n- A list of skills (`skills`)\n- A list of complex projects (`projects`)\n- A nested contact object (`contact`)',
			{ name: 'Sticky Note1', color: 7, position: [-6944, 640], width: 520, height: 520 },
		),
	)
	.add(
		sticky(
			"## Lesson 1: Accessing a Simple Value\n\nThis is the most common thing you'll do in n8n.\n\n**The Goal:** Get the user's name from the \"Source Data\" node.\n\n**The Expression:** `{{ $('Source Data').item.json.name }}`\n\n**Breakdown:**\n- `{{ ... }}`: Tells n8n \"this is a dynamic expression\".\n- `$('Source Data')`: Selects the node we want data from.\n- `.item.json`: Narrows it down to the JSON data of the current item.\n- `.name`: Selects the specific **key** we want the value of.\n\n**Other Possibility:**\n`{{ $json.name }}` would also work in this case, as `$json` accesses the data from the previous node.",
			{ name: 'Sticky Note2', color: 2, position: [-6400, 576], width: 500, height: 580 },
		),
	)
	.add(
		sticky(
			"## Lesson 3: Accessing an Array Element\n\nWhat if the data is in a list (an array)? You need to specify *which* item you want.\n\n**The Goal:** Get the user's *second* skill.\n\n**The Expression:** `{{ $('Source Data').last().json.skills[1] }}`\n\n**Breakdown:**\n- `...skills`: Selects the array of skills.\n- `[1]`: Selects the item at a specific position.\n- **IMPORTANT:** Arrays are \"zero-indexed\", which means the first item is `[0]`, the second is `[1]`, the third is `[2]`, and so on.",
			{ name: 'Sticky Note3', color: 4, position: [-5168, 624], width: 540, height: 520 },
		),
	)
	.add(
		sticky(
			"## Lesson 4: Accessing Nested Data\n\nSometimes, data is organized into objects within other objects.\n\n**The Goal:** Get the user's email address.\n\n**The Expression:** `{{ $('Source Data').last().json.contact.email }}`\n\n**Breakdown:**\n- `...contact`: First, we access the `contact` object.\n- `.email`: Then, we use another dot `.` to go one level deeper and get the value of the `email` key inside it.",
			{ name: 'Sticky Note4', color: 5, position: [-4608, 672], width: 540, height: 480 },
		),
	)
	.add(
		sticky(
			"## Lesson 5: Accessing Data in an Array of Objects\n\nThis is the ultimate test of the previous lessons!\n\n**The Goal:** Get the *status* of the *first* project in the list.\n\n**The Expression:** `{{ $('Source Data').last().json.projects[0].status }}`\n\n**Breakdown:**\n1.  `...projects`: We select the array of projects.\n2.  `[0]`: We pick the first object in that array.\n3.  `.status`: From that chosen object, we grab the value of the `status` key.",
			{ name: 'Sticky Note5', color: 6, position: [-4048, 672], width: 580, height: 480 },
		),
	)
	.add(
		sticky(
			"## Lesson 6: A Touch of Magic (JS Functions)\n\nYou can do more than just retrieve data; you can **manipulate and inspect it!**\n\n**The Expressions:**\n- **Transform Text:** `{{ $('Source Data').last().json.name.toUpperCase() }}`\n- **Do Math:** `{{ Math.round($('Source Data').last().json.age / 7) }}`\n- **Check Data Type:** `{{ typeof $('Source Data').last().json.age }}`\n\n**Breakdown:**\n- **`.toUpperCase()`**: A standard JavaScript function for strings.\n- **`Math.round(...)`**: The `Math` object gives you access to powerful math functions.\n- **`typeof`**: An operator that tells you what kind of data you're looking at (\"string\", \"number\", \"object\", etc.).",
			{ name: 'Sticky Note6', color: 3, position: [-3440, 640], width: 580, height: 520 },
		),
	)
	.add(
		sticky(
			"## Lesson 9: Working with Multiple Items (`$items` & Arrow Functions)\n\nWhat if a node outputs *multiple* items and you want to summarize them? `$items()` is your tool.\n\n**The Goal:** Get a single, comma-separated string of all the user's skills.\n\n**The Expression:** `{{ $('Split Out Skills').all().map(item `=>` item.json.skills).join(', ') }}`\n\n**What is `item => ...`?**\nThis is an **Arrow Function**, a shorthand for \"for each thing, do this\".\n- `item`: A temporary name for each item in the list as we loop over it.\n- =>: The \"arrow\" that separates the item from the action.\n- `item.json.skills`: The action to perform—in this case, get the skill value from the item.",
			{ name: 'Sticky Note7', color: 5, position: [-1696, 640], width: 780, height: 520 },
		),
	)
	.add(
		sticky(
			"## 🎓 FINAL EXAM: Putting It All Together\n\nThis node uses everything we've learned to build a final summary object.\n\nLook at the expressions for each field. They pull data from different nodes and use different techniques you've just practiced.\n\n**Congratulations! You now have the foundational knowledge to link data and build powerful, dynamic workflows in n8n.**",
			{ name: 'Sticky Note8', color: 6, position: [-896, 736], width: 520, height: 420 },
		),
	)
	.add(
		sticky(
			"## Lesson 2: The n8n Selectors (`.first()`, `.last()`, `.all()`)\n\nIn the last lesson, we used `.item`. When there is only one output item from a node, this is equivalent to `.last()`. Using `.last()` explicitly is often safer and clearer.\n\n**The Goal:** Get the user's name using the `.last()` selector.\n\n**The Expression:** `{{ $('Source Data').last().json.name }}`\n\n**Why is this better?**\nIf a node ever returns multiple items, `.last()` guarantees you only get data from the very last one.\n\nIf you ever need to match the selected data with the input items, this is where `.item` cannot be replaced.\n\n**Other Selectors:**\n- **`.first()`**: Gets the data from the first item.\n- **`.all()`**: Gets data from ALL items, returning it as an array of objects. (This is different from `$items`!)",
			{ name: 'Sticky Note9', position: [-5872, 528], width: 680, height: 620 },
		),
	)
	.add(
		sticky(
			'## Lesson 7: Inspecting Objects (`Object.keys()`)\n\nWhat if you have an object but you don\'t know what keys are inside it? `Object.keys()` comes to the rescue.\n\n**The Goal:** Get a list of all the keys inside the `contact` object.\n\n**The Expression:** `{{ Object.keys($(\'Source Data\').last().json.contact) }}`\n\nThis is incredibly useful for dynamically processing data. It returns an **array** containing the names of the keys (e.g., `["email", "phone"]`).',
			{ name: 'Sticky Note10', color: 2, position: [-2832, 640], width: 500, height: 520 },
		),
	)
	.add(
		sticky(
			'## Lesson 8: Utility Functions (`JSON.stringify()`)\n\nSometimes you need to convert a structured JSON object back into a clean, single string. This is common when sending data to another service, like in an AI prompt.\n\n**The Goal:** Turn the entire `contact` object into a formatted string.\n\n**The Expression:** `{{ JSON.stringify($(\'Source Data\').last().json.contact, null, 2) }}`\n\n**Breakdown:**\n- **`JSON.stringify(...)`**: The function that does the conversion.\n- **`null, 2`**: These optional parameters tell it to "pretty-print" the string with an indentation of 2 spaces, making it readable.',
			{ name: 'Sticky Note11', position: [-2304, 640], width: 580, height: 520 },
		),
	)
	.add(
		sticky(
			"## Was this helpful? Let me know!\n[![clic](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/clic_down_lucas.gif)](https://n8n.ac)\n\nI really hope this tutorial helped you understand n8n Expressions better. Your feedback is incredibly valuable and helps me create better resources for the n8n community.\n\n### **Share Your Thoughts & Ideas**\n\nWhether you have a suggestion, found a typo, or just want to say thanks, I'd love to hear from you!\nHere's a simple n8n form built for this purpose:\n\n#### ➡️ **[Click here to give feedback](https://api.ia2s.app/form/templates/feedback?template=Expressions%20Tutorial)**\n\n### **Ready to Build Something Great?**\n\nIf you're looking to take your n8n skills or business automation to the next level, I can help.\n\n**🎓 n8n Coaching:** Want to become an n8n pro? I offer one-on-one coaching sessions to help you master workflows, tackle specific problems, and build with confidence.\n#### ➡️ **[Book a Coaching Session](https://api.ia2s.app/form/templates/coaching?template=Expressions%20Tutorial)**\n\n**💼 n8n Consulting:** Have a complex project, an integration challenge, or need a custom workflow built for your business? Let's work together to create a powerful automation solution.\n#### ➡️ **[Inquire About Consulting Services](https://api.ia2s.app/form/templates/consulting?template=Expressions%20Tutorial)**\n\n---\n\nHappy Automating!\nLucas Peyrin | [n8n Academy](https://n8n.ac)",
			{ name: 'Sticky Note12', color: 3, position: [-352, -128], width: 540, height: 1280 },
		),
	)
	.add(
		sticky(
			'## [>> Go to Eval Workflow <<](https://n8n.io/workflows/6236)\n\nVerify your skills with a complete eval workflow to put your Expression Skills to the test.\n[![Test Skills](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/test_your_skillls_button.gif)](https://n8n.io/workflows/6236)',
			{ name: 'Sticky Note15', color: 6, position: [-896, 304], width: 512, height: 408 },
		),
	);
