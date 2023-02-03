// version 0.0.4

const n8nFEHooks_ENABLE_TRACKING = true;
const n8nFEHooks_ENABLE_LOGS = false;

function isVuexStore(store) {
	if (!store) return false;
	return 'commit' in store && 'dispatch' in store;
}

// Webhook functions that work with pinia store:
const piniaFunctions = {
	addAdminIcon: (store) => {
		if (store.globalRoleName && store.globalRoleName !== 'owner') {
			return;
		}
		store.addSidebarMenuItems([
			{
				id: 'admin',
				type: 'link',
				position: 'bottom',
				properties: {
					title: 'Admin Panel',
					href: 'https://app.n8n.cloud',
					icon: 'home',
					newWindow: false,
				},
			},
		]);
	},
	addFakeDoorFeatures: (store) => {
		if (!store.getFakeDoorFeatures) return;

		const fakeDoorFeatures = store.getFakeDoorFeatures.map((feature) => Object.assign({}, feature));
		const isUserManagementEnabled = store.isUserManagementEnabled;

		store.setFakeDoorFeatures(
			commonFunctions.compileFakeDoorFeatures(fakeDoorFeatures, isUserManagementEnabled),
		);
	},
	getUserSavedCredentialsEventData: (store, meta) => {
		return {
			eventName: 'User saved credentials',
			properties: {
				instance_id: store.instanceId,
				credential_type: meta.credential_type,
				credential_id: meta.credential_id,
				workflow_id: store.workflowId,
				node_type: store.activeNode?.name,
				is_new: meta.is_new,
				// is_complete: true,
				// is_valid: true,
				// error_message: ''
			},
		};
	},
	getOpenWorkflowSettingsEventData: (store) => {
		return {
			eventName: 'User opened workflow settings',
			properties: {
				workflow_id: store.workflowId,
				workflow_name: store.workflowName,
				current_settings: JSON.parse(JSON.stringify(store.workflowSettings)),
			},
		};
	},
	getUpdatedWorkflowSettingsEventData: (store, meta) => {
		return {
			eventName: 'User updated workflow settings',
			properties: {
				workflow_id: store.workflowId,
				workflow_name: store.workflowName,
				new_settings: JSON.parse(JSON.stringify(store.workflowSettings)),
				old_settings: meta.oldSettings,
			},
		};
	},
	getNodeTypeChangedEventData: (store, meta) => {
		return {
			eventName: 'User opened node modal',
			properties: {
				node_name: store.activeNode.name,
				node_subtitle: meta.nodeSubtitle,
			},
		};
	},
	getInsertedItemFromExpEditorEventData: (store, meta) => {
		return {
			eventName: 'User inserted item from Expression Editor variable selector',
			properties: {
				node_name: store.activeNode.name,
				node_type: store.activeNode.type.split('.')[1],
				parameter_name: meta.parameter.displayName,
				variable_expression: meta.selectedItem.variable,
			},
		};
	},
	getExpressionEditorEventsData: (store, meta, isValueDefault) => {
		let eventData = {};
		if (!meta.dialogVisible) {
			eventData.eventName = 'User closed Expression Editor';
			eventData.properties = {
				empty_expression: isValueDefault,
				expression_value: meta.value,
				expression_result: meta.resolvedExpressionValue.slice(1),
			};
		} else {
			eventData.eventName = 'User opened Expression Editor';
			eventData.properties = {
				node_name: store.activeNode.name,
				node_type: store.activeNode.type.split('.')[1],
				parameter_name: meta.parameter.displayName,
				parameter_field_type: meta.parameter.type,
				new_expression: isValueDefault,
			};
		}
		return eventData;
	},
	getAuthenticationModalEventData: (store, meta) => {
		return {
			eventName: 'User changed Authentication type from node modal',
			properties: {
				node_name: store.activeNode.name,
				node_type: store.activeNode.type.split('.')[1],
				old_mode:
					meta.oldNodeParameters.authentication ||
					(
						meta.parameters.find((param) => param.name === 'authentication') || {
							default: 'default',
						}
					).default,
				new_mode: meta.newValue,
			},
		};
	},
	trackExecutionStarted: (store, meta) => {
		const eventData = {
			properties: {
				execution_id: store.activeExecutionId,
			},
		};

		// node execution
		if (meta.nodeName) {
			eventData.eventName = 'User started node execution';

			eventData.properties.source = 'unknown';

			if (store.nodeByName) {
				eventData.properties.node_type = store.nodeByName(meta.nodeName).type.split('.')[1];
			} else {
				eventData.properties.node_type = store.getNodeByName(meta.nodeName).type.split('.')[1];
			}
			eventData.properties.node_name = meta.nodeName;

			if (meta.source === 'RunData.ExecuteNodeButton') {
				eventData.properties.source = 'node_modal';
			} else if (meta.source === 'Node.executeNode') {
				eventData.properties.source = 'workflow_canvas';
			}

			n8nFEHooks_internalMethods.track(eventData);
		} else {
			// workflow execution
			eventData.eventName = 'User started manual workflow execution';
			eventData.properties.workflow_id = store.workflowId;
			eventData.properties.workflow_name = store.workflowName;

			n8nFEHooks_internalMethods.track(eventData);
		}
	},
	getOutputModeChangedEventData: (store, meta) => {
		return {
			eventName: 'User changed node output view mode',
			properties: {
				old_mode: meta.oldValue,
				new_mode: meta.newValue,
				node_name: store.activeNode.name,
				node_type: store.activeNode.type.split('.')[1],
			},
		};
	},
	getExecutionFinishedEventData: (store, meta) => {
		const eventData = {
			properties: {
				execution_id: store.activeExecutionId,
			},
		};

		if (meta.runDataExecutedStartData.destinationNode) {
			eventData.eventName = 'Node execution finished';
			if (store.nodeByName) {
				eventData.properties.node_type = store.nodeByName(meta.nodeName).type.split('.')[1];
			} else {
				eventData.properties.node_type = store.getNodeByName(meta.nodeName).type.split('.')[1];
			}
			eventData.properties.node_name = meta.nodeName;
		} else {
			eventData.eventName = 'Manual workflow execution finished';
			eventData.properties.workflow_id = store.workflowId;
			eventData.properties.workflow_name = store.workflowName;
		}

		if (meta.errorMessage || meta.resultDataError) {
			eventData.properties.status = 'failed';
			eventData.properties.error_message =
				(meta.resultDataError && meta.resultDataError.message) || '';
			eventData.properties.error_stack = (meta.resultDataError && meta.resultDataError.stack) || '';
			eventData.properties.error_ui_message = meta.errorMessage || '';
			eventData.properties.error_timestamp = new Date();

			if (meta.resultDataError && meta.resultDataError.node) {
				eventData.properties.error_node =
					typeof meta.resultDataError.node === 'string'
						? meta.resultDataError.node
						: meta.resultDataError.node.name;
			} else {
				eventData.properties.error_node = meta.nodeName;
			}
		} else {
			eventData.properties.status = 'success';
			if (meta.runDataExecutedStartData.destinationNode) {
				// Node execution finished
				eventData.properties.items_count = meta.itemsCount || 0;
			}
		}
		return eventData;
	},
	getNodeRemovedEventData: (store, meta) => {
		return {
			eventName: 'User removed node from workflow canvas',
			properties: {
				node_name: meta.node.name,
				node_type: meta.node.type,
				node_disabled: meta.node.disabled,
				workflow_id: store.workflowId,
			},
		};
	},
	getCurrentWorkflowData: (store) => {
		return {
			workflow_name: store.workflowName,
			workflow_nodes: store.allNodes.map((n) => n.type.split('.')[1]),
		};
	},
};

