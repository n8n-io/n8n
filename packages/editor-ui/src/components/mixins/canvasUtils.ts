import { WEBHOOK_NODE_TYPE } from '@/constants';
import { ICredentialsResponse, INodeUi } from '@/Interface';
import {
	IConnections,
	INodeCredentialsDetails,
	INodeIssues,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeHelpers,
} from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { genericHelpers } from './genericHelpers';
import { v4 as uuid } from 'uuid';
import { nodeHelpers } from './nodeHelpers';

export const canvasUtils = mixins(genericHelpers, nodeHelpers).extend({
	data() {
		return {
			credentialsUpdated: false,
		};
	},
	methods: {
		async addNodesToCanvas(nodes: INodeUi[]) {
			// Before proceeding we must check if all nodes contain the `properties` attribute.
			// Nodes are loaded without this information so we must make sure that all nodes
			// being added have this information.
			await this.loadNodesProperties(
				nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
			);

			// Add the node to the node-list
			let nodeType: INodeTypeDescription | null;
			let foundNodeIssues: INodeIssues | null;
			nodes.forEach((node) => {
				if (!node.id) {
					node.id = uuid();
				}

				nodeType = this.$store.getters['nodeTypes/getNodeType'](
					node.type,
					node.typeVersion,
				) as INodeTypeDescription | null;

				// Make sure that some properties always exist
				if (!node.hasOwnProperty('disabled')) {
					node.disabled = false;
				}

				if (!node.hasOwnProperty('parameters')) {
					node.parameters = {};
				}

				// Load the defaul parameter values because only values which differ
				// from the defaults get saved
				if (nodeType !== null) {
					let nodeParameters = null;
					try {
						nodeParameters = NodeHelpers.getNodeParameters(
							nodeType.properties,
							node.parameters,
							true,
							false,
							node,
						);
					} catch (e) {
						console.error(
							this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
								`: "${node.name}"`,
						); // eslint-disable-line no-console
						console.error(e); // eslint-disable-line no-console
					}
					node.parameters = nodeParameters !== null ? nodeParameters : {};

					// if it's a webhook and the path is empty set the UUID as the default path
					if (node.type === WEBHOOK_NODE_TYPE && node.parameters.path === '') {
						node.parameters.path = node.webhookId as string;
					}
				}

				// check and match credentials, apply new format if old is used
				this.matchCredentials(node);

				foundNodeIssues = this.getNodeIssues(nodeType, node);

				if (foundNodeIssues !== null) {
					node.issues = foundNodeIssues;
				}

				this.$store.commit('addNode', node);
			});
		},
		async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
			const allNodes: INodeTypeDescription[] = this.$store.getters['nodeTypes/allNodeTypes'];

			const nodesToBeFetched: INodeTypeNameVersion[] = [];
			allNodes.forEach((node) => {
				const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
				if (
					!!nodeInfos.find((n) => n.name === node.name && nodeVersions.includes(n.version)) &&
					!node.hasOwnProperty('properties')
				) {
					nodesToBeFetched.push({
						name: node.name,
						version: Array.isArray(node.version) ? node.version.slice(-1)[0] : node.version,
					});
				}
			});

			if (nodesToBeFetched.length > 0) {
				// Only call API if node information is actually missing
				this.startLoading();
				await this.$store.dispatch('nodeTypes/getNodesInformation', nodesToBeFetched);
				this.stopLoading();
			}
		},
		matchCredentials(node: INodeUi) {
			if (!node.credentials) {
				return;
			}
			Object.entries(node.credentials).forEach(
				([nodeCredentialType, nodeCredentials]: [string, INodeCredentialsDetails]) => {
					const credentialOptions = this.$store.getters['credentials/getCredentialsByType'](
						nodeCredentialType,
					) as ICredentialsResponse[];

					// Check if workflows applies old credentials style
					if (typeof nodeCredentials === 'string') {
						nodeCredentials = {
							id: null,
							name: nodeCredentials,
						};
						this.credentialsUpdated = true;
					}

					if (nodeCredentials.id) {
						// Check whether the id is matching with a credential
						const credentialsId = nodeCredentials.id.toString(); // due to a fixed bug in the migration UpdateWorkflowCredentials (just sqlite) we have to cast to string and check later if it has been a number
						const credentialsForId = credentialOptions.find(
							(optionData: ICredentialsResponse) => optionData.id === credentialsId,
						);
						if (credentialsForId) {
							if (
								credentialsForId.name !== nodeCredentials.name ||
								typeof nodeCredentials.id === 'number'
							) {
								node.credentials![nodeCredentialType] = {
									id: credentialsForId.id,
									name: credentialsForId.name,
								};
								this.credentialsUpdated = true;
							}
							return;
						}
					}

					// No match for id found or old credentials type used
					node.credentials![nodeCredentialType] = nodeCredentials;

					// check if only one option with the name would exist
					const credentialsForName = credentialOptions.filter(
						(optionData: ICredentialsResponse) => optionData.name === nodeCredentials.name,
					);

					// only one option exists for the name, take it
					if (credentialsForName.length === 1) {
						node.credentials![nodeCredentialType].id = credentialsForName[0].id;
						this.credentialsUpdated = true;
					}
				},
			);
		},
	},
});
