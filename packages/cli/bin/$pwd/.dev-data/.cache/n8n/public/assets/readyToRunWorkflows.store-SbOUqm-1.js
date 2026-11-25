import { $d as init_runtime_core_esm_bundler, Rd as computed, Vu as useLocalStorage, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { EA as STORES, Od as useWorkflowsStore, hC as useTelemetry, jN as useI18n, mC as useCloudPlanStore, oc as useFoldersStore, vy as usePostHog, xS as BATCH_11AUG_EXPERIMENT } from "./app-D5flEmb-.js";
//#region src/experiments/readyToRunWorkflows/workflows/1_playground.ts
var PLAYGROUND_1 = {
	meta: { templateId: "37_onboarding_experiments_batch_aug11-1_filter_data" },
	name: "▶️ 1. Filter data coming from an API",
	nodes: [
		{
			parameters: {},
			type: "n8n-nodes-base.merge",
			typeVersion: 3.2,
			position: [448, 176],
			id: "01f2f222-4ff2-41ec-afd9-68496d2e0cb3",
			name: "Merge"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.manualTrigger",
			typeVersion: 1,
			position: [-768, 192],
			id: "e5ef1b32-ce8a-4c71-aa14-6885a09feabe",
			name: "When clicking ‘Execute workflow’"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "2fd0b039-7dd9-4666-bc24-d3a81e6d4b68",
					name: "quote_category",
					value: "Personal",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [160, 272],
			id: "42d065cd-1580-4b2a-8cc6-796be9a1da2a",
			name: "Set Category = Personal"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "1ff91e4a-8460-4991-a273-c5f24b4038e9",
					name: "quote_category",
					value: "team",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [160, 64],
			id: "a5259694-11ed-442c-be2a-e0000926fb30",
			name: "Set Category = Team"
		},
		{
			parameters: {
				assignments: { assignments: [
					{
						id: "c014a174-3f17-41bf-9fa5-19e822427346",
						name: "author",
						value: "={{ $('Make an API request to get a random quote').item.json.author }}",
						type: "string"
					},
					{
						id: "1d60a497-d964-406b-96fc-0206c82d5742",
						name: "quote",
						value: "={{ $('Make an API request to get a random quote').item.json.quote }}",
						type: "string"
					},
					{
						id: "5faf3496-8aa3-4a71-934c-6c5e3f08100b",
						name: "quote_category",
						value: "={{ $json.quote_category }}",
						type: "string"
					}
				] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [736, 176],
			id: "82b78022-f986-4bb0-aac8-f34558d46e5d",
			name: "Quote with category"
		},
		{
			parameters: {
				content: "The node below is an `HTTP Node`. It makes a request to an API, which returns a single random quote. ",
				height: 512,
				width: 304,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-512, -48],
			id: "d6145c80-0504-4a0b-bfd7-5e85867b3d76",
			name: "Sticky Note3"
		},
		{
			parameters: {
				content: "The `Filter node` checks if the quote contains \"you\" or \"your\" , to categorise the quote.\n\nIf matched, we create a `quote_category` variable in the `Set node` , with the value to \"Team\"",
				height: 512,
				width: 496,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-160, -48],
			id: "75efc471-b2a7-4cb0-8299-f7ad710ff67e",
			name: "Sticky Note5"
		},
		{
			parameters: {
				content: "You can reference data input from earlier nodes.  We use here the `author` variable which was returned from the first node, the API request.\n\n",
				height: 512,
				width: 288,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [640, -48],
			id: "9df256c6-a437-4a53-a760-e6964e73c5c3",
			name: "Sticky Note6"
		},
		{
			parameters: {
				content: "The `Merge` combines the outputs of both branches into a single list.\n",
				height: 512,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [368, -48],
			id: "ad7ec1f3-7a95-444f-a5b8-363fc1224f95",
			name: "Sticky Note8"
		},
		{
			parameters: {
				content: "### ⏩ Next up: \n\n- Tweak and edit this workflow. It's made for you to hack up! \n*Example: Try adding the quote `id` to the final output in the \"Quote with category\" node.*\n\n- Try out the other workflows in the Playground \n\n\n\n\n",
				height: 240,
				width: 400,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [960, 96],
			id: "0d9362fd-e399-4ce5-ba47-c9ab59b452de",
			name: "Sticky Note9"
		},
		{
			parameters: {
				content: "**Tip: Ressources**\n- Use the `n8n Assistant` or any LLM like `ChatGPT` to explain a screenshot, fix issues, or create workflows for you\n- Learn and get inspired with [templates](https://n8n.io/workflows/)\n- Follow the [n8n Courses](https://docs.n8n.io/courses/) or find tutorials on Youtube\n- Ask [the community](https://community.n8n.io/) for help \n",
				height: 176,
				width: 400,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [960, 480],
			id: "724338d8-3e2b-43a1-8a3d-a38be2a50ed3",
			name: "Sticky Note7"
		},
		{
			parameters: {
				content: "## ▶ Click to start\n\n1. Click the orange `Execute Workflow` button  \n2. Double-click nodes to view data flows\n2. Re-run to see results change",
				height: 448,
				width: 368,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-912, -48],
			id: "a05fb79b-a6e6-498d-bdb2-c73ff7898233",
			name: "Sticky Note11"
		},
		{
			parameters: {
				conditions: {
					options: {
						caseSensitive: false,
						leftValue: "",
						typeValidation: "strict",
						version: 2
					},
					conditions: [{
						id: "4b2c3ebb-ad22-4d62-a64e-fdc2837565bc",
						leftValue: "={{ $json.quote }}",
						rightValue: "you",
						operator: {
							type: "string",
							operation: "contains"
						}
					}, {
						id: "da268099-9c51-4e93-bc02-d8f0eda03ffd",
						leftValue: "={{ $json.quote }}",
						rightValue: "your",
						operator: {
							type: "string",
							operation: "contains"
						}
					}],
					combinator: "or"
				},
				options: { ignoreCase: true }
			},
			type: "n8n-nodes-base.if",
			typeVersion: 2.2,
			position: [-96, 192],
			id: "f2dda369-4176-493e-8c6e-c3390a6968a3",
			name: "Filter the quote"
		},
		{
			parameters: {
				url: "https://dummyjson.com/quotes/random",
				options: {}
			},
			id: "c4437d01-a813-48a7-ac9a-366740d44428",
			name: "Make an API request to get a random quote",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 1,
			position: [-400, 192]
		}
	],
	connections: {
		Merge: { main: [[{
			node: "Quote with category",
			type: "main",
			index: 0
		}]] },
		"When clicking ‘Execute workflow’": { main: [[{
			node: "Make an API request to get a random quote",
			type: "main",
			index: 0
		}]] },
		"Set Category = Personal": { main: [[{
			node: "Merge",
			type: "main",
			index: 1
		}]] },
		"Set Category = Team": { main: [[{
			node: "Merge",
			type: "main",
			index: 0
		}]] },
		"Filter the quote": { main: [[{
			node: "Set Category = Team",
			type: "main",
			index: 0
		}], [{
			node: "Set Category = Personal",
			type: "main",
			index: 0
		}]] },
		"Make an API request to get a random quote": { main: [[{
			node: "Filter the quote",
			type: "main",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflows/workflows/2_playground.ts
var PLAYGROUND_2 = {
	meta: { templateId: "37_onboarding_experiments_batch_aug11-2_process_user_answers" },
	settings: { executionOrder: "v1" },
	name: "▶️ 2. Process user answers from a form",
	nodes: [
		{
			parameters: { numberInputs: 3 },
			type: "n8n-nodes-base.merge",
			typeVersion: 3.2,
			position: [960, 336],
			id: "f6f94912-64a3-4671-9bda-abb03f4dc42e",
			name: "Merge"
		},
		{
			parameters: {
				content: "## ▶ Click to start \n\n1. Click the orange `Execute Worfklow` button\n2. Submit the form\n3. Double-click nodes to view data flows\n4. Try different answers",
				height: 432,
				width: 352,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-992, 160],
			id: "e5382a25-e813-4fba-bd8e-c16918521da7",
			name: "Sticky Note11"
		},
		{
			parameters: {
				content: "The `Switch` node routes the workflow based on the selected meal type: chicken, vegetarian, or surprise.",
				height: 432,
				width: 272,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-592, 160],
			id: "ab955ee5-03ea-45cb-afbb-4b36ccfdbda6",
			name: "Sticky Note"
		},
		{
			parameters: {
				rules: { values: [
					{
						conditions: {
							options: {
								caseSensitive: false,
								leftValue: "",
								typeValidation: "strict",
								version: 2
							},
							conditions: [{
								id: "c90e7527-e4ff-41a8-9177-ffdf7d25c72e",
								leftValue: "={{ $json['What type of meal would you like to cook tonight ? '] }}",
								rightValue: "chicken",
								operator: {
									type: "string",
									operation: "contains"
								}
							}],
							combinator: "and"
						},
						renameOutput: true,
						outputKey: "chicken"
					},
					{
						conditions: {
							options: {
								caseSensitive: false,
								leftValue: "",
								typeValidation: "strict",
								version: 2
							},
							conditions: [{
								leftValue: "={{ $json['What type of meal would you like to cook tonight ? '] }}",
								rightValue: "vegetarian",
								operator: {
									type: "string",
									operation: "contains"
								},
								id: "18bd7d98-f5e3-46df-96c6-8d1c5fea7cf2"
							}],
							combinator: "and"
						},
						renameOutput: true,
						outputKey: "vegetarian"
					},
					{
						conditions: {
							options: {
								caseSensitive: false,
								leftValue: "",
								typeValidation: "strict",
								version: 2
							},
							conditions: [{
								id: "74441f58-e5e5-487c-972d-ec7f9107436d",
								leftValue: "={{ $json['What type of meal would you like to cook tonight ? '] }}",
								rightValue: "surprise",
								operator: {
									type: "string",
									operation: "contains"
								}
							}],
							combinator: "and"
						},
						renameOutput: true,
						outputKey: "surprise"
					}
				] },
				options: { ignoreCase: true }
			},
			type: "n8n-nodes-base.switch",
			typeVersion: 3.2,
			position: [-512, 336],
			id: "6cbc178b-a420-4d57-a107-247600ae00c8",
			name: "Route based on meal preference"
		},
		{
			parameters: {
				url: "=https://dummyjson.com/recipes/{{$today.weekday}}",
				options: {}
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-160, 560],
			id: "98e4c862-5bf8-4cd9-8548-62d30b3c548a",
			name: "Get a random recipe from the API"
		},
		{
			parameters: {
				url: "=https://dummyjson.com/recipes/search?q={{ $json['What type of meal would you like to cook tonight ? '] }}",
				options: {}
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-160, 352],
			id: "52d53f34-9036-48f8-a71c-f501cc7e37b0",
			name: "Get vegetarian recipes from the API"
		},
		{
			parameters: {
				url: "=https://dummyjson.com/recipes/search?q=chicken",
				options: {}
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-160, 144],
			id: "240a9947-81fb-48ba-ac46-27381f4f67b6",
			name: "Get chicken recipes from the API"
		},
		{
			parameters: {
				content: "These `HTTP nodes` call the API to get recipes based on the user’s choice.",
				height: 816,
				width: 304,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-272, -48],
			id: "f27030aa-9cca-4872-b672-b7ab8f307584",
			name: "Sticky Note2"
		},
		{
			parameters: {
				content: "In the Chicken branch, the API returns an array with 8 chicken recipes.\n\nThe `Split Out` node splits the array into separate items: 8 items, one per recipe.",
				height: 576,
				width: 224,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [80, -48],
			id: "e4bc5319-ae92-4a72-878e-8c83ca80d203",
			name: "Sticky Note4"
		},
		{
			parameters: {
				content: "The `Form node` displays the selected recipe on the completion screen",
				height: 384,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [1152, 208],
			id: "6eb7f690-756d-46df-b927-91426e9635da",
			name: "Sticky Note5"
		},
		{
			parameters: {
				content: "The `Merge` node combines data from all three recipe branches.",
				height: 384,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [864, 208],
			id: "8e52483c-c740-454b-898b-cf457af693a8",
			name: "Sticky Note6"
		},
		{
			parameters: {
				formTitle: "n8n Form",
				formFields: { values: [{
					fieldLabel: "What type of meal would you like to cook tonight ? ",
					fieldType: "dropdown",
					fieldOptions: { values: [
						{ option: "Chicken-based" },
						{ option: "Vegetarian" },
						{ option: "Surprise me! " }
					] },
					requiredField: true
				}, {
					fieldLabel: "What's your name? ",
					requiredField: true
				}] },
				options: {}
			},
			type: "n8n-nodes-base.formTrigger",
			typeVersion: 2.2,
			position: [-864, 352],
			id: "3e5b2d36-5126-45f7-a81c-c1cfc82a392d",
			name: "Trigger when user submits form",
			webhookId: "d9a8c65e-486f-4304-a34d-87e9d68aa868"
		},
		{
			parameters: {
				content: "We want to suggest 1 recipe only, not 8.\nSo we sort by cooking time with the `Sort` node, and then pick the recipe  with lowest cooking time using `Limit` node",
				height: 384,
				width: 416,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [368, -48],
			id: "520e150e-9b22-4ed8-b3f2-1d128ed9e4c2",
			name: "Sticky Note7"
		},
		{
			parameters: {
				sortFieldsUi: { sortField: [{ fieldName: "cookTimeMinutes" }] },
				options: {}
			},
			type: "n8n-nodes-base.sort",
			typeVersion: 1,
			position: [432, 144],
			id: "17834d09-5d83-420f-9109-105e92baffef",
			name: "Sort by cooking time"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.limit",
			typeVersion: 1,
			position: [624, 144],
			id: "9db21680-c947-44c1-8194-48e42f995755",
			name: "Limit to recipe with lowest cooking time"
		},
		{
			parameters: {
				operation: "completion",
				completionTitle: "Recipe",
				completionMessage: "=Hey {{ $('Trigger when user submits form').item.json['What\\'s your name? '] }}, <br /><br />\n\nWhat about cooking a <b>{{ $json.name }}</b> tonight? <br /><br />\n\nIt shouldn't take you more than {{ $json.prepTimeMinutes }} minutes to prepare.<br /><br />\n\n<h3>What you'll need:</h3><br />\n\n<ul>{{ $json.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('') }}</ul><br /><br />\n\n<h3>Instructions</h3><br />\n\n{{ $json.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('<br />') }}\n",
				options: { customCss: ":root {\n	--font-family: 'Open Sans', sans-serif;\n	--font-weight-normal: 400;\n	--font-weight--bold: 600;\n	--font-size-body: 12px;\n	--font-size--lgabel: 14px;\n	--font-size-test-notice: 12px;\n	--font-size-input: 14px;\n	--font-size-header: 20px;\n	--font-size-paragraph: 14px;\n	--font-size--lgink: 12px;\n	--font-size-error: 12px;\n	--font-size-html-h1: 28px;\n	--font-size-html-h2: 20px;\n	--font-size-html-h3: 16px;\n	--font-size-html-h4: 14px;\n	--font-size-html-h5: 12px;\n	--font-size-html-h6: 10px;\n	--font-size--smubheader: 14px;\n\n	/* Colors */\n	--color-background: #fbfcfe;\n	--color-test-notice-text: #e6a23d;\n	--color-test-notice-bg: #fefaf6;\n	--color-test-notice-border: #f6dcb7;\n	--color-card-bg: #ffffff;\n	--color-card-border: #dbdfe7;\n	--color-card-shadow: rgba(99, 77, 255, 0.06);\n	--color-link: #7e8186;\n	--color-header: #525356;\n	--color-label: #555555;\n	--color-input-border: #dbdfe7;\n	--color-input-text: #71747A;\n	--color-focus-border: rgb(90, 76, 194);\n	--color-submit-btn-bg: #ff6d5a;\n	--color-submit-btn-text: #ffffff;\n	--color-error: #ea1f30;\n	--color-required: #ff6d5a;\n	--color-clear-button-bg: #7e8186;\n	--color-html-text: #555;\n	--color-html-link: #ff6d5a;\n	--color-header-subtext: #7e8186;\n\n	/* Border Radii */\n	--border-radius-card: 8px;\n	--border-radius-input: 6px;\n	--border-radius-clear-btn: 50%;\n	--card-border-radius: 8px;\n\n	/* Spacing */\n	--padding-container-top: 24px;\n	--padding-card: 24px;\n	--padding-test-notice-vertical: 12px;\n	--padding-test-notice-horizontal: 24px;\n	--margin-bottom-card: 16px;\n	--padding-form-input: 12px;\n	--card-padding: 24px;\n	--card-margin-bottom: 16px;\n\n	/* Dimensions */\n	--container-width: 448px;\n	--submit-btn-height: 48px;\n	--checkbox-size: 18px;\n\n	/* Others */\n	--box-shadow-card: 0px 4px 16px 0px var(--color-card-shadow);\n	--opacity-placeholder: 0.5;\n}\n\n.card {\n  text-align: left;\n}\n\nul {\n  padding-left: 20px;\n}\n\nh4, ul, li {\n  text-color: #7e8186!important;\n}\n\n" }
			},
			type: "n8n-nodes-base.form",
			typeVersion: 1,
			position: [1216, 352],
			id: "f1291ce7-161a-49bf-9c0c-5bc1227b986c",
			name: "Show completion screen with the recipe suggestion",
			webhookId: "593b279d-6426-48a0-b28c-44056660bca9"
		},
		{
			parameters: {
				content: "**Tip: Send data to n8n**\nYou can trigger a workflow in many ways – not just with forms. For example, using a webhook or when a new row is added to a Google Sheet.",
				height: 96,
				width: 352,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-992, 608],
			id: "16f3bf2a-943d-4399-946f-6444616e8e57",
			name: "Sticky Note8"
		},
		{
			parameters: {
				fieldToSplitOut: "recipes",
				options: {}
			},
			type: "n8n-nodes-base.splitOut",
			typeVersion: 1,
			position: [144, 352],
			id: "05c93482-4bd4-464c-b7ee-909a0fd0bada",
			name: "Split Out the results into separate items"
		},
		{
			parameters: {
				fieldToSplitOut: "recipes",
				options: {}
			},
			type: "n8n-nodes-base.splitOut",
			typeVersion: 1,
			position: [144, 144],
			id: "503526fd-c317-4d77-916c-2ff5eb6f63f9",
			name: "Split Out the array into 8 items"
		}
	],
	connections: {
		Merge: { main: [[{
			node: "Show completion screen with the recipe suggestion",
			type: "main",
			index: 0
		}]] },
		"Route based on meal preference": { main: [
			[{
				node: "Get chicken recipes from the API",
				type: "main",
				index: 0
			}],
			[{
				node: "Get vegetarian recipes from the API",
				type: "main",
				index: 0
			}],
			[{
				node: "Get a random recipe from the API",
				type: "main",
				index: 0
			}]
		] },
		"Get a random recipe from the API": { main: [[{
			node: "Merge",
			type: "main",
			index: 2
		}]] },
		"Get vegetarian recipes from the API": { main: [[{
			node: "Split Out the results into separate items",
			type: "main",
			index: 0
		}]] },
		"Get chicken recipes from the API": { main: [[{
			node: "Split Out the array into 8 items",
			type: "main",
			index: 0
		}]] },
		"Trigger when user submits form": { main: [[{
			node: "Route based on meal preference",
			type: "main",
			index: 0
		}]] },
		"Sort by cooking time": { main: [[{
			node: "Limit to recipe with lowest cooking time",
			type: "main",
			index: 0
		}]] },
		"Limit to recipe with lowest cooking time": { main: [[{
			node: "Merge",
			type: "main",
			index: 0
		}]] },
		"Show completion screen with the recipe suggestion": { main: [[]] },
		"Split Out the results into separate items": { main: [[{
			node: "Merge",
			type: "main",
			index: 1
		}]] },
		"Split Out the array into 8 items": { main: [[{
			node: "Sort by cooking time",
			type: "main",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflows/workflows/3_playground.ts
var PLAYGROUND_3 = {
	meta: { templateId: "37_onboarding_experiments_batch_aug11-3_check_weather_by_location" },
	name: "▶️ 3. Check weather based on user location",
	settings: { executionOrder: "v1" },
	nodes: [
		{
			parameters: { jsCode: "const today = new Date().toISOString().slice(0, 10);\nconst daily = $json.daily;\nconst index = daily.time.indexOf(today);\n\nif (index === -1) {\n  throw new Error(\"Today's forecast not found in response.\");\n}\n\nreturn [{\n  date: today,\n  temp_max: daily.temperature_2m_max[index],\n  temp_min: daily.temperature_2m_min[index]\n}];\n" },
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [336, -128],
			id: "d6463e70-9921-4e6f-acaa-c8d6153254ea",
			name: "Get today's high and low"
		},
		{
			parameters: {
				content: "**Tip: n8n 🧡 LLM**\n\nUse the n8n Assistant or ChatGPT, Claude, etc. to explain, edit, or create Javascript code for you.",
				height: 112,
				width: 272,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [240, 96],
			id: "30ebd1b4-55c2-45fd-ae30-2b974eee226f",
			name: "Sticky Note1"
		},
		{
			parameters: {
				content: "## ▶ Start here \n\n1. Click the orange `Execute Worfklow` button \n2. Double-click nodes to view data flows\n3. Note: The form doesn’t show up because it runs with [pinned](https://docs.n8n.io/data/data-pinning/) test data (purple highlights)\n3. Unpin the data to run the form normally",
				height: 208,
				width: 352,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-1056, -512],
			id: "152278ea-a817-4f6d-8053-f129d9038604",
			name: "Sticky Note2"
		},
		{
			parameters: {
				content: "The `Code` node lets you run Javascript code in your workflow.\n\nWe use it here to extract today’s date, max temp, and min temp from the API response.",
				height: 352,
				width: 272,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [240, -272],
			id: "5fcff69f-e059-4827-9241-081e4a7e4a6b",
			name: "Sticky Note3"
		},
		{
			parameters: {
				content: "This `HTTP node` calls an API to get the city’s latitude and longitude.\n\nThe user city input is used as a URL variable.",
				height: 352,
				width: 272,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-704, -272],
			id: "28813de7-3311-4c46-8b88-946c4c14a99e",
			name: "Sticky Note4"
		},
		{
			parameters: {
				content: "Another `HTTP node` calls a weather API using the latitude and longitude in the URL.",
				height: 352,
				width: 272,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-96, -272],
			id: "bc28c149-c4bd-4d68-b597-f7cf2f0ab0c4",
			name: "Sticky Note5"
		},
		{
			parameters: {
				content: "This `Limit` node keeps only the first item returned by the API.",
				height: 352,
				width: 256,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-400, -272],
			id: "1d23e68c-5d5c-4383-b6b8-ca552ad3a889",
			name: "Sticky Note6"
		},
		{
			parameters: {
				formTitle: "What's the weather where you live",
				formFields: { values: [{
					fieldLabel: "Which city do you live in ? ",
					fieldType: "textarea",
					placeholder: "Paris",
					requiredField: true
				}] },
				options: {}
			},
			type: "n8n-nodes-base.formTrigger",
			typeVersion: 2.2,
			position: [-944, -128],
			id: "beba8fc9-9213-43bb-8f78-08800d629270",
			name: "Trigger when user submits form",
			webhookId: "a460df1e-c73b-4654-9a21-2987cea55b14"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.limit",
			typeVersion: 1,
			position: [-320, -128],
			id: "aa0b1683-0586-465a-bcf2-38cf0617a6fc",
			name: "Limit to first item"
		},
		{
			parameters: {
				url: "=https://api.open-meteo.com/v1/forecast?latitude={{ $json.lat }}&longitude={{ $json.lon }}&daily=temperature_2m_max,temperature_2m_min",
				options: { response: { response: { responseFormat: "json" } } }
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [0, -128],
			id: "73b40790-3ef6-4091-9cd3-cab673276a7a",
			name: "Get weather for that latitude and longitude"
		},
		{
			parameters: {
				content: "**Tip: Edit pinned data**\n\nWhen data is pinned, click the ✏ icon in the top right to edit it. Try changing “London” to “Berlin” and rerun the workflow.",
				height: 128,
				width: 288,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-1056, 96],
			id: "d9390b71-3bf2-4094-b603-3f43988675e9",
			name: "Sticky Note"
		},
		{
			parameters: {
				url: "=https://nominatim.openstreetmap.org/search?q={{ $json['Which city do you live in ? '] }}&format=json",
				options: { response: { response: {} } }
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-624, -128],
			id: "e3ce382a-c21b-4ee8-b366-b28cfe2b1b37",
			name: "Get city latitude and longitude"
		},
		{
			parameters: {
				content: "This `Limit` node keeps only the first item returned by the API.",
				height: 352,
				width: 288,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-1056, -272],
			id: "305eea3e-c853-4a8c-a7d4-dd10d81bf099",
			name: "Sticky Note7"
		}
	],
	pinData: { "Trigger when user submits form": [{ json: {
		"Which city do you live in ? ": "London",
		submittedAt: "2025-08-01T12:06:25.400+02:00",
		formMode: "test"
	} }] },
	connections: {
		"Trigger when user submits form": { main: [[{
			node: "Get city latitude and longitude",
			type: "main",
			index: 0
		}]] },
		"Limit to first item": { main: [[{
			node: "Get weather for that latitude and longitude",
			type: "main",
			index: 0
		}]] },
		"Get weather for that latitude and longitude": { main: [[{
			node: "Get today's high and low",
			type: "main",
			index: 0
		}]] },
		"Get city latitude and longitude": { main: [[{
			node: "Limit to first item",
			type: "main",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflows/workflows/4_playground.ts
var PLAYGROUND_4 = {
	meta: { templateId: "37_onboarding_experiments_batch_aug11-4_create_personalized_email" },
	name: "🔌 4. Create a personalized email",
	settings: { executionOrder: "v1" },
	nodes: [
		{
			parameters: {
				url: "=https://nominatim.openstreetmap.org/search?q={{ $json.City }}&format=json",
				options: { response: { response: {} } }
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-336, -16],
			id: "d6ea9452-7fa4-41f6-b9cd-7f12b8e3b686",
			name: "Get city latitude and longitude"
		},
		{
			parameters: {
				url: "=https://api.open-meteo.com/v1/forecast?latitude={{ $json.lat }}&longitude={{ $json.lon }}&daily=temperature_2m_max,temperature_2m_min",
				options: { response: { response: { responseFormat: "json" } } }
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [48, -16],
			id: "db233160-3f63-47fa-998a-41977a51c2f6",
			name: "Get weather"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "ea110fbf-b67b-4270-8e55-ffec2f9ddafe",
					name: "City",
					value: "Paris",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [-640, -16],
			id: "e3c93ca5-2628-41f4-81ea-50c87403b285",
			name: "Set your location"
		},
		{
			parameters: { numberInputs: 3 },
			type: "n8n-nodes-base.merge",
			typeVersion: 3.2,
			position: [416, -208],
			id: "21021c33-7b93-4cbe-a592-f7b277ad332e",
			name: "Merge",
			notesInFlow: false
		},
		{
			parameters: {
				aggregate: "aggregateAllItemData",
				options: {}
			},
			type: "n8n-nodes-base.aggregate",
			typeVersion: 1,
			position: [688, -192],
			id: "65312cc9-b31e-4ad3-b5b9-7ccfe066f0fb",
			name: "Aggregate"
		},
		{
			parameters: { jsCode: "const today = new Date().toISOString().slice(0, 10);\nconst daily = $json.daily;\nconst index = daily.time.indexOf(today);\n\nif (index === -1) {\n  throw new Error(\"Today's forecast not found in response.\");\n}\n\nreturn [{\n  date: today,\n  temp_max: daily.temperature_2m_max[index],\n  temp_min: daily.temperature_2m_min[index]\n}];\n" },
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [224, -16],
			id: "8defc8b4-a50f-41ff-bfb0-bd114e5fcd7c",
			name: "Get today's high and low"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.limit",
			typeVersion: 1,
			position: [-112, -16],
			id: "a346a114-2981-4c82-91a5-4656b345b0d1",
			name: "Limit"
		},
		{
			parameters: {
				content: "### Bonus task!\n\nUse the `Gmail node` to send the workflow result via email:\n\n1. Connect the \"output\" node to the Gmail node\n2. Create your credentials to connect to Gmail ",
				height: 448,
				width: 288,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [1168, -464],
			id: "5398ab1d-4d6b-4308-8129-a3e1ebe7c11c",
			name: "Sticky Note5"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.manualTrigger",
			typeVersion: 1,
			position: [-1008, -192],
			id: "e378d189-974a-4d8e-a5bc-dd84fe4bc1c1",
			name: "1. Click 'Execute workflow’",
			notesInFlow: false,
			notes: "\n"
		},
		{
			parameters: {
				content: "## ▶ Start here \n\n1. Click the orange `Execute Worfklow` button \n2. Double-click nodes to view data flows\n3. Try changing variables in `Set your location` node (e.g. set location to London instead of Berlin)",
				height: 416,
				width: 336,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-1136, -416],
			id: "6ef3cee5-4c05-4611-9372-233b89aedbb9",
			name: "Sticky Note6"
		},
		{
			parameters: {
				content: "The `Set nodes` below define variables used later  in the workflow:\n\n1. Today’s day and month\n2. Currency: EUR to USD\n3. Location: Berlin",
				height: 784,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-720, -624],
			id: "8d1e0f28-328c-46e7-86a4-d7a063eab933",
			name: "Sticky Note"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "904f0394-6f4a-498f-98a7-b0526dfd63f0",
					name: "current month",
					value: "={{$now.format('M')}}",
					type: "string"
				}, {
					id: "c4fd79aa-e889-49c1-86f1-4e5ad672048f",
					name: "current day",
					value: "={{$now.format('d')}}",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [-640, -384],
			id: "503e303a-99ca-4a88-885b-2738f2067aac",
			name: "Set current day and month"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "8c17e5ba-1747-46e3-ae41-8f1e9046aa7a",
					name: "Convert from currency",
					value: "EUR",
					type: "string"
				}, {
					id: "e14ae5dd-7559-4e14-8e25-e627f11d8094",
					name: "Convert to currency",
					value: "USD",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [-640, -192],
			id: "bc6f48f0-21a1-417a-9724-64eafce2ec1f",
			name: "Set exchange currency"
		},
		{
			parameters: {
				content: "The `HTTP nodes` below call separate APIs using the previously defined variables to retrieve:\n\n1. Historical events on the same day/month\n2. Currency exchange rate\n3. Weather data ",
				height: 784,
				width: 256,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-416, -624],
			id: "02b09b86-be1b-47fd-b083-ee6c31b5a83f",
			name: "Sticky Note1"
		},
		{
			parameters: {
				url: "=http://numbersapi.com/{{ $json[\"current month\"] }}/{{ $json[\"current day\"] }}/date?json",
				options: {}
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-336, -384],
			id: "0cb9f4df-42db-49b8-b545-e3a7bad28a8f",
			name: "Get a historical fact"
		},
		{
			parameters: {
				url: "=https://api.frankfurter.dev/v1/latest?base={{ $json['Convert from currency'] }}&symbols={{ $json['Convert to currency'] }}",
				options: {}
			},
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [-336, -192],
			id: "df332c72-8600-4458-a40f-020422bf7818",
			name: "Get exchange rates"
		},
		{
			parameters: {
				content: "These nodes are explained in the previous workflow:  \n▶ 3. Check weather based on user location",
				height: 80,
				width: 480,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-128, 144],
			id: "e3c29b04-39d5-4d4d-9021-f4eb26e54d95",
			name: "Sticky Note7"
		},
		{
			parameters: {
				content: "The `Merge` node combines data from the 3  streams, once data for all streams is available.",
				height: 352,
				width: 224,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [352, -368],
			id: "02c84a53-c933-4ad7-a0ce-9a53fbd6b407",
			name: "Sticky Note2"
		},
		{
			parameters: {
				content: "The `Aggregate` node take the 3 separate items and  groups them together into a single item.",
				height: 352,
				width: 208,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [624, -368],
			id: "0ce70667-9587-49d5-96b3-d477fef517b1",
			name: "Sticky Note3"
		},
		{
			parameters: {
				content: "The `Set node` let us pick the data",
				height: 352,
				width: 192,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [880, -368],
			id: "3587d9df-9ccc-462f-a4b6-e2b3ddaa0e89",
			name: "Sticky Note8"
		},
		{
			parameters: {
				assignments: { assignments: [
					{
						id: "4b651566-5b0d-4f7e-b1d4-ea95dee7fbb5",
						name: "On this day",
						value: "={{ $json.data[0].text }}",
						type: "string"
					},
					{
						id: "cef5bfc7-be8b-4ac4-911d-2b9721c8666d",
						name: "Exchange rate",
						value: "={{ $json.data[1].rates[$(\"Set exchange currency\").item.json[\"Convert to currency\"]] }}",
						type: "string"
					},
					{
						id: "02358dea-7351-49ea-923c-9695ba7003c8",
						name: "Daily high",
						value: "={{ $json.data[2].temp_max }}°C",
						type: "string"
					},
					{
						id: "a8886281-896b-4713-82dd-8a1573b3d1df",
						name: "Daily low",
						value: "={{ $json.data[2].temp_min }}°C",
						type: "string"
					}
				] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [928, -192],
			id: "cef89e73-fa8b-48c1-ad2d-293ac61be2ff",
			name: "Select output for the email"
		},
		{
			parameters: {
				content: "**Tip: Use credentials**\nAdd [credentials](https://docs.n8n.io/credentials) in n8n to connect apps like Gmail, Slack, or OpenAI and use them in your workflows.",
				height: 112,
				width: 288,
				color: 5
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [1168, 16],
			id: "14969990-acce-46f3-a1ab-219ab4a1a858",
			name: "Sticky Note9"
		},
		{
			parameters: {
				subject: "Daily fact and data",
				emailType: "text",
				message: "=Hey,\n\nToday in {{ $('Set your location').item.json.City }}:\n- Daily high: {{ $json['Daily high'] }}\n- Daily low: {{ $json['Daily low'] }}\n\n{{ $('Set exchange currency').item.json['Convert from currency'] }} to {{ $('Set exchange currency').item.json['Convert to currency'] }} exchange rate: {{ $json['Exchange rate'] }}\n\nImpress your colleagues by reminding them that: {{ $json['On this day'] }}\n\n(Historical fact generated by numbersapi.com)\n",
				options: {}
			},
			type: "n8n-nodes-base.gmail",
			typeVersion: 2.1,
			position: [1264, -192],
			id: "4a23b2b5-21f7-4a63-a1ab-9f18d6ce2e6a",
			name: "Send output via email using Gmail",
			webhookId: "65c7b462-bb4a-400c-a556-ef408efcd208",
			notesInFlow: true,
			notes: "Double-click here to connect!"
		}
	],
	pinData: {},
	connections: {
		"Get city latitude and longitude": { main: [[{
			node: "Limit",
			type: "main",
			index: 0
		}]] },
		"Get weather": { main: [[{
			node: "Get today's high and low",
			type: "main",
			index: 0
		}]] },
		"Set your location": { main: [[{
			node: "Get city latitude and longitude",
			type: "main",
			index: 0
		}]] },
		Merge: { main: [[{
			node: "Aggregate",
			type: "main",
			index: 0
		}]] },
		Aggregate: { main: [[{
			node: "Select output for the email",
			type: "main",
			index: 0
		}]] },
		"Get today's high and low": { main: [[{
			node: "Merge",
			type: "main",
			index: 2
		}]] },
		Limit: { main: [[{
			node: "Get weather",
			type: "main",
			index: 0
		}]] },
		"1. Click 'Execute workflow’": { main: [[
			{
				node: "Set current day and month",
				type: "main",
				index: 0
			},
			{
				node: "Set your location",
				type: "main",
				index: 0
			},
			{
				node: "Set exchange currency",
				type: "main",
				index: 0
			}
		]] },
		"Set current day and month": { main: [[{
			node: "Get a historical fact",
			type: "main",
			index: 0
		}]] },
		"Set exchange currency": { main: [[{
			node: "Get exchange rates",
			type: "main",
			index: 0
		}]] },
		"Get a historical fact": { main: [[{
			node: "Merge",
			type: "main",
			index: 0
		}]] },
		"Get exchange rates": { main: [[{
			node: "Merge",
			type: "main",
			index: 1
		}]] },
		"Select output for the email": { main: [[]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store.ts
init_runtime_core_esm_bundler();
var LOCAL_STORAGE_SETTING_KEY = "N8N_READY_TO_RUN_WORKFLOWS_DISMISSED";
var useReadyToRunWorkflowsStore = defineStore(STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS, () => {
	const telemetry = useTelemetry();
	const i18n = useI18n();
	const foldersStore = useFoldersStore();
	const workflowsStore = useWorkflowsStore();
	const posthogStore = usePostHog();
	const cloudPlanStore = useCloudPlanStore();
	const isFeatureEnabled = computed(() => {
		const variant = posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name);
		return [
			BATCH_11AUG_EXPERIMENT.variantReadyToRun,
			BATCH_11AUG_EXPERIMENT.variantReadyToRun2,
			BATCH_11AUG_EXPERIMENT.variantReadyToRun3
		].some((readyToRunVariant) => readyToRunVariant === variant) && cloudPlanStore.userIsTrialing;
	});
	const calloutDismissedRef = useLocalStorage(LOCAL_STORAGE_SETTING_KEY, false);
	const isCalloutDismissed = computed(() => calloutDismissedRef.value);
	const dismissCallout = () => {
		calloutDismissedRef.value = true;
	};
	const trackCreateWorkflows = (source) => {
		telemetry.track("User created ready to run workflows", { source });
	};
	const trackDismissCallout = () => {
		telemetry.track("User dismissed ready to run workflows callout");
	};
	const trackOpenWorkflow = (template) => {
		telemetry.track("User opened ready to run workflow", { template });
	};
	const trackExecuteWorkflow = (template, status) => {
		telemetry.track("User executed ready to run workflow", {
			template,
			status
		});
	};
	function getCardText() {
		switch (posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name)) {
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun: return i18n.baseText("workflows.readyToRunWorkflows.card");
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun2: return i18n.baseText("workflows.readyToRunWorkflows.card2");
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun3: return i18n.baseText("workflows.readyToRunWorkflows.card3");
			default: return "";
		}
	}
	function getCalloutText() {
		switch (posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name)) {
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun: return i18n.baseText("workflows.readyToRunWorkflows.callout");
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun2: return i18n.baseText("workflows.readyToRunWorkflows.callout2");
			case BATCH_11AUG_EXPERIMENT.variantReadyToRun3: return i18n.baseText("workflows.readyToRunWorkflows.callout3");
			default: return "";
		}
	}
	const createWorkflows = async (projectId, parentFolderId) => {
		const collectionFolder = await foldersStore.createFolder(i18n.baseText("workflows.readyToRunWorkflows.folder.name"), projectId, parentFolderId);
		const playground1 = {
			...PLAYGROUND_1,
			parentFolderId: collectionFolder.id
		};
		const playground2 = {
			...PLAYGROUND_2,
			parentFolderId: collectionFolder.id
		};
		const playground3 = {
			...PLAYGROUND_3,
			parentFolderId: collectionFolder.id
		};
		const playground4 = {
			...PLAYGROUND_4,
			parentFolderId: collectionFolder.id
		};
		await workflowsStore.createNewWorkflow(playground4);
		await workflowsStore.createNewWorkflow(playground3);
		await workflowsStore.createNewWorkflow(playground2);
		await workflowsStore.createNewWorkflow(playground1);
		dismissCallout();
		return collectionFolder;
	};
	return {
		isFeatureEnabled,
		isCalloutDismissed,
		createWorkflows,
		dismissCallout,
		trackCreateWorkflows,
		trackDismissCallout,
		trackOpenWorkflow,
		trackExecuteWorkflow,
		getCardText,
		getCalloutText
	};
});
//#endregion
export { useReadyToRunWorkflowsStore as t };