// Functions used both by pinia and vuex functions
const commonFunctions = {
	compileFakeDoorFeatures: (fakeDoorFeatures, isUserManagementEnabled) => {
		const manageLinkURL = 'https://app.n8n.cloud/manage?edition=cloud';
		const environmentsFeature = fakeDoorFeatures.find((feature) => feature.id === 'environments');
		const loggingFeature = fakeDoorFeatures.find((feature) => feature.id === 'logging');
		const credentialsSharingFeature = fakeDoorFeatures.find(
			(feature) => feature.id === 'credentialsSharing' || feature.id === 'sharing',
		);
		const workflowsSharingFeature = fakeDoorFeatures.find(
			(feature) => feature.id === 'workflowsSharing',
		);

		if (environmentsFeature) {
			environmentsFeature.actionBoxTitle += '.cloud';
			environmentsFeature.linkURL += '&edition=cloud';
		}

		if (loggingFeature) {
			loggingFeature.actionBoxTitle += '.cloud';
			loggingFeature.linkURL += '&edition=cloud';
			loggingFeature.infoText = '';
		}

		if (credentialsSharingFeature) {
			credentialsSharingFeature.linkURL += '&edition=cloud';

			if (!isUserManagementEnabled) {
				credentialsSharingFeature.actionBoxTitle =
					credentialsSharingFeature.actionBoxTitle + '.cloud.upgrade';
				credentialsSharingFeature.actionBoxDescription =
					credentialsSharingFeature.actionBoxDescription + '.cloud.upgrade';
				credentialsSharingFeature.actionBoxButtonLabel =
					'fakeDoor.credentialEdit.sharing.actionBox.button.cloud.upgrade';
				credentialsSharingFeature.linkURL = manageLinkURL;
			}
		}

		if (workflowsSharingFeature) {
			workflowsSharingFeature.linkURL += '&edition=cloud';

			if (!isUserManagementEnabled) {
				workflowsSharingFeature.actionBoxTitle = 'fakeDoor.workflowsSharing.title.cloud.upgrade';
				workflowsSharingFeature.actionBoxDescription =
					workflowsSharingFeature.actionBoxDescription + '.cloud.upgrade';
				workflowsSharingFeature.actionBoxButtonLabel =
					workflowsSharingFeature.actionBoxButtonLabel + '.cloud.upgrade';
				workflowsSharingFeature.linkURL = manageLinkURL;
			}
		}

		if (!isUserManagementEnabled) {
			fakeDoorFeatures.unshift({
				id: 'users',
				featureName: 'fakeDoor.settings.users.name',
				icon: 'user-friends',
				actionBoxTitle: `fakeDoor.settings.users.actionBox.title`,
				actionBoxDescription: 'fakeDoor.settings.users.actionBox.description',
				actionBoxButtonLabel: 'fakeDoor.settings.users.actionBox.button',
				linkURL: manageLinkURL,
				uiLocations: ['settings'],
			});
		}

		return fakeDoorFeatures;
	},
	getNodeEditingFinishedEventData: (activeNode) => {
		switch (activeNode.type) {
			case 'n8n-nodes-base.httpRequest':
				const domain = activeNode.parameters.url.split('/')[2];
				return {
					eventName: 'User finished httpRequest node editing',
					properties: {
						method: activeNode.parameters.method,
						domain,
					},
				};
			case 'n8n-nodes-base.function':
				return {
					eventName: 'User finished function node editing',
					properties: {
						node_name: activeNode.name,
						code: activeNode.parameters.functionCode,
					},
				};
			case 'n8n-nodes-base.functionItem':
				return {
					eventName: 'User finished functionItem node editing',
					properties: {
						node_name: activeNode.name,
						code: activeNode.parameters.functionCode,
					},
				};
		}
	},
};

