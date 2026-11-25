import { $d as init_runtime_core_esm_bundler, Rd as computed, Vu as useLocalStorage, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { EA as STORES, Od as useWorkflowsStore, hC as useTelemetry, jN as useI18n, oc as useFoldersStore, vy as usePostHog, yC as useSettingsStore, zS as TEMPLATE_ONBOARDING_EXPERIMENT } from "./app-D5flEmb-.js";
//#region src/experiments/aiTemplatesStarterCollection/workflows/1_agent_with_memory.ts
var AGENT_WITH_MEMORY = {
	meta: { templateId: "035_template_onboarding-agent_with_memory" },
	name: "1. Agent with memory",
	nodes: [
		{
			id: "536fa635-c0c8-4fd1-84ef-d19585be64cf",
			name: "When chat message received",
			webhookId: "9baee3d2-b9cb-4333-b4d5-3b07db8da9b2",
			type: "@n8n/n8n-nodes-langchain.chatTrigger",
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { options: {} }
		},
		{
			id: "1393095b-ec84-4514-b481-432609d1a5c5",
			name: "AI Agent",
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 2.1,
			position: [208, 0],
			parameters: { options: { systemMessage: "=You are a helpful assistant\n\nTodays date: {{ $now }}" } }
		},
		{
			id: "658eb127-5a9d-4404-9270-72ef1da36ea3",
			name: "Sticky Note",
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-464, -32],
			parameters: {
				content: "### Readme\nChat with an AI agent that remembers your previous messages during a conversation.\n\n**Quick Start**\n1. Open the **Model** node to claim your free API credits and connect to OpenAI. \n2. Click the **Open chat** button to start talking to the agent. Provide it with some information to remember, like your name.\n3. Ask a follow-up question about the information you shared: \"What's my name?\"\n\n---\n\n**Learn More**\n- [AI Agent node documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)\n- [Simple Memory node documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/)",
				height: 396,
				width: 392,
				color: 4
			}
		},
		{
			id: "186173c3-d043-4485-b939-9fca3d1e906f",
			name: "Model",
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.2,
			position: [160, 240],
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-4.1-mini"
				},
				options: {}
			}
		},
		{
			id: "dadaaa19-8378-4e23-9573-f9d3ff52c884",
			name: "Memory",
			type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
			typeVersion: 1.3,
			position: [352, 240],
			parameters: {}
		}
	],
	connections: {
		"When chat message received": { main: [[{
			node: "AI Agent",
			type: "main",
			index: 0
		}]] },
		Model: { ai_languageModel: [[{
			node: "AI Agent",
			type: "ai_languageModel",
			index: 0
		}]] },
		Memory: { ai_memory: [[{
			node: "AI Agent",
			type: "ai_memory",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/aiTemplatesStarterCollection/workflows/2_agent_with_tools.ts
var AGENT_WITH_TOOLS = {
	meta: { templateId: "035_template_onboarding-agent_with_tools" },
	name: "2. Agent with tools",
	nodes: [
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.chatTrigger",
			typeVersion: 1.1,
			position: [-48, -16],
			id: "f6c9fe3c-cbde-4514-9fcf-9d618526965c",
			name: "When chat message received",
			webhookId: "1bf95244-fbc3-4210-9420-f34a45c4f5f5"
		},
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 2.1,
			position: [208, -16],
			id: "5db1043f-de79-425a-a66b-8288c3aaa7df",
			name: "AI Agent"
		},
		{
			parameters: {},
			type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
			typeVersion: 1.3,
			position: [208, 288],
			id: "29f1ba2f-7511-4771-958a-be6463a64d83",
			name: "Simple Memory"
		},
		{
			parameters: {
				operation: "update",
				documentId: {
					__rl: true,
					value: "1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8",
					mode: "list",
					cachedResultName: "Demo",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk"
				},
				sheetName: {
					__rl: true,
					value: "gid=0",
					mode: "list",
					cachedResultName: "Sheet1",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0"
				},
				columns: {
					mappingMode: "defineBelow",
					value: {
						ID: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('ID__using_to_match_', ``, 'string') }}",
						Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}"
					},
					matchingColumns: ["ID"],
					schema: [
						{
							id: "ID",
							displayName: "ID",
							required: false,
							defaultMatch: false,
							display: true,
							type: "string",
							canBeUsedToMatch: true,
							removed: false
						},
						{
							id: "Name",
							displayName: "Name",
							required: false,
							defaultMatch: false,
							display: true,
							type: "string",
							canBeUsedToMatch: true,
							removed: false
						},
						{
							id: "row_number",
							displayName: "row_number",
							required: false,
							defaultMatch: false,
							display: true,
							type: "number",
							canBeUsedToMatch: true,
							readOnly: true,
							removed: true
						}
					],
					attemptToConvertTypes: false,
					convertFieldsToString: false
				},
				options: {}
			},
			type: "n8n-nodes-base.googleSheetsTool",
			typeVersion: 4.6,
			position: [656, 640],
			id: "24d82ca2-b666-415b-9020-f88cf3e095e6",
			name: "Update",
			credentials: {}
		},
		{
			parameters: {
				operation: "append",
				documentId: {
					__rl: true,
					value: "1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8",
					mode: "list",
					cachedResultName: "Demo",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk"
				},
				sheetName: {
					__rl: true,
					value: "gid=0",
					mode: "list",
					cachedResultName: "Sheet1",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0"
				},
				columns: {
					mappingMode: "defineBelow",
					value: {
						ID: "={{ `${Math.random()}`.replace('0.', '') }}",
						Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}"
					},
					matchingColumns: ["ID"],
					schema: [
						{
							id: "ID",
							displayName: "ID",
							required: false,
							defaultMatch: false,
							display: true,
							type: "string",
							canBeUsedToMatch: true,
							removed: false
						},
						{
							id: "Name",
							displayName: "Name",
							required: false,
							defaultMatch: false,
							display: true,
							type: "string",
							canBeUsedToMatch: true,
							removed: false
						},
						{
							id: "row_number",
							displayName: "row_number",
							required: false,
							defaultMatch: false,
							display: true,
							type: "number",
							canBeUsedToMatch: true,
							readOnly: true,
							removed: true
						}
					],
					attemptToConvertTypes: false,
					convertFieldsToString: false
				},
				options: {}
			},
			type: "n8n-nodes-base.googleSheetsTool",
			typeVersion: 4.6,
			position: [464, 640],
			id: "a0554e4a-8a7a-480c-a9e6-5f9746252cdb",
			name: "Create",
			credentials: {}
		},
		{
			parameters: {
				documentId: {
					__rl: true,
					value: "1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8",
					mode: "list",
					cachedResultName: "Demo",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk"
				},
				sheetName: {
					__rl: true,
					value: "gid=0",
					mode: "list",
					cachedResultName: "Sheet1",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0"
				},
				options: {}
			},
			type: "n8n-nodes-base.googleSheetsTool",
			typeVersion: 4.6,
			position: [480, 288],
			id: "ef476f0d-bdfe-4f41-8690-fb270ed82469",
			name: "Read",
			credentials: {}
		},
		{
			parameters: {
				operation: "delete",
				documentId: {
					__rl: true,
					value: "1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8",
					mode: "list",
					cachedResultName: "Demo",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=drivesdk"
				},
				sheetName: {
					__rl: true,
					value: "gid=0",
					mode: "list",
					cachedResultName: "Sheet1",
					cachedResultUrl: "https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit#gid=0"
				},
				startIndex: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start_Row_Number', ``, 'number') }}",
				numberToDelete: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Number_of_Rows_to_Delete', ``, 'number') }}"
			},
			type: "n8n-nodes-base.googleSheetsTool",
			typeVersion: 4.6,
			position: [864, 640],
			id: "d0cca35f-9e74-4935-92e2-9b5e37f1c7f4",
			name: "Delete",
			credentials: {}
		},
		{
			parameters: {
				content: "### Readme\nThis agent uses tools to interact with a simple spreadsheet of orders.\n\n**Quick Start**\n1. Copy this [spreadsheet](https://docs.google.com/spreadsheets/d/1vbFb2dhys1VafAmX-hRtiyrEDgNKj_xaAA6ZmH09EL8/edit?usp=sharing) into your Google Drive.\n2. Open the **Read** tool and connect your Google account by creating a credential and selecting the spreadsheet.\n3. Ask the Agent to calculate the total in the amount column, you should see it use the **Read** tool followed by the **Calculator**.\n4. Try some other questions and see how the agent responds.\n5. Use what you've learned to connect the other tools in the **Next steps** section.\n\n---\n\n**Learn More**\n- [Google sheet tool documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.googleSheetsTool)\n- [Calculator tool documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcalculator/)",
				height: 460,
				width: 440,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			position: [-576, -32],
			typeVersion: 1,
			id: "e57c1fe3-3ef9-447c-81e3-bdf8717706b9",
			name: "Sticky Note"
		},
		{
			parameters: {},
			type: "@n8n/n8n-nodes-langchain.toolCalculator",
			typeVersion: 1,
			position: [624, 288],
			id: "49030d8b-0818-455b-a472-356b620566c4",
			name: "Calculator"
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-4.1-mini"
				},
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.2,
			position: [48, 288],
			id: "67c78b12-b088-41b4-aeb4-70a7f056c9a7",
			name: "Model",
			credentials: {}
		},
		{
			parameters: {
				content: "## 🛠️ Tools",
				height: 224,
				width: 368,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			position: [400, 224],
			typeVersion: 1,
			id: "14c03c2d-e0ea-4958-94c1-3598e5c273d9",
			name: "Sticky Note1"
		},
		{
			parameters: {
				content: "## 🛠️ Next steps\n\nConnect these tools to perform create, read and update actions on your order list.",
				height: 320,
				width: 592,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			position: [400, 496],
			typeVersion: 1,
			id: "a683cb43-e740-497e-bb01-edebfe39a832",
			name: "Sticky Note2"
		}
	],
	connections: {
		"When chat message received": { main: [[{
			node: "AI Agent",
			type: "main",
			index: 0
		}]] },
		"Simple Memory": { ai_memory: [[{
			node: "AI Agent",
			type: "ai_memory",
			index: 0
		}]] },
		Update: { ai_tool: [[]] },
		Create: { ai_tool: [[]] },
		Read: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		Delete: { ai_tool: [[]] },
		Calculator: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		Model: { ai_languageModel: [[{
			node: "AI Agent",
			type: "ai_languageModel",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/aiTemplatesStarterCollection/workflows/3_agent_with_knowledge.ts
var AGENT_WITH_KNOWLEDGE = {
	meta: { templateId: "035_template_onboarding-agent_with_knowledge" },
	name: "3. Agent with knowledge",
	nodes: [
		{
			parameters: {
				formTitle: "Upload your data to test RAG",
				formFields: { values: [{
					fieldLabel: "Upload your file(s)",
					fieldType: "file",
					acceptFileTypes: ".pdf, .csv",
					requiredField: true
				}] },
				options: {}
			},
			type: "n8n-nodes-base.formTrigger",
			typeVersion: 2.2,
			position: [-368, -304],
			id: "e45eaedc-7ed9-4fd6-b79b-82a155734bce",
			name: "Upload your file here",
			webhookId: "82848bc4-5ea2-4e5a-8bb6-3c09b94a8c5d"
		},
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
			typeVersion: 1.2,
			position: [288, 176],
			id: "f9f1745a-9c6d-42cf-8f8b-19a1c4c91b77",
			name: "Embeddings OpenAI"
		},
		{
			parameters: {
				dataType: "binary",
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
			typeVersion: 1.1,
			position: [80, -144],
			id: "56da285f-9ad9-4cb4-a7d4-fb0f035e9071",
			name: "Default Data Loader"
		},
		{
			parameters: {
				content: "### Readme\nLoad your data into a vector database with the 📚 **Load Data** flow, and then use your data as chat context with the 🐕 **Retriever** flow.\n\n**Quick start**\n1. Click on the `Execute Workflow` button to run the 📚 **Load Data** flow.\n2. Click on `Open Chat` button to run the 🐕 **Retriever** flow. Then ask a question about content from your document(s)\n\n\nFor more info, check [our docs on RAG in n8n](https://docs.n8n.io/advanced-ai/rag-in-n8n/).",
				height: 300,
				width: 440,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			position: [-896, -368],
			typeVersion: 1,
			id: "72cb28c7-572b-41ce-ba4c-2dd0dc80acb4",
			name: "Sticky Note"
		},
		{
			parameters: {
				content: "### 📚 Load Data Flow",
				height: 460,
				width: 700,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			position: [-416, -368],
			typeVersion: 1,
			id: "075a4895-8b5f-487b-b7ff-8766aa1d1450",
			name: "Sticky Note1"
		},
		{
			parameters: {
				mode: "insert",
				memoryKey: {
					__rl: true,
					value: "vector_store_key",
					mode: "list",
					cachedResultName: "vector_store_key"
				}
			},
			type: "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
			typeVersion: 1.2,
			position: [-176, -304],
			id: "d24732cb-b6b4-4eb6-ad47-1f290f0da13d",
			name: "Insert Data to Store"
		},
		{
			parameters: {
				mode: "retrieve-as-tool",
				toolName: "knowledge_base",
				toolDescription: "Use this knowledge base to answer questions from the user",
				memoryKey: {
					__rl: true,
					mode: "list",
					value: "vector_store_key"
				}
			},
			type: "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
			typeVersion: 1.2,
			position: [704, -96],
			id: "8915e9b6-2a6c-472c-b043-78c1d77888ae",
			name: "Query Data Tool"
		},
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 2,
			position: [704, -320],
			id: "a2baaa1d-beee-40a2-8b5f-757b2b1aaca9",
			name: "AI Agent"
		},
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.chatTrigger",
			typeVersion: 1.1,
			position: [480, -320],
			id: "c0a831dd-362c-4352-9409-bfe8c2e6f5ab",
			name: "When chat message received",
			webhookId: "4091fa09-fb9a-4039-9411-7104d213f601"
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-4o-mini"
				},
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.2,
			position: [480, -96],
			id: "2ba103b5-7783-49a7-9693-a156383ca697",
			name: "OpenAI Chat Model"
		},
		{
			parameters: {
				content: "### 🐕 2. Retriever Flow",
				height: 460,
				width: 680,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			position: [368, -368],
			typeVersion: 1,
			id: "729f9492-3811-43d8-8230-d9ad78d910f7",
			name: "Sticky Note2"
		},
		{
			parameters: {
				content: "### Embeddings\n\nThe Insert and Retrieve operation use the same embedding node.\n\nThis is to ensure that they are using the **exact same embeddings and settings**.\n\nDifferent embeddings might not work at all, or have unintended consequences.\n",
				height: 240,
				width: 320,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			position: [432, 144],
			typeVersion: 1,
			id: "20a6b946-5588-4df2-b1f6-952fc82d166c",
			name: "Sticky Note3"
		}
	],
	connections: {
		"Upload your file here": { main: [[{
			node: "Insert Data to Store",
			type: "main",
			index: 0
		}]] },
		"Embeddings OpenAI": { ai_embedding: [[{
			node: "Insert Data to Store",
			type: "ai_embedding",
			index: 0
		}, {
			node: "Query Data Tool",
			type: "ai_embedding",
			index: 0
		}]] },
		"Default Data Loader": { ai_document: [[{
			node: "Insert Data to Store",
			type: "ai_document",
			index: 0
		}]] },
		"Query Data Tool": { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"When chat message received": { main: [[{
			node: "AI Agent",
			type: "main",
			index: 0
		}]] },
		"OpenAI Chat Model": { ai_languageModel: [[{
			node: "AI Agent",
			type: "ai_languageModel",
			index: 0
		}]] }
	},
	pinData: {}
};
//#endregion
//#region src/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store.ts
init_runtime_core_esm_bundler();
var LOCAL_STORAGE_SETTING_KEY = "N8N_AI_TEMPLATES_STARTER_COLLECTION_CALL_OUT_DISMISSED";
var useAITemplatesStarterCollectionStore = defineStore(STORES.AI_TEMPLATES_STARTER_COLLECTION, () => {
	const telemetry = useTelemetry();
	const i18n = useI18n();
	const foldersStore = useFoldersStore();
	const workflowsStore = useWorkflowsStore();
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();
	const calloutDismissedRef = useLocalStorage(LOCAL_STORAGE_SETTING_KEY, false);
	const calloutDismissed = computed(() => calloutDismissedRef.value);
	const isFeatureEnabled = computed(() => {
		return settingsStore.isCloudDeployment && posthogStore.getVariant(TEMPLATE_ONBOARDING_EXPERIMENT.name) === TEMPLATE_ONBOARDING_EXPERIMENT.variantStarterPack;
	});
	const dismissCallout = () => {
		calloutDismissedRef.value = true;
	};
	const createStarterWorkflows = async (projectId, parentFolderId) => {
		const collectionFolder = await foldersStore.createFolder(i18n.baseText("workflows.ai.starter.collection.folder.name"), projectId, parentFolderId);
		const agentWitheMemory = {
			...AGENT_WITH_MEMORY,
			parentFolderId: collectionFolder.id
		};
		const agentWithTools = {
			...AGENT_WITH_TOOLS,
			parentFolderId: collectionFolder.id
		};
		const agentWithKnowledge = {
			...AGENT_WITH_KNOWLEDGE,
			parentFolderId: collectionFolder.id
		};
		await workflowsStore.createNewWorkflow(agentWithKnowledge);
		await workflowsStore.createNewWorkflow(agentWithTools);
		await workflowsStore.createNewWorkflow(agentWitheMemory);
		dismissCallout();
		return collectionFolder;
	};
	const trackUserCreatedStarterCollection = (source) => {
		telemetry.track("User created AI templates starter collection", { source });
	};
	const trackUserDismissedCallout = () => {
		telemetry.track("User dismissed AI templates starter collection callout");
	};
	const trackUserOpenedWorkflow = (template) => {
		telemetry.track("User opened AI template workflow", { template });
	};
	const trackUserExecutedWorkflow = (template, status) => {
		telemetry.track("User executed AI template", {
			template,
			status
		});
	};
	return {
		isFeatureEnabled,
		calloutDismissed,
		dismissCallout,
		createStarterWorkflows,
		trackUserCreatedStarterCollection,
		trackUserDismissedCallout,
		trackUserOpenedWorkflow,
		trackUserExecutedWorkflow
	};
});
//#endregion
export { useAITemplatesStarterCollectionStore as t };
