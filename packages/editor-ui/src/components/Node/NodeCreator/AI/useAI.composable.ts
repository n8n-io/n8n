import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getNodeSuggestionsPrompt, getActionsCompositionPrompt } from './templates';
import minifier from 'string-minify';
import { useToast } from '@/composables';

interface SuggestedNode {
	node: string;
	explainWhy: string;
}

interface SuggestedActionConnection {
	id: string;
	node: string;
	actionKey: string;
	explainWhy: string;
	inputActions: string[];
	outputActions: string[];
}
interface Action {
	actionKey: string;
	description: string;
	displayName: string;
	node: string;
	inputs: number;
	outputs: number;
}

export const useAI = defineStore('ai', () => {
	const { showError } = useToast();
	const apiKey = ref();
	const userPrompt = ref('');
	const suggestedNodes = ref<SuggestedNode[]>([]);
	const pseudoWorkflow = ref<SuggestedActionConnection[]>([]);
	const isLoading = ref(false);
	const { visibleNodeTypes } = useNodeTypesStore();

	function setApiKey(key: string) {
		apiKey.value = key;
	}

	function tokenize(text: string): string[] {
		return text.toLowerCase().match(/\b(\w+)\b/g) || [];
	}

	function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
		const dotProduct = vecA.reduce((sum, a, index) => sum + a * vecB[index], 0);
		const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
		const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
		return dotProduct / (magnitudeA * magnitudeB);
	}

	function calculateTermFrequencies(terms: string[], document: string[]): number[] {
		return terms.map((term) => document.filter((word) => word === term).length);
	}

	function selectRelevantActions(explainWhy: string, actions: Action[], k: number): Action[] {
		// Step 1: Tokenize
		const explainWhyTokens = tokenize(explainWhy);
		const actionTokens = actions.map((action) => tokenize(action.displayName));

		// Step 2: Calculate term frequencies
		const terms = Array.from(new Set([...explainWhyTokens, ...actionTokens.flat()]));
		const explainWhyVector = calculateTermFrequencies(terms, explainWhyTokens);
		const actionVectors = actionTokens.map((tokens) => calculateTermFrequencies(terms, tokens));

		// Step 3: Similarity Calculation
		const similarities: Array<[Action, number]> = actions.map((action, index) => {
			const similarity = calculateCosineSimilarity(explainWhyVector, actionVectors[index]);
			return [action, similarity];
		});

		// Step 4: Ranking
		const rankedActions = similarities.sort((a, b) => b[1] - a[1]);

		// Step 5: Selection
		return rankedActions
			.slice(0, k - 1 <= rankedActions.length ? k : rankedActions.length)
			.map(([action]) => action);
	}

	const parsedActions = computed(() => {
		const actions = useNodeCreatorStore().getActions;

		return Object.values(actions)
			.flat()
			.filter((a) => a.actionKey !== '__CUSTOM_API_CALL__')
			.map((a) => {
				const matchedNodeData = useNodeTypesStore().visibleNodeTypes.find((n) => n.name === a.name);
				// console.log('🚀 ~ file: useAI.composable.ts:93 ~ .map ~ matchedNodeData:', matchedNodeData);
				return {
					actionKey: `${a.displayOptions?.show?.resource?.[0] || ''}:${a.actionKey}`,
					description: a.description,
					displayName: a.displayName,
					node: a.name.replace('n8n-nodes-base.', ''),
					inputs: matchedNodeData?.inputs?.length ?? 0,
					outputs: matchedNodeData?.outputs?.length ?? 0,
				};
			});
	});

	const matchString = (a: string, b: string, isStrict = false) => {
		const aNorm = a.toLowerCase().replace(' ', '').replace('-', '');
		const bNorm = b.toLowerCase().replace(' ', '').replace('-', '');

		return isStrict ? aNorm === bNorm : aNorm.includes(bNorm);
	};

	function reset() {
		setSuggestedNodes([]);
		setUserPrompt('');
		setPseudoWorkflow([]);
	}
	async function getCompletions(
		messages: Array<{ role: string; content: string }>,
		functions: any[],
		functionCall: { name: string },
	) {
		console.log('🚀 ~ file: useAI.composable.ts:122 ~ useAI ~ functions:', functions);
		try {
			const completion = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + apiKey.value,
				},
				body: JSON.stringify({
					model: 'gpt-3.5-turbo-16k-0613',
					// model: 'gpt-4-0613',
					// temperature: 0.65,
					messages,
					functions: [
						...functions,
						// {
						// 	name: 'add_action_to_workflow',
						// 	description: 'Adds an action to the workflow',
						// 	// parameters is a JSON schema
						// 	parameters: {
						// 		type: 'object',
						// 		properties: {
						// 			actionKey: {
						// 				type: 'string',
						// 				description: 'The action to add to the workflow',
						// 			},
						// 			node: {
						// 				type: 'string',
						// 				description: 'The parent node',
						// 			},
						// 			explainWhy: {
						// 				type: 'string',
						// 				description: 'The reason why the action was added',
						// 			},
						// 		},
						// 	},
						// 	required: ['actionKey', 'node', 'explainWhy'],
						// },
						// {
						// 	name: 'connect_actions',
						// 	description: 'Connects input of one action to output of another',
						// 	// parameters is a JSON schema
						// 	parameters: {
						// 		type: 'object',
						// 		properties: {
						// 			inputAction: {
						// 				type: 'string',
						// 				description: 'The action to connect to the input of another action',
						// 			},
						// 			inputIndex: {
						// 				type: 'number',
						// 				description: 'The index of the input to connect to',
						// 			},
						// 			outputIndex: {
						// 				type: 'number',
						// 				description: 'The index of the output to connect to',
						// 			},
						// 			outputAction: {
						// 				type: 'string',
						// 				description: 'The action to connect to the output of another action',
						// 			},
						// 		},
						// 		required: ['inputAction', 'inputIndex', 'outputAction', 'outputIndex'],
						// 	},
						// },
					],
					function_call: functionCall,
				}),
			});

			const completionJSON = await completion.json();
			return completionJSON?.choices[0]?.message?.function_call?.arguments;
		} catch (error) {
			showError(
				error,
				'Error when fetching OpenAI completions',
				'Please check the console for more details.',
			);
			console.error('Error when getting OpenAI completions: ', { error, messages });
			return [];
		}
	}

	function setSuggestedNodes(nodes: SuggestedNode[]) {
		suggestedNodes.value = nodes;
	}

	function setUserPrompt(prompt: string) {
		userPrompt.value = prompt;
	}

	function setPseudoWorkflow(workflow: SuggestedActionConnection[]) {
		pseudoWorkflow.value = workflow;
	}

	async function fetchSuggestedNodes() {
		isLoading.value = true;

		const startTime = performance.now();
		const nonCoreNodes = useNodeTypesStore().visibleNodeTypes.filter(
			(n) => !n.codex?.categories?.includes('Core Nodes'),
		);
		const triggerNodes = nonCoreNodes
			.filter((n) => n.group.includes('trigger'))
			.map((n) => n.name.replace('n8n-nodes-base.', ''))
			.join(',');

		const regularNodes = nonCoreNodes
			.filter((n) => !n.group.includes('trigger'))
			.map((n) => n.name.replace('n8n-nodes-base.', ''))
			.join(',');

		const prompt = getNodeSuggestionsPrompt(triggerNodes, regularNodes);
		const generated = await getCompletions(
			[
				{
					role: 'system',
					content: prompt,
				},
				{
					role: 'user',
					content: userPrompt.value,
				},
			],
			[
				{
					name: 'add_nodes_to_suggested_nodes',
					description: 'Adds an array of nodes to the suggested/identified nodes',
					// parameters is a JSON schema
					parameters: {
						type: 'object',
						required: ['nodes'],
						properties: {
							nodes: {
								type: 'array',
								items: {
									type: 'object',
									required: ['node', 'explainWhy'],
									properties: {
										node: {
											type: 'string',
											description: 'The node to suggest',
										},
										explainWhy: {
											type: 'string',
											description: 'The reason why the node was suggested',
										},
									},
								},
							},
						},
					},
				},
			],
			{
				name: 'add_nodes_to_suggested_nodes',
			},
		);
		try {
			console.log(
				'🚀 ~ file: useAI.composable.ts:267 ~ fetchSuggestedNodes ~ generated:',
				generated,
			);
			suggestedNodes.value = JSON.parse(generated)?.nodes;
			isLoading.value = false;
			const endTime = performance.now();

			console.log(`[${endTime - startTime}ms] Fetched Suggested Nodes: `, suggestedNodes.value);
		} catch (error) {
			showError(
				error,
				'Failed to parse suggested nodes',
				'Please check the console for more information.',
			);
			console.log('Failed to parse suggested nodes: ', error);
		}
	}

	async function fetchActionsComposition() {
		const startTime = performance.now();
		const matchedActions = suggestedNodes.value.flatMap((n) => {
			const nodeActions = parsedActions.value.filter((a) => {
				const matchesNode = matchString(a.node, n.node);

				return matchesNode;
			});

			const relevantActions = selectRelevantActions(n.explainWhy, nodeActions, 10);

			return relevantActions.map((a) => ({
				node: a.node,
				actionKey: a.actionKey,
				description: a.description,
				displayName: a.displayName,
			}));
		});
		const matchedNodesData = suggestedNodes.value
			.filter((n) => visibleNodeTypes.find((node) => node.name === n.node) !== undefined)
			.map((n) => {
				const node = visibleNodeTypes.find((node) => {
					return node.name === n.node;
				});
				return {
					...n,
					inputs: node?.inputs?.length ?? 0,
					outputs: node?.outputs?.length ?? 0,
				};
			});
		const minifiedNodes = minifier(JSON.stringify(matchedNodesData));
		const minifiedActions = minifier(JSON.stringify(matchedActions));

		const actionCompositionPrompt = getActionsCompositionPrompt(minifiedNodes, minifiedActions);

		isLoading.value = true;
		const generated = await getCompletions(
			[
				{
					role: 'system',
					content: actionCompositionPrompt,
				},
				{
					role: 'user',
					content: userPrompt.value,
				},
			],
			[
				{
					name: 'add_actions_to_workflow',
					description: 'Add list of actions to the workflow',
					// parameters is a JSON schema
					parameters: {
						type: 'object',
						properties: {
							actions: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: {
											type: 'number',
											description: 'The index position of the action starting with 1',
										},
										actionKey: {
											type: 'string',
											description: 'The action to add to the workflow',
										},
										node: {
											type: 'string',
											description: 'The parent node',
										},
										explainWhy: {
											type: 'string',
											description: 'The reason why the action was added',
										},
										inputActions: {
											type: 'array',
											description: 'IDs representing connected input actions',
											items: {
												type: 'number',
												description: 'Id of the action',
											},
										},
										outputActions: {
											type: 'array',
											description: 'IDs representing connected output actions',
											items: {
												type: 'number',
												description: 'Id of the action',
											},
										},
									},
									required: [
										'actionKey',
										'node',
										'explainWhy',
										'inputActions',
										'outputActions',
										'id',
									],
								},
							},
						},
						required: ['actions'],
					},
				},
			],
			{
				name: 'add_actions_to_workflow',
			},
		);

		isLoading.value = false;
		try {
			pseudoWorkflow.value = JSON.parse(generated)?.actions;
			const endTime = performance.now();

			console.log(`[${endTime - startTime}ms] Fetched Actions Composition: `, pseudoWorkflow.value);
		} catch (error) {
			showError(
				error,
				'Failed to parse actions composition',
				'Please check the console for more information.',
			);
			console.log('Failed to parse actions composition: ', error);
		}
	}

	return {
		selectRelevantActions,
		getCompletions,
		matchString,
		setSuggestedNodes,
		setUserPrompt,
		setPseudoWorkflow,
		fetchSuggestedNodes,
		setApiKey,
		reset,
		fetchActionsComposition,
		parsedActions,
		isLoading: computed(() => isLoading.value),
		suggestedNodes: computed(() => suggestedNodes.value),
		userPrompt: computed(() => userPrompt.value),
		pseudoWorkflow: computed(() => pseudoWorkflow.value),
	};
});
