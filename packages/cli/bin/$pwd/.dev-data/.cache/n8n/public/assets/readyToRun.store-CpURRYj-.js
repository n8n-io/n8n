import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Rf as onScopeDispose, Tf as watch, Vf as ref, Vu as useLocalStorage, Xo as useRouter, Yo as useRoute, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { EA as STORES, Ik as deepCopy, Mp as useCredentialsStore, Od as useWorkflowsStore, PS as READY_TO_RUN_V2_P3_EXPERIMENT, Uo as listAgentsPageGlobal, _C as useUsersStore, bC as useRootStore, cm as useEnvironmentsStore, dC as useToast, fC as VIEWS, hC as useTelemetry, jN as useI18n, mC as useCloudPlanStore, oc as useFoldersStore, sA as OPEN_AI_API_CREDENTIAL_TYPE, vy as usePostHog, xu as useDataTableStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
//#region src/features/workflows/readyToRun/workflows/aiWorkflow.ts
var READY_TO_RUN_AI_WORKFLOW = {
	name: "AI Agent workflow",
	meta: { templateId: "ready-to-run-ai-workflow" },
	nodes: [
		{
			parameters: {
				url: "https://www.theverge.com/rss/index.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [128, 448],
			id: "a26f16ce-82a5-4392-a032-622467e0098f",
			name: "Get Tech News"
		},
		{
			parameters: {
				toolDescription: "Reads the news",
				url: "=https://feeds.bbci.co.uk/news/world/rss.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [272, 448],
			id: "91d1a929-b913-4399-977a-4306fe8349c7",
			name: "Get World News"
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-5.6-luna"
				},
				responsesApiEnabled: true,
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.3,
			position: [-144, 448],
			id: "482c5e90-74ea-424c-9ec3-1dc14dd460f9",
			name: "OpenAI Model",
			notesInFlow: true,
			credentials: {},
			notes: "Free n8n credits "
		},
		{
			parameters: {
				promptType: "define",
				text: "=Provide a summary of world and tech news from the last 24 hours. \n\n- Use the headings \"World News\" and \"Tech News.\" \n- Exclude comments, insights, and any news that is considered sad or distressing. \n- Include up to 10 concise bullet points, prioritizing major events and developments. \n- Focus on key developments from credible sources.\n- Consider today to be {{ $today }}. \n",
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 3.1,
			position: [-144, 192],
			id: "62d75a96-d7de-4618-a79e-1ca945e5db3e",
			name: "AI Summary Agent",
			notesInFlow: true,
			notes: "Double-click to open"
		},
		{
			parameters: {
				content: "✅ This demo workflow is ready to use\n✨ We gave you free OpenAI credits to play with",
				height: 256,
				width: 400,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-672, 112],
			id: "0b71e8e9-e824-46a0-b1da-df4827ef6954",
			name: "Sticky Note2"
		},
		{
			parameters: {
				subject: "Your news daily summary",
				emailType: "text",
				message: "={{ $json.output }}",
				options: {}
			},
			type: "n8n-nodes-base.gmail",
			typeVersion: 2.1,
			position: [688, 192],
			id: "a7f201ba-9d35-4d4e-a425-77bda8a4d2cf",
			name: "Send summary with Gmail",
			webhookId: "e0c46fef-51f3-4a8d-8aaf-b6e17ea89346",
			notesInFlow: true,
			notes: "Double-click to open"
		},
		{
			parameters: {
				content: "### ✨ Bonus step \nSend the news summary via email. Open the node and connect your Gmail account [(= new credential)](https://www.youtube.com/shorts/2K6ltfI4YRg)",
				height: 96,
				width: 384,
				color: 7
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [544, 48],
			id: "72b95793-9f63-4fe0-aebc-8ca0d3796e9b",
			name: "Sticky Note"
		},
		{
			parameters: {
				assignments: { assignments: [{
					id: "85b5c530-2c13-4424-ab83-05979bc879a5",
					name: "output",
					value: "={{ $json.output }}",
					type: "string"
				}] },
				options: {}
			},
			type: "n8n-nodes-base.set",
			typeVersion: 3.4,
			position: [256, 192],
			id: "346ea905-9762-4349-8b8b-3cb137837fda",
			name: "Output (News summary)",
			notesInFlow: true,
			notes: "Double-click to open"
		},
		{
			parameters: {},
			type: "n8n-nodes-base.manualTrigger",
			typeVersion: 1,
			position: [-432, 192],
			id: "909e2605-386c-46bc-acff-97f132431d92",
			name: "Workflow trigger"
		}
	],
	connections: {
		"Get Tech News": { ai_tool: [[{
			node: "AI Summary Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"Get World News": { ai_tool: [[{
			node: "AI Summary Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"OpenAI Model": { ai_languageModel: [[{
			node: "AI Summary Agent",
			type: "ai_languageModel",
			index: 0
		}]] },
		"AI Summary Agent": { main: [[{
			node: "Output (News summary)",
			type: "main",
			index: 0
		}]] },
		"Output (News summary)": { main: [[]] },
		"Workflow trigger": { main: [[{
			node: "AI Summary Agent",
			type: "main",
			index: 0
		}]] }
	},
	pinData: {}
};
//#endregion
//#region src/features/agents/agentList.store.ts
init_reactivity_esm_bundler();
var useAgentListStore = defineStore("agentList", () => {
	const rootStore = useRootStore();
	const totalCount = ref();
	async function fetchTotalCount() {
		const { count } = await listAgentsPageGlobal(rootStore.restApiContext, { limit: 1 });
		totalCount.value = count;
	}
	return {
		totalCount,
		fetchTotalCount
	};
});
//#endregion
//#region src/features/workflows/readyToRun/composables/useEmptyStateDetection.ts
init_runtime_core_esm_bundler();
/**
* Determines if the instance is truly empty and should show the simplified layout
*/
function useEmptyStateDetection() {
	const agentListStore = useAgentListStore();
	const settingsStore = useSettingsStore();
	const foldersStore = useFoldersStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const dataTableStore = useDataTableStore();
	const projectPages = useProjectPages();
	const route = useRoute();
	/**
	* Any store already showing content is enough to keep instant chrome.
	* Readiness-agnostic by design: counts that haven't loaded yet read as
	* "no known content", which callers use to defer chrome until resolved.
	*/
	const hasKnownInstanceContent = computed(() => foldersStore.totalWorkflowCount > 0 || credentialsStore.allCredentials.length > 0 || environmentsStore.variables.length > 0 || dataTableStore.totalCount > 0 || settingsStore.isAgentsEnabled && (agentListStore.totalCount ?? 0) > 0);
	/**
	* Checks if the current state qualifies as "truly empty"
	* - No workflows exist in the instance
	* - No credentials exist in the instance
	* - No variables exist in the instance
	* - No data tables exist in the instance
	* - No agents exist, or agents are disabled
	* - User is on the main workflows view (not in a specific folder)
	* - User is on overview page or personal project workflows
	* - No search filters are applied
	* - Not currently refreshing data
	*/
	const isTrulyEmpty = (currentRoute = route) => {
		const hasNoWorkflows = foldersStore.workflowsCountLoaded && foldersStore.totalWorkflowCount === 0;
		const hasNoCredentials = credentialsStore.allCredentials.length === 0;
		const hasNoVariables = environmentsStore.variables.length === 0;
		const hasNoDataTables = dataTableStore.totalCount === 0;
		const hasNoAgents = !settingsStore.isAgentsEnabled || agentListStore.totalCount === 0;
		const isNotInSpecificFolder = !currentRoute.params?.folderId;
		const isMainWorkflowsPage = projectPages.isOverviewSubPage;
		const hasSearchQuery = !!currentRoute.query?.search;
		const hasFilters = !!(currentRoute.query?.status || currentRoute.query?.tags || currentRoute.query?.showArchived || currentRoute.query?.homeProject);
		return hasNoWorkflows && hasNoCredentials && hasNoVariables && hasNoDataTables && hasNoAgents && isNotInSpecificFolder && isMainWorkflowsPage && !hasSearchQuery && !hasFilters;
	};
	return {
		isTrulyEmpty,
		hasKnownInstanceContent
	};
}
//#endregion
//#region src/experiments/readyToRunWorkflowsV2/workflows/ai-workflow-v5.ts
var READY_TO_RUN_WORKFLOW_V5 = {
	name: "Chat with the news",
	meta: { templateId: "ready-to-run-ai-workflow-v5" },
	settings: { executionOrder: "v1" },
	nodes: [
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.chatTrigger",
			typeVersion: 1.4,
			position: [288, 0],
			id: "261ee04a-4695-4d1a-bec3-9f86b5efd5eb",
			name: "When chat message received",
			webhookId: "b567d98b-aabb-4963-b0f8-6b1e8b5f8959"
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-5.6-luna"
				},
				responsesApiEnabled: true,
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.3,
			position: [400, 288],
			id: "201ee441-da46-49fc-befa-312ad4b60479",
			name: "OpenAI Model",
			credentials: {}
		},
		{
			parameters: {},
			type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
			typeVersion: 1.3,
			position: [576, 288],
			id: "aa874554-17b1-41a1-9e1f-8c6c197e7e2f",
			name: "Simple Memory"
		},
		{
			parameters: {
				url: "https://hnrss.org/frontpage",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [1120, 288],
			id: "5788980c-2a63-40ed-a375-c68ca7a3b9c0",
			name: "Hackernews"
		},
		{
			parameters: {
				url: "https://www.theverge.com/rss/index.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [960, 288],
			id: "f250ef18-d913-4a76-a607-b1eeebcbab23",
			name: "TheVerge"
		},
		{
			parameters: {
				url: "https://feeds.bbci.co.uk/news/rss.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [800, 288],
			id: "0c375d2e-4b2d-4fa6-8b3e-31ac931117cb",
			name: "BBC News"
		},
		{
			parameters: {
				content: "✅ This AI News agent is ready to use. Chat with it! \n✨ We gave you free OpenAI credits\n💡 Learn [how to build](https://n8n.io/workflows/6270-build-your-first-ai-agent/) your own agent  ",
				height: 80,
				width: 448,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [0, -176],
			id: "052068ba-ea50-4521-9946-63ded13b23b0",
			name: "Sticky Note2"
		},
		{
			parameters: { options: { systemMessage: "=News Agent\n\n# Role\n\nYou are a concise, factual news assistant with access to these RSS tools:\n\n* BBC (Global news)\n* TheVerge (Consumer tech)\n* Hacker News (Tech discussions)\n\nYou always keep replies **short and focused (maximum 100 words total)**.\n\n# Behavior\n\n* On the first message only, greet the user and say you can search recent news.\n* When the user asks for news, always check all RSS tools and combine results from multiple feeds if relevant, but surface only the **top 1 to 5 most relevant items**.\n* Never invent information. Only use content found in the tools.\n\n# Answer Format\n\n* **Maximum 100 words per reply** (including any follow-up sentence).\n* Start with **one short intro sentence**.\n* Then provide **3–5 bullet points**, each a **single short sentence**.\n* Use short, clear sentences.\n* Add a link to the original article or source in at least one bullet.\n* Include a section **“Sources checked:”** listing the feeds used (e.g., “Sources checked: BBC, TheVerge”).\n\n# Edge Cases\n\n* If you find too little information, say so and suggest adding more news sources to the agent.\n* If the user asks you to build workflows or do non-news tasks, say you are only a news agent and point them to n8n’s AI Workflow Builder (✨ icon) and the docs: [https://docs.n8n.io/advanced-ai/ai-workflow-builder/](https://docs.n8n.io/advanced-ai/ai-workflow-builder/)\n* If the user asks for opinions or predictions, stay neutral and summarize facts only.\n* After sharing news results with the user for the first time, mention that they can also get AI-summarized news by email using this template: https://n8n.io/workflows/6270-build-your-first-ai-agent/. Only make this suggestion once in the entire chat history, not after every question (check your previous responses to make sure you don't repeat the suggestion).\n\n# Date\n\nToday is {{ $today }}\n" } },
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 3,
			position: [608, 0],
			id: "e481d1a1-3a3d-4583-98ae-87a9b39471a8",
			name: "AI Agent"
		}
	],
	pinData: {},
	connections: {
		"When chat message received": { main: [[{
			node: "AI Agent",
			type: "main",
			index: 0
		}]] },
		"OpenAI Model": { ai_languageModel: [[{
			node: "AI Agent",
			type: "ai_languageModel",
			index: 0
		}]] },
		"Simple Memory": { ai_memory: [[{
			node: "AI Agent",
			type: "ai_memory",
			index: 0
		}]] },
		Hackernews: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		TheVerge: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"BBC News": { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflowsV2/workflows/ai-workflow-v6.ts
var READY_TO_RUN_WORKFLOW_V6 = {
	name: "Chat with the news",
	meta: { templateId: "ready-to-run-ai-workflow-v6" },
	settings: { executionOrder: "v1" },
	nodes: [
		{
			parameters: { options: {} },
			type: "@n8n/n8n-nodes-langchain.chatTrigger",
			typeVersion: 1.4,
			position: [-160, 64],
			id: "6f4d9435-be4c-48a6-89a2-9a24cdf68d40",
			name: "When chat message received",
			webhookId: "b567d98b-aabb-4963-b0f8-6b1e8b5f8959"
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: "list",
					value: "gpt-5.6-luna"
				},
				responsesApiEnabled: true,
				options: {}
			},
			type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
			typeVersion: 1.3,
			position: [-16, 384],
			id: "f9b6e5c5-36d1-415f-9c5c-79fb79787207",
			name: "OpenAI Model",
			credentials: {}
		},
		{
			parameters: {},
			type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
			typeVersion: 1.3,
			position: [160, 384],
			id: "81e7b833-c47b-44f7-950d-8d035fcb2205",
			name: "Simple Memory"
		},
		{
			parameters: {
				url: "https://hnrss.org/frontpage",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [432, 384],
			id: "3677c36a-813b-407b-9fdc-38565c6f73e9",
			name: "Hackernews"
		},
		{
			parameters: {
				url: "https://www.theverge.com/rss/index.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [592, 384],
			id: "e1eaf4ea-0a02-44fd-b0c8-13505ad5bd22",
			name: "TheVerge"
		},
		{
			parameters: {
				url: "https://feeds.bbci.co.uk/news/rss.xml",
				options: {}
			},
			type: "n8n-nodes-base.rssFeedReadTool",
			typeVersion: 1.2,
			position: [752, 384],
			id: "ee0b9c96-e66d-47e3-9122-0ca998caf687",
			name: "BBC News"
		},
		{
			parameters: {
				content: "✅ This AI News agent is ready to use. Chat with it! \n✨ We gave you free OpenAI credits\n💡 Next: [Connect a Google Sheet](https://n8n.io/workflows/7449-talk-to-your-google-sheets-using-chatgpt-5/) to chat with your data",
				height: 80,
				width: 448,
				color: 4
			},
			type: "n8n-nodes-base.stickyNote",
			typeVersion: 1,
			position: [-416, -112],
			id: "99944422-2269-4952-bd31-715ec0eb5bb4",
			name: "Sticky Note2"
		},
		{
			parameters: {
				documentId: {
					__rl: true,
					mode: "list",
					value: ""
				},
				sheetName: {
					__rl: true,
					mode: "list",
					value: ""
				}
			},
			type: "n8n-nodes-base.googleSheetsTool",
			typeVersion: 4.7,
			position: [896, 384],
			id: "fc10c8a7-6621-4e7d-937f-6cb1e03bc057",
			name: "Google Sheets",
			credentials: {}
		},
		{
			parameters: { options: { systemMessage: "=News Agent\n\n# Role\n\nYou are a concise, factual news assistant with access to these RSS tools:\n\n* BBC (Global news)\n* TheVerge (Consumer tech)\n* Hacker News (Tech discussions)\n\nYou always keep replies **short and focused (maximum 100 words total)**.\n\n# Behavior\n\n* On the first message only, greet the user and say you can search recent news.\n* When the user asks for news, always check all RSS tools and combine results from multiple feeds if relevant, but surface only the **top 1 - 5 most relevant items**.\n* Never invent information. Only use content found in the tools.\n\n# Answer Format\n\n* **Maximum 100 words per reply** (including any follow-up sentence).\n* Start with **one short intro sentence**.\n* Then provide **3–5 bullet points**, each a **single short sentence**.\n* Use short, clear sentences.\n* Add a link to the original article or source in at least one bullet.\n\n# Edge Cases\n\n* If you find too little information, say so and suggest adding more news sources to the agent.\n* If the user asks you to build workflows or do non-news tasks, say you are only a news agent and point them to n8n’s AI Workflow Builder (✨ icon) and the docs: [https://docs.n8n.io/advanced-ai/ai-workflow-builder/](https://docs.n8n.io/advanced-ai/ai-workflow-builder/)\n* If the user asks for opinions or predictions, stay neutral and summarize facts only.\n* After sharing news results with the user for the first time, ask the user if they want to connect one of their Google Sheets so that they can chat with their own data. Only make this suggestion once in the entire chat history. If they say yes, provide these instructions:\n\n1. Connect the Google Sheets node to the AI Agent in the same way as the RSS nodes.\n2. Open the Google Sheets node and connect your Google account.\n3. Pick your Spreadsheet and Sheet from the dropdowns.\n\n\n# Date\n\nToday is {{ $today }}\n" } },
			type: "@n8n/n8n-nodes-langchain.agent",
			typeVersion: 3,
			position: [192, 64],
			id: "ce5dd204-b9d3-4455-ab0c-0c2ce314ad52",
			name: "AI Agent"
		}
	],
	pinData: {},
	connections: {
		"When chat message received": { main: [[{
			node: "AI Agent",
			type: "main",
			index: 0
		}]] },
		"OpenAI Model": { ai_languageModel: [[{
			node: "AI Agent",
			type: "ai_languageModel",
			index: 0
		}]] },
		"Simple Memory": { ai_memory: [[{
			node: "AI Agent",
			type: "ai_memory",
			index: 0
		}]] },
		Hackernews: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		TheVerge: { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"BBC News": { ai_tool: [[{
			node: "AI Agent",
			type: "ai_tool",
			index: 0
		}]] },
		"Google Sheets": { ai_tool: [[]] }
	}
};
//#endregion
//#region src/experiments/readyToRunWorkflowsV2/stores/readyToRunWorkflowsV2.store.ts
init_runtime_core_esm_bundler();
var useReadyToRunWorkflowsV2Store = defineStore(STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2, () => {
	const posthogStore = usePostHog();
	const cloudPlanStore = useCloudPlanStore();
	const currentVariant = computed(() => posthogStore.getVariant(READY_TO_RUN_V2_P3_EXPERIMENT.name));
	const isVariant5 = computed(() => currentVariant.value === READY_TO_RUN_V2_P3_EXPERIMENT.variant5);
	const isVariant6 = computed(() => currentVariant.value === READY_TO_RUN_V2_P3_EXPERIMENT.variant6);
	const isFeatureEnabled = computed(() => cloudPlanStore.userIsTrialing && (isVariant5.value || isVariant6.value));
	const getWorkflowForVariant = () => {
		if (!isFeatureEnabled.value) return;
		if (isVariant5.value) return READY_TO_RUN_WORKFLOW_V5;
		if (isVariant6.value) return READY_TO_RUN_WORKFLOW_V6;
	};
	return {
		currentVariant,
		getWorkflowForVariant,
		isFeatureEnabled
	};
});
//#endregion
//#region src/features/workflows/readyToRun/stores/readyToRun.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var LOCAL_STORAGE_CREDENTIAL_KEY = "N8N_READY_TO_RUN_OPENAI_CREDENTIAL_ID";
var useReadyToRunStore = defineStore(STORES.READY_TO_RUN, () => {
	const READY_TO_RUN_TEMPLATE_IDS = [
		"ready-to-run-ai-workflow",
		"ready-to-run-ai-workflow-v5",
		"ready-to-run-ai-workflow-v6"
	];
	const telemetry = useTelemetry();
	const i18n = useI18n();
	const toast = useToast();
	const router = useRouter();
	const credentialsStore = useCredentialsStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const readyToRunWorkflowsV2Store = useReadyToRunWorkflowsV2Store();
	const claimedCredentialIdRef = useLocalStorage(LOCAL_STORAGE_CREDENTIAL_KEY, "");
	const claimingCredits = ref(false);
	const userHasOpenAiCredentialAlready = computed(() => !!credentialsStore.allCredentials.filter((credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE).length);
	const userHasClaimedAiCreditsAlready = computed(() => !!usersStore.currentUser?.settings?.userClaimedAiCredits);
	const BUTTON_MAX_ACCOUNT_AGE_MS = 12096e5;
	const currentTimeForNewUserCheck = ref(Date.now());
	let newUserVisibilityTimeout;
	const clearNewUserVisibilityTimeout = () => {
		if (newUserVisibilityTimeout === void 0) return;
		clearTimeout(newUserVisibilityTimeout);
		newUserVisibilityTimeout = void 0;
	};
	const getCurrentUserCreatedAtMs = () => {
		const createdAt = usersStore.currentUser?.createdAt;
		if (!createdAt) return void 0;
		const createdAtMs = new Date(createdAt).getTime();
		return Number.isFinite(createdAtMs) ? createdAtMs : void 0;
	};
	const scheduleNewUserVisibilityRefresh = () => {
		clearNewUserVisibilityTimeout();
		const createdAtMs = getCurrentUserCreatedAtMs();
		if (createdAtMs === void 0) return;
		const msUntilThreshold = createdAtMs + BUTTON_MAX_ACCOUNT_AGE_MS - Date.now();
		if (msUntilThreshold <= 0) return;
		newUserVisibilityTimeout = setTimeout(() => {
			currentTimeForNewUserCheck.value = Date.now();
			newUserVisibilityTimeout = void 0;
		}, msUntilThreshold);
	};
	watch(() => usersStore.currentUser?.createdAt, () => {
		currentTimeForNewUserCheck.value = Date.now();
		scheduleNewUserVisibilityRefresh();
	}, { immediate: true });
	onScopeDispose(() => {
		clearNewUserVisibilityTimeout();
	});
	const isNewUser = () => {
		const createdAtMs = getCurrentUserCreatedAtMs();
		if (createdAtMs === void 0) return false;
		return currentTimeForNewUserCheck.value - createdAtMs < BUTTON_MAX_ACCOUNT_AGE_MS;
	};
	const userCanClaimOpenAiCredits = computed(() => {
		return settingsStore.isAiCreditsEnabled && !userHasOpenAiCredentialAlready.value && !userHasClaimedAiCreditsAlready.value;
	});
	const trackExecuteAiWorkflow = (status) => {
		telemetry.track("User executed ready to run AI workflow", { status });
	};
	const trackExecuteAiWorkflowSuccess = () => {
		telemetry.track("User executed ready to run AI workflow successfully");
	};
	const claimFreeAiCredits = async (projectId) => {
		claimingCredits.value = true;
		try {
			const credential = await credentialsStore.claimFreeAiCredits(projectId);
			claimedCredentialIdRef.value = credential.id;
			telemetry.track("User claimed OpenAI credits");
			return credential;
		} catch (e) {
			toast.showError(e, i18n.baseText("freeAi.credits.showError.claim.title"), { message: i18n.baseText("freeAi.credits.showError.claim.message") });
			throw e;
		} finally {
			claimingCredits.value = false;
		}
	};
	const getReadyToRunWorkflowTemplate = () => {
		return readyToRunWorkflowsV2Store.getWorkflowForVariant() ?? READY_TO_RUN_AI_WORKFLOW;
	};
	const createAndOpenAiWorkflow = async (source, parentFolderId) => {
		telemetry.track("User opened ready to run AI workflow", { source });
		try {
			let workflowToCreate = {
				...getReadyToRunWorkflowTemplate(),
				parentFolderId
			};
			const credentialId = claimedCredentialIdRef.value;
			if (credentialId && workflowToCreate.nodes) {
				const clonedWorkflow = deepCopy(workflowToCreate);
				const openAiNode = clonedWorkflow.nodes?.find((node) => node.name === "OpenAI Model");
				if (openAiNode) {
					openAiNode.credentials ??= {};
					openAiNode.credentials[OPEN_AI_API_CREDENTIAL_TYPE] = {
						id: credentialId,
						name: ""
					};
				}
				workflowToCreate = clonedWorkflow;
			}
			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);
			await router.push({
				name: VIEWS.WORKFLOW,
				params: { workflowId: createdWorkflow.id }
			});
			return createdWorkflow;
		} catch (error) {
			toast.showError(error, i18n.baseText("generic.error"));
			throw error;
		}
	};
	const claimCreditsAndOpenWorkflow = async (source, parentFolderId, projectId) => {
		await claimFreeAiCredits(projectId);
		await createAndOpenAiWorkflow(source, parentFolderId);
		if (usersStore?.currentUser?.settings) usersStore.currentUser.settings.userClaimedAiCredits = true;
	};
	const getCardVisibility = (canCreate, readOnlyEnv) => {
		return userCanClaimOpenAiCredits.value && !readOnlyEnv && canCreate;
	};
	const getButtonVisibility = (hasWorkflows, canCreate, readOnlyEnv) => {
		return userCanClaimOpenAiCredits.value && !readOnlyEnv && canCreate && hasWorkflows && isNewUser();
	};
	const { isTrulyEmpty } = useEmptyStateDetection();
	const getSimplifiedLayoutVisibility = (route) => {
		return isTrulyEmpty(route);
	};
	const isReadyToRunTemplateId = (templateId) => {
		return !!templateId && READY_TO_RUN_TEMPLATE_IDS.includes(templateId);
	};
	return {
		claimingCredits,
		userCanClaimOpenAiCredits,
		claimFreeAiCredits,
		createAndOpenAiWorkflow,
		claimCreditsAndOpenWorkflow,
		getCardVisibility,
		getButtonVisibility,
		getSimplifiedLayoutVisibility,
		trackExecuteAiWorkflow,
		trackExecuteAiWorkflowSuccess,
		isReadyToRunTemplateId
	};
});
//#endregion
export { READY_TO_RUN_AI_WORKFLOW as a, useAgentListStore as i, READY_TO_RUN_WORKFLOW_V5 as n, useEmptyStateDetection as r, useReadyToRunStore as t };
