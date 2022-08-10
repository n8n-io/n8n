// version 0.1.0

const LOGGING_ENABLED = true; // @TODO_ON_COMPLETION: Disable logging
const POSTHOG_NO_CAPTURE_CLASS = 'ph-no-capture';

const postHogUtils = {
	log(name, { isMethod } = { isMethod: false }, loggingEnabled = LOGGING_ENABLED) {
		if (!loggingEnabled) return;

		if (isMethod) {
			console.log(`Method fired: ${name}`);
			return;
		}

		console.log(`Hook fired: ${name}`);
	},

	/**
	 * https://github.com/rudderlabs/rudder-sdk-js/blob/master/dist/rudder-sdk-js/index.d.ts
	 */

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

window.featureFlag = {
	/**
	 * @returns string[]
	 */
	getAll() {
		return window.posthog.feature_flags.getFlags();
	},

	/**
	 * @returns boolean | undefined
	 */
	get(flagName) {
		return window.posthog.getFeatureFlag(flagName);
	},

	/**
	 * By default, this function will send a `$feature_flag_called` event
	 * to your instance every time it's called so you're able to do analytics.
	 * You can disable this by passing `{ send_event: false }` as second arg.
	 *
	 * https://posthog.com/docs/integrate/client/js
	 *
	 * @returns boolean | undefined
	 */
	isEnabled(flagName) {
		// PostHog's' `isFeatureEnabled` misleadingly returns `false`
		// for non-existent flag, so ensure `undefined`
		if (this.get(flagName) === undefined) return undefined;

		return window.posthog.isFeatureEnabled(flagName);
	},

	reload() {
		window.posthog.reloadFeatureFlags();
	}
}

const postHogUserNodesPanelSession = {
	sessionId: '',
	data: {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	},
};

function resetNodesPanelSession() {
	postHogUserNodesPanelSession.sessionId = `nodes_panel_session_${(new Date()).valueOf()}`;
	postHogUserNodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
}

window.n8nExternalHooks = {
	copyInput: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('copyInput.mounted');

				const { value } = meta.copyInputValueRef.classList;
				meta.copyInputValueRef.classList.value = postHogUtils.appendNoCapture(value);
			}
		],
	},

	userInfo: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('userInfo.mounted');

				const { value } = meta.userInfoRef.classList;
				meta.userInfoRef.classList.value = postHogUtils.appendNoCapture(value);
			}
		],
	},

	mainSidebar: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('mainSidebar.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = postHogUtils.appendNoCapture(value);
			}
		],
	},

	settingsPersonalView: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('settingsPersonalView.mounted');

				const { value } = meta.userRef.classList;
				meta.userRef.classList.value = postHogUtils.appendNoCapture(value);
			}
		],
	},

	workflowOpen: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('workflowOpen.mounted');

				// workflow names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.name')) {
					item.classList.value = postHogUtils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	credentialsList: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('credentialsList.mounted'); // @TODO: Overlaps with cloud hook

				// credential names in table body
				const tableBody = meta.tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.el-table_1_column_1 > .cell')) {
					item.classList.value = postHogUtils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	sticky: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('sticky.mounted');

				meta.stickyRef.classList.value = postHogUtils.appendNoCapture(meta.stickyRef.classList.value);
			}
		],
	},

	executionsList: {
		created: [
			function (_, meta) {
				postHogUtils.log('executionsList.created');

				const { filtersRef, tableRef } = meta;

				// workflow names in filters dropdown
				for (const item of filtersRef.querySelectorAll('li')) {
					item.classList.value = postHogUtils.appendNoCapture(item.classList.value);
				}

				// workflow names in table body
				const tableBody = tableRef.$refs.bodyWrapper;
				for (const item of tableBody.querySelectorAll('.workflow-name')) {
					item.classList.value = postHogUtils.appendNoCapture(item.classList.value);
				};
			}
		],
	},

	runData: {
		updated: [
			function (_, meta) {
				log('runData.updated');

				for (const element of meta.elements) {
					element.classList.value = postHogUtils.appendNoCapture(element.classList.value)
				}
			}
		],
	},

	nodeView: {

		/**
		 * This hook is used only for calling `resetNodesPanelSession()`,
		 * to set `sessionId` needed by `nodeView.addNodeButton`.
		 */
		createNodeActiveChanged: [ // @TODO: Overlaps with cloud hook
			function () {
				postHogUtils.log('nodeView.createNodeActiveChanged');

				resetNodesPanelSession();
			}
		],

		onRunNode: [
			function (_, meta) {
				postHogUtils.log('nodeView.onRunNode');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		],

		addNodeButton: [
			function (_, meta) {
				postHogUtils.log('nodeView.addNodeButton'); // @TODO: Overlaps with cloud hook

				const eventData = {
					eventName: "User added node to workflow canvas",
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: postHogUserNodesPanelSession.sessionId,
					}
				};

				postHogUtils.track(eventData);
			}
		],

		onRunWorkflow: [
			function (_, meta) {
				postHogUtils.log('nodeView.onRunWorkflow');

				const eventData = {
					eventName: "User clicked execute workflow button",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		],
	},

	credentialsSelectModal: {
		openCredentialType: [
			function (_, meta) {
				postHogUtils.log('credentialsSelectModal.openCredentialType');

				const eventData = {
					eventName: "User opened Credential modal",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		]
	},

	nodeExecuteButton: {
		onClick: [
			function (_, meta) {
				postHogUtils.log('nodeExecuteButton.onClick');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		]
	},

	credentialEdit: {
		saveCredential: [
			function (_, meta) {
				postHogUtils.log('credentialEdit.saveCredential');

				const eventData = {
					eventName: "User saved credentials",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		]
	},

	variableSelectorItem: {
		mounted: [
			function (_, meta) {
				postHogUtils.log('variableSelectorItem.mounted');

				const { value } = meta.variableSelectorItemRef.classList;

				meta.variableSelectorItemRef.classList.value = postHogUtils.appendNoCapture(value);
			}
		]
	},

	expressionEdit: {
		closeDialog: [
			function (_, meta) {
				postHogUtils.log('expressionEdit.closeDialog');

				const eventData = {
					eventName: "User closed Expression Editor",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		],

		mounted: [
			function (_, meta) {
				postHogUtils.log('expressionEdit.mounted');

				meta.expressionInputRef.classList.value = postHogUtils.appendNoCapture(meta.expressionInputRef.classList.value)
				meta.expressionOutputRef.classList.value = postHogUtils.appendNoCapture(meta.expressionOutputRef.classList.value)
			}
		],
	},

	parameterInput: {
		modeSwitch: [
			function (_, meta) {
				postHogUtils.log('parameterInput.modeSwitch');

				const eventData = {
					eventName: "User switched parameter mode",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		]
	},

	personalizationModal: {
		onSubmit: [
			function (_, meta) {
				postHogUtils.log('personalizationModal.onSubmit');

				postHogUtils.setMetadata(meta, 'user');
			}
		]
	},

	telemetry: {
		currentUserIdChanged: [
			function (_, meta) {
				postHogUtils.log('telemetry.currentUserIdChanged');

				postHogUtils.identify(meta);
			}
		]
	},

	parameterInput: {
		updated: [
			function (_, meta) {
				postHogUtils.log('parameterInput.updated');

				for (const option of meta.remoteParameterOptions) {
					option.classList.value = postHogUtils.appendNoCapture(option.classList.value)
				}
			}
		]
	},

	workflowActivate: {
		updateWorkflowActivation: [
			function (_, meta) {
				postHogUtils.log('workflowActivate.updateWorkflowActivation');

				const eventData = {
					eventName: "User set workflow active status",
					properties: meta,
				};

				postHogUtils.track(eventData);
			}
		]
	},
};