// Other utility methods
const n8nFEHooks_internalMethods = {
	adminIconAdded: false,
	addAdminIcon: (store) => {
		if (this.adminIconAdded) {
			return;
		}
		if (isVuexStore(store)) {
			vuexFunctions.addAdminIcon(store);
		} else {
			piniaFunctions.addAdminIcon(store);
		}
		this.adminIconAdded = true;
	},
	identify: (userId) => {
		if (n8nFEHooks_ENABLE_LOGS) {
			console.log('Analytics.identify:', { userId });
		}
		if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
			window.analytics.identify(userId);
		}
	},
	page: (category, name, properties) => {
		if (n8nFEHooks_ENABLE_LOGS) {
			console.log('Analytics.page:', { category, name, properties });
		}
		if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
			window.analytics.page(category, name, properties);
		}
	},
	track: (eventData) => {
		if (n8nFEHooks_ENABLE_LOGS) {
			console.log(eventData);
		}
		if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
			window.analytics.track(eventData.eventName, eventData.properties);
		}
	},
};

const n8nFEHooks_userNodesPanelSession = {
	sessionId: '',
	data: {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	},
};

const n8nFEHooks_resetSession = () => {
	n8nFEHooks_userNodesPanelSession.sessionId = `nodes_panel_session_${new Date().valueOf()}`;
	n8nFEHooks_userNodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
};

