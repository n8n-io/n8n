// version 0.1.0

// @TODO_ON_COMPLETION: Disable
const LOGGING_ENABLED = true;

const internalMethods = {
	identify: (meta) => {
		if (LOGGING_ENABLED) console.log('n8nExternalHooks.internalMethods: identify');

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
			 * For PostHog, main ID cannot be `undefined` as being done for RudderStack.
			 *
			 * https://github.com/n8n-io/n8n/blob/02549e3ba9233a6d9f75fc1f9ff138e2aff7f4b9/packages/editor-ui/src/plugins/telemetry/index.ts#L87
			 */
			window.posthog.identify(instanceId, traits);
		}
	},

	track: (eventData) => {
		window.posthog.capture(eventData.eventName, eventData.properties);
	},

	/**
	 * Set metadata on a user, or on all events sent by a user.
	 *
	 * User: https://posthog.com/docs/integrate/client/js#sending-user-information
	 * User events: https://posthog.com/docs/integrate/client/js#super-properties
	 */
	setMetadata: (metadata, target) => {
		if (target === 'user') {
			posthog.people.set(metadata);
			return;
		}

		if (target === 'events') {
			posthog.register(metadata);
			return;
		}

		throw new Error("Arg `target` must be 'user' or 'events'")
	},
}

const n8n = {
	postHogHooks: {
		internalMethods,
		userNodesPanelSession: {
			sessionId: '',
			data: {
				nodeFilter: '',
				resultsNodes: [],
				filterMode: 'Regular',
			},
		},
		resetNodesPanelSession() {
			this.userNodesPanelSession.sessionId = `nodes_panel_session_${(new Date()).valueOf()}`;
			this.userNodesPanelSession.data = {
				nodeFilter: '',
				resultsNodes: [],
				filterMode: 'Regular',
			};
		}
	}
};

window.n8nExternalHooks = {
	nodeView: {

		/**
		 * Used only for calling `resetNodesPanelSession()`,
		 * which sets `sessionId` used by `addNodeButton`.
		 */
		createNodeActiveChanged: [
			function (_, meta) {
				n8n.postHogHooks.resetNodesPanelSession();
			}
		],

		/**
		 * nodeView.onRunNode
		 */
		 onRunNode: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: nodeView.onRunNode');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		],

		/**
		 * nodeView.addNodeButton
		 */
		addNodeButton: [
			function (_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: nodeView.addNodeButton');

				const eventData = {
					eventName: "User added node to workflow canvas",
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: n8n.postHogHooks.userNodesPanelSession.sessionId,
					}
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		],

		/**
		 * nodeView.onRunWorkflow
		 */
		onRunWorkflow: [
			function (_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: nodeView.onRunWorkflow');

				const eventData = {
					eventName: "User clicked execute workflow button",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		],
	},

	credentialsSelectModal: {
		/**
		 * credentialsSelectModal.openCredentialType
		 */
		openCredentialType: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: credentialsSelectModal.openCredentialType');

				const eventData = {
					eventName: "User opened Credential modal",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},

	nodeExecuteButton: {
		/**
		 * nodeExecuteButton.onClick
		 */
		onClick: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: nodeExecuteButton.onClick');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},

	credentialEdit: {
		/**
		 * credentialEdit.saveCredential
		 */
		 saveCredential: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: credentialEdit.saveCredential');

				const eventData = {
					eventName: "User saved credentials",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},

	expressionEdit: {

		/**
		 * expressionEdit.closeDialog
		 */
		 closeDialog: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: expressionEdit.closeDialog');

				const eventData = {
					eventName: "User closed Expression Editor",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},

	parameterInput: {

		/**
		 * parameterInput.modeSwitch
		 */
		 modeSwitch: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: parameterInput.modeSwitch');

				const eventData = {
					eventName: "User switched parameter mode",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},

	personalizationModal: {

		/**
		 * personalizationModal.onSubmit
		 */
		 onSubmit: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: personalizationModal.onSubmit');

				n8n.postHogHooks.internalMethods.setMetadata(meta, 'user');
			}
		]
	},

	telemetry: {

		/**
		 * telemetry.currentUserIdChanged
		 */
		 currentUserIdChanged: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: telemetry.currentUserIdChanged');

				n8n.postHogHooks.internalMethods.identify(meta);
			}
		]
	},

	workflowActivate: {

		/**
		 * workflowActivate.updateWorkflowActivation
		 */
		 updateWorkflowActivation: [
			function(_, meta) {
				if (LOGGING_ENABLED) console.log('n8nExternalHooks: workflowActivate.updateWorkflowActivation');

				const eventData = {
					eventName: "User set workflow active status",
					properties: meta,
				};

				n8n.postHogHooks.internalMethods.track(eventData);
			}
		]
	},
};
