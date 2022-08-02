// version 0.1.0

const LOGGING_ENABLED = true; // @TODO_ON_COMPLETION: Disable logging
const POSTHOG_NO_CAPTURE_CLASS = 'ph-no-capture';

const utils = {
	log(name, { isMethod } = { isMethod: false }, loggingEnabled = LOGGING_ENABLED) {
		if (!loggingEnabled) return;

		if (isMethod) {
			console.log(`Method fired: ${name}`);
			return;
		}

		console.log(`Hook fired: ${name}`);
	},
	identify(meta) {
		this.log('identify', { isMethod: true });

		const { userId, instanceId } = meta;

		const traits = { instance_id: instanceId };

		if (userId) {
			window.posthog.identify({
				distinctId: [instanceId, userId].join('_'),
				traits,
			});
		} else {
			window.posthog.reset();

			/**
			 * For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
			 *
			 * https://github.com/n8n-io/n8n/blob/02549e3ba9233a6d9f75fc1f9ff138e2aff7f4b9/packages/editor-ui/src/plugins/telemetry/index.ts#L87
			 */
			window.posthog.identify(instanceId, traits);
		}
	},

	track(eventData) {
		this.log('track', { isMethod: true });

		window.posthog.capture(eventData.eventName, eventData.properties);
	},

	/**
	 * Set metadata on a user, or on all events sent by a user.
	 *
	 * User: https://posthog.com/docs/integrate/client/js#sending-user-information
	 * User events: https://posthog.com/docs/integrate/client/js#super-properties
	 */
	setMetadata(metadata, target) {
		this.log('setMetadata', { isMethod: true });

		if (target === 'user') {
			posthog.people.set(metadata);
			return;
		}

		if (target === 'events') {
			posthog.register(metadata);
			return;
		}

		throw new Error("Arg `target` must be 'user' or 'events'");
	},

	appendNoCapture(originalClasses, noCaptureClass = POSTHOG_NO_CAPTURE_CLASS) {
		return [originalClasses, noCaptureClass].join(' ');
	}
}

const userNodesPanelSession = {
	sessionId: '',
	data: {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	},
};

function resetNodesPanelSession() {
	userNodesPanelSession.sessionId = `nodes_panel_session_${(new Date()).valueOf()}`;
	userNodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
}