const n8nFEHooks_generateNodesPanelEvent = () => {
	return {
		eventName: 'User entered nodes panel search term',
		properties: {
			search_string: n8nFEHooks_userNodesPanelSession.data.nodeFilter,
			results_count: n8nFEHooks_userNodesPanelSession.data.resultsNodes.length,
			results_nodes: n8nFEHooks_userNodesPanelSession.data.resultsNodes,
			filter_mode: n8nFEHooks_userNodesPanelSession.data.filterMode,
			nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
		},
	};
};

// Actual front-end hooks
// These methods call appropriate pinia or vuex methods
externalHooks = {
	parameterInput: {
		mount: [
			function (store, meta) {
				if (!meta.parameter || !meta.inputFieldRef) {
					return;
				}

				if (
					meta.inputFieldRef.$el &&
					(meta.parameter.name === 'resource' || meta.parameter.name === 'operation')
				) {
					const inputField = meta.inputFieldRef.$el.querySelector('input');
					if (inputField && inputField.classList && inputField.classList.value) {
						inputField.classList.value = inputField.classList.value + ' data-hj-allow';
					}
				}
			},
		],
	},
	nodeCreator_searchBar: {
		mount: [
			function (store, meta) {
				if (!meta.inputRef) {
					return;
				}

				meta.inputRef.classList.value = meta.inputRef.classList.value + ' data-hj-allow';
			},
		],
	},
	app: {
		mount: [
			function (store, meta) {
				n8nFEHooks_internalMethods.addAdminIcon(store);
			},
			function (store, meta) {
				if (isVuexStore(store)) {
					vuexFunctions.addFakeDoorFeatures(store);
				} else {
					piniaFunctions.addFakeDoorFeatures(store);
				}
			},
		],
	},
	nodeView: {
		mount: [
			function (store, meta) {
				if (isVuexStore(store)) {
					n8nFEHooks_internalMethods.identify(store.getters.n8nMetadata.userId);
				} else {
					n8nFEHooks_internalMethods.identify(store.userId);
				}
			},
			function (store, meta) {
				n8nFEHooks_internalMethods.addAdminIcon(store);
			},
		],
		createNodeActiveChanged: [
			function (store, meta) {
				n8nFEHooks_resetSession();
				const eventData = {
					eventName: 'User opened nodes panel',
					properties: {
						source: meta.source,
						nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
				n8nFEHooks_internalMethods.page('Cloud instance', 'Nodes panel', eventData.properties);
			},
		],
		addNodeButton: [
			function (store, meta) {
				const eventData = {
					eventName: 'User added node to workflow canvas',
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	main: {
		routeChange: [
			function (store, meta) {
				const splitPath = meta.to.path.split('/');
				if (meta.from.path !== '/' && splitPath[1] === 'workflow') {
					const eventData = {
						workflow_id: splitPath[2],
					};
					n8nFEHooks_internalMethods.page('Cloud instance', 'Workflow editor', eventData);
				}
			},
		],
	},
	credential: {
		saved: [
			function (store, meta) {
				if (isVuexStore(store)) {
					n8nFEHooks_internalMethods.track(
						vuexFunctions.getUserSavedCredentialsEventData(store, meta),
					);
				} else {
					n8nFEHooks_internalMethods.track(
						piniaFunctions.getUserSavedCredentialsEventData(store, meta),
					);
				}
			},
		],
	},
	credentialsEdit: {
		credentialModalOpened: [
			function (store, meta) {
				//   credentialType: this.credentialTypeName,
				// isEditingCredential: this.mode === 'edit',
				// activeNode: this.$store.getters.activeNode,
			},
		],
		credentialTypeChanged: [
			function (store, meta) {
				if (meta.newValue) {
					const eventData = {
						eventName: 'User opened Credentials modal',
						properties: {
							source: meta.setCredentialType === meta.credentialType ? 'node' : 'primary_menu',
							new_credential: !meta.editCredentials,
							credential_type: meta.credentialType,
						},
					};

					n8nFEHooks_internalMethods.track(eventData);
					n8nFEHooks_internalMethods.page(
						'Cloud instance',
						'Credentials modal',
						eventData.properties,
					);
				}
			},
		],
		credentialModalOpened: [
			function (store, meta) {
				const eventData = {
					eventName: 'User opened Credentials modal',
					properties: {
						source: meta.activeNode ? 'node' : 'primary_menu',
						new_credential: !meta.isEditingCredential,
						credential_type: meta.credentialType,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
				n8nFEHooks_internalMethods.page(
					'Cloud instance',
					'Credentials modal',
					eventData.properties,
				);
			},
		],
	},
	credentialsList: {
		mounted: [
			function (store, meta) {
				const eventData = {
					eventName: 'User opened global Credentials panel',
				};

				n8nFEHooks_internalMethods.track(eventData);
				n8nFEHooks_internalMethods.page('Cloud instance', 'Credentials panel');
			},
		],
		dialogVisibleChanged: [
			function (store, meta) {
				if (meta.dialogVisible) {
					const eventData = {
						eventName: 'User opened global Credentials panel',
					};

					n8nFEHooks_internalMethods.track(eventData);
					n8nFEHooks_internalMethods.page('Cloud instance', 'Credentials panel');
				}
			},
		],
	},
	workflowSettings: {
		dialogVisibleChanged: [
			function (store, meta) {
				if (meta.dialogVisible) {
					if (isVuexStore(store)) {
						n8nFEHooks_internalMethods.track(vuexFunctions.getOpenWorkflowSettingsEventData(store));
					} else {
						n8nFEHooks_internalMethods.track(
							piniaFunctions.getOpenWorkflowSettingsEventData(store),
						);
					}
				}
			},
		],
		saveSettings: [
			function (store, meta) {
				if (isVuexStore(store)) {
					n8nFEHooks_internalMethods.track(vuexFunctions.getUpdatedWorkflowSettingsEventData);
				} else {
					n8nFEHooks_internalMethods.track(piniaFunctions.getUpdatedWorkflowSettingsEventData);
				}
			},
		],
	},
	dataDisplay: {
		onDocumentationUrlClick: [
			function (store, meta) {
				const eventData = {
					eventName: 'User clicked node modal docs link',
					properties: {
						node_type: meta.nodeType.name.split('.')[1],
						docs_link: meta.documentationUrl,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		nodeTypeChanged: [
			function (store, meta) {
				if (isVuexStore(store)) {
					n8nFEHooks_internalMethods.track(vuexFunctions.getNodeTypeChangedEventData(store, meta));
					n8nFEHooks_internalMethods.page('Cloud instance', 'Node modal', {
						node: store.getters.activeNode.name,
					});
				} else {
					n8nFEHooks_internalMethods.track(piniaFunctions.getNodeTypeChangedEventData(store, meta));
					n8nFEHooks_internalMethods.page('Cloud instance', 'Node modal', {
						node: store.activeNode.name,
					});
				}
			},
		],
		nodeEditingFinished: [
			function (store) {
				let eventData;
				if (isVuexStore(store)) {
					eventData = commonFunctions.getNodeEditingFinishedEventData(store.getters.activeNode);
					if (eventData) {
						eventData.properties.workflow_id = store.getters.workflowId;
					}
				} else {
					eventData = commonFunctions.getNodeEditingFinishedEventData(store.activeNode);
					if (eventData) {
						eventData.properties.workflow_id = store.workflowId;
					}
				}

				if (eventData) {
					n8nFEHooks_internalMethods.track(eventData);
				}
			},
		],
	},
	executionsList: {
		openDialog: [
			function (store, meta) {
				const eventData = {
					eventName: 'User opened Executions log',
				};

				n8nFEHooks_internalMethods.track(eventData);
				n8nFEHooks_internalMethods.page('Cloud instance', 'Executions log');
			},
		],
	},
	showMessage: {
		showError: [
			function (store, meta) {
				const eventData = {
					eventName: 'Instance FE emitted error',
					properties: {
						error_title: meta.title,
						error_description: meta.message,
						error_message: meta.errorMessage,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	expressionEdit: {
		itemSelected: [
			function (store, meta) {
				let eventData;
				if (isVuexStore(store)) {
					eventData = vuexFunctions.getInsertedItemFromExpEditorEventData(store, meta);
				} else {
					eventData = piniaFunctions.getInsertedItemFromExpEditorEventData(store, meta);
				}

				if (meta.selectedItem.variable.startsWith('Object.keys')) {
					eventData.properties.variable_type = 'Keys';
				} else if (meta.selectedItem.variable.startsWith('Object.values')) {
					eventData.properties.variable_type = 'Values';
				} else {
					eventData.properties.variable_type = 'Raw value';
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		dialogVisibleChanged: [
			function (store, meta) {
				const currentValue = meta.value.slice(1);
				let isValueDefault = false;

				switch (typeof meta.parameter.default) {
					case 'boolean':
						isValueDefault =
							(currentValue === 'true' && meta.parameter.default) ||
							(currentValue === 'false' && !meta.parameter.default);
						break;
					case 'string':
						isValueDefault = currentValue === meta.parameter.default;
						break;
					case 'number':
						isValueDefault = currentValue === meta.parameter.default.toString();
						break;
				}

				let eventData = {};

				if (isVuexStore(store)) {
					eventData = vuexFunctions.getExpressionEditorEventsData(store, meta, isValueDefault);
				} else {
					eventData = piniaFunctions.getExpressionEditorEventsData(store, meta, isValueDefault);
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	nodeSettings: {
		valueChanged: [
			function (store, meta) {
				if (meta.parameterPath !== 'authentication') {
					return;
				}

				let eventData;

				if (isVuexStore(store)) {
					eventData = vuexFunctions.getAuthenticationModalEventData(store, meta);
				} else {
					eventData = piniaFunctions.getAuthenticationModalEventData(store, meta);
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		credentialSelected: [
			function (store, meta) {
				const creds = Object.keys(meta.updateInformation.properties.credentials || {});
				if (creds.length < 1) {
					return;
				}
				const eventData = {
					eventName: 'User selected credential from node modal',
					properties: {
						credential_name: meta.updateInformation.properties.credentials[creds[0]],
						credential_type: creds[0],
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	workflowRun: {
		runWorkflow: [
			function (store, meta) {
				if (isVuexStore(store)) {
					vuexFunctions.trackExecutionStarted(store, meta);
				} else {
					piniaFunctions.trackExecutionStarted(store, meta);
				}
			},
		],
		runError: [
			function (store, meta) {
				const eventData = {
					eventName: meta.nodeName
						? 'Node execution finished'
						: 'Manual workflow execution finished',
					properties: {
						preflight: 'true',
						status: 'failed',
						error_message: meta.errorMessages.join('<br />&nbsp;&nbsp;- '),
						error_timestamp: new Date(),
						node_name: meta.nodeName,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	runData: {
		displayModeChanged: [
			function (store, meta) {
				let eventData;
				if (isVuexStore(store)) {
					eventData = vuexFunctions.getOutputModeChangedEventData(store, meta);
				} else {
					eventData = piniaFunctions.getOutputModeChangedEventData(store, meta);
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	pushConnection: {
		executionFinished: [
			function (store, meta) {
				let eventData;

				if (isVuexStore(store)) {
					eventData = vuexFunctions.getExecutionFinishedEventData(store, meta);
				} else {
					eventData = piniaFunctions.getExecutionFinishedEventData(store, meta);
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	node: {
		deleteNode: [
			function (store, meta) {
				let eventData;
				if (isVuexStore(store)) {
					eventData = vuexFunctions.getNodeRemovedEventData(store, meta);
				} else {
					eventData = piniaFunctions.getNodeRemovedEventData(store, meta);
				}

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	workflow: {
		activeChange: [
			function (store, meta) {
				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						workflow_id: meta.workflowId,
						source: 'workflow_modal',
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		open: [function (store, meta) {}],
		activeChangeCurrent: [
			function (store, meta) {
				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						source: 'main nav',
						workflow_id: meta.workflowId,
						...(isVuexStore(store)
							? vuexFunctions.getCurrentWorkflowData(store)
							: piniaFunctions.getCurrentWorkflowData(store)),
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		afterUpdate: [
			function (store, meta) {
				const eventData = {
					eventName: 'User saved workflow',
					properties: {
						workflow_id: meta.workflowData.id,
						workflow_name: meta.workflowData.workflowName,
						workflow_nodes: meta.workflowData.nodes.map((n) => n.type.split('.')[1]),
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	execution: {
		open: [
			function (store, meta) {
				const eventData = {
					eventName: 'User opened read-only execution',
					properties: {
						workflow_id: meta.workflowId,
						workflow_name: meta.workflowName,
						execution_id: meta.executionId,
					},
				};

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
	},
	nodeCreateList: {
		mounted: [function (store, meta) {}],
		destroyed: [
			function (store, meta) {
				if (
					n8nFEHooks_userNodesPanelSession.data.nodeFilter.length > 0 &&
					n8nFEHooks_userNodesPanelSession.data.nodeFilter != ''
				) {
					const eventData = n8nFEHooks_generateNodesPanelEvent();

					n8nFEHooks_internalMethods.track(eventData);
				}
			},
		],
		selectedTypeChanged: [
			function (store, meta) {
				const eventData = {
					eventName: 'User changed nodes panel filter',
					properties: {
						old_filter: meta.oldValue,
						new_filter: meta.newValue,
						nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
					},
				};
				n8nFEHooks_userNodesPanelSession.data.filterMode = meta.newValue;

				n8nFEHooks_internalMethods.track(eventData);
			},
		],
		nodeFilterChanged: [
			function (store, meta) {
				if (
					meta.newValue.length === 0 &&
					n8nFEHooks_userNodesPanelSession.data.nodeFilter.length > 0
				) {
					const eventData = n8nFEHooks_generateNodesPanelEvent();

					n8nFEHooks_internalMethods.track(eventData);
				}

				if (meta.newValue.length > meta.oldValue.length) {
					n8nFEHooks_userNodesPanelSession.data.nodeFilter = meta.newValue;
					n8nFEHooks_userNodesPanelSession.data.resultsNodes = meta.filteredNodes.map((node) => {
						if (node.name) {
							return node.name.split('.')[1];
						} else if (node.key) {
							return node.key.split('.')[1];
						}
						return '';
					});
				}
			},
		],
		filteredNodeTypesComputed: [function (store, meta) {}],
	},
};

window.n8nExternalHooks = window.n8nExternalHooks || {};

Object.keys(externalHooks).forEach((hookKey) => {
	window.n8nExternalHooks[hookKey] = window.n8nExternalHooks[hookKey] || {};
	Object.keys(externalHooks[hookKey]).forEach((hookMethod) => {
		window.n8nExternalHooks[hookKey][hookMethod] =
			window.n8nExternalHooks[hookKey][hookMethod] || [];
		window.n8nExternalHooks[hookKey][hookMethod].push(...externalHooks[hookKey][hookMethod]);
	});
});