window.n8nExternalHooks = {
	copyInput: {
		mounted: [
			function (_, meta) {
				utils.log('copyInput.mounted');

				const { value } = meta.copyInputValueRef.classList;
				meta.copyInputValueRef.classList.value = utils.appendNoCapture(value);
			}
		],
	},

	userInfo: {
		mounted: [
			function (_, meta) {
				utils.log('userInfo.mounted');

				const { value } = meta.userInfoRef.classList;
				meta.userInfoRef.classList.value = utils.appendNoCapture(value);
			}
		],
	},

	mainSidebar: {
		mounted: [
			function (_, meta) {
				utils.log('mainSidebar.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = utils.appendNoCapture(value);
			}
		],
	},

	settingsPersonalView: {
		mounted: [
			function (_, meta) {
				utils.log('settingsPersonalView.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = utils.appendNoCapture(value);
			}
		],
	},

	workflowOpen: {
		mounted: [
			function (_, meta) {
				utils.log('workflowOpen.mounted');

				// workflow names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.name')) {
					item.classList.value = utils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	credentialsList: {
		mounted: [
			function (_, meta) {
				utils.log('credentialsList.mounted');

				// credential names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.el-table_1_column_1 > .cell')) {
					item.classList.value = utils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	sticky: {
		mounted: [
			function (_, meta) {
				utils.log('sticky.mounted');

				meta.stickyRef.classList.value = utils.appendNoCapture(meta.stickyRef.classList.value);
			}
		],
	},

	executionsList: {
		created: [
			function (_, meta) {
				utils.log('executionsList.created');

				const { filtersRef, tableRef } = meta;

				// workflow names in filters dropdown
				for (const item of filtersRef.querySelectorAll('li')) {
					item.classList.value = utils.appendNoCapture(item.classList.value);
				}

				// workflow names in table body
				const tableBody = tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.workflow-name')) {
					item.classList.value = utils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	runData: {
		updated: [
			function (_, meta) {
				log('runData.updated');

				for (const element of meta.elements) {
					element.classList.value = utils.appendNoCapture(element.classList.value)
				}
			}
		],
	},

	nodeView: {

		/**
		 * This hook is used only for calling `resetNodesPanelSession()`,
		 * to set `sessionId` needed by `nodeView.addNodeButton`.
		 */
		createNodeActiveChanged: [
			function () {
				utils.log('nodeView.createNodeActiveChanged');

				resetNodesPanelSession();
			}
		],

		onRunNode: [
			function (_, meta) {
				utils.log('nodeView.onRunNode');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				utils.track(eventData);
			}
		],

		addNodeButton: [
			function (_, meta) {
				utils.log('nodeView.addNodeButton');

				const eventData = {
					eventName: "User added node to workflow canvas",
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: userNodesPanelSession.sessionId,
					}
				};

				utils.track(eventData);
			}
		],

		onRunWorkflow: [
			function (_, meta) {
				utils.log('nodeView.onRunWorkflow');

				const eventData = {
					eventName: "User clicked execute workflow button",
					properties: meta,
				};

				utils.track(eventData);
			}
		],
	},

	credentialsSelectModal: {
		openCredentialType: [
			function (_, meta) {
				utils.log('credentialsSelectModal.openCredentialType');

				const eventData = {
					eventName: "User opened Credential modal",
					properties: meta,
				};

				utils.track(eventData);
			}
		]
	},

	nodeExecuteButton: {
		onClick: [
			function (_, meta) {
				utils.log('nodeExecuteButton.onClick');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				utils.track(eventData);
			}
		]
	},

	credentialEdit: {
		saveCredential: [
			function (_, meta) {
				utils.log('credentialEdit.saveCredential');

				const eventData = {
					eventName: "User saved credentials",
					properties: meta,
				};

				utils.track(eventData);
			}
		]
	},

	variableSelectorItem: {
		mounted: [
			function (_, meta) {
				utils.log('variableSelectorItem.mounted');

				const { value } = meta.variableSelectorItemRef.classList;

				meta.variableSelectorItemRef.classList.value = utils.appendNoCapture(value);
			}
		]
	},

	expressionEdit: {
		closeDialog: [
			function (_, meta) {
				utils.log('expressionEdit.closeDialog');

				const eventData = {
					eventName: "User closed Expression Editor",
					properties: meta,
				};

				utils.track(eventData);
			}
		],

		mounted: [
			function (_, meta) {
				utils.log('expressionEdit.mounted');

				meta.expressionInputRef.classList.value = utils.appendNoCapture(meta.expressionInputRef.classList.value)
				meta.expressionOutputRef.classList.value = utils.appendNoCapture(meta.expressionOutputRef.classList.value)
			}
		],
	},

	parameterInput: {
		modeSwitch: [
			function (_, meta) {
				utils.log('parameterInput.modeSwitch');

				const eventData = {
					eventName: "User switched parameter mode",
					properties: meta,
				};

				utils.track(eventData);
			}
		]
	},

	personalizationModal: {
		onSubmit: [
			function (_, meta) {
				utils.log('personalizationModal.onSubmit');

				utils.setMetadata(meta, 'user');
			}
		]
	},

	telemetry: {
		currentUserIdChanged: [
			function (_, meta) {
				utils.log('telemetry.currentUserIdChanged');

				utils.identify(meta);
			}
		]
	},

	parameterInput: {
		updated: [
			function (_, meta) {
				utils.log('parameterInput.updated');

				for (const option of meta.remoteParameterOptions) {
					option.classList.value = utils.appendNoCapture(option.classList.value)
				}
			}
		]
	},

	workflowActivate: {
		updateWorkflowActivation: [
			function (_, meta) {
				utils.log('workflowActivate.updateWorkflowActivation');

				const eventData = {
					eventName: "User set workflow active status",
					properties: meta,
				};

				utils.track(eventData);
			}
		]
	},
};
