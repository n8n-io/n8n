const n8nFEHooks_internalMethods = {
	identify: (userId) => {
		console.log('posthog-hooks: identify() fired');
		// TODO
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

const n8nFEHooks_userNodesPanelSession = {
	sessionId: '',
	data: {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	},
};

const n8nFEHooks_resetSession = () => {
	n8nFEHooks_userNodesPanelSession.sessionId = `nodes_panel_session_${(new Date()).valueOf()}`;
	n8nFEHooks_userNodesPanelSession.data = {
		nodeFilter: '',
		resultsNodes: [],
		filterMode: 'Regular',
	};
};

window.n8nExternalHooks = {
	/**
	 * @TODO Delete
	 * For testing, /cli
	 */
	workflow: {
		create: [
			async function (options) {
				console.log("hello from workflow.create");
			},
		],
	},

	/**
	 * @TODO Delete
	 * For testing, /editor-ui
	 */
	credentials: {
		create: [
			async function (options) {
				console.log("hello from credentials.create");
			},
		],
	},

	nodeView: {

		/**
		 * Only needed for calling `n8nFEHooks_resetSession()`,
		 * which sets `sessionId` used by `addNodeButton`.
		 */
		createNodeActiveChanged: [
			function (store, meta) {
				console.log('hello from createNodeActiveChanged');
				n8nFEHooks_resetSession();
				const eventData = {
					eventName: "User opened nodes panel",
					properties: {
						source: meta.source,
						nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
					}
				};

				n8nFEHooks_internalMethods.track(eventData);
				n8nFEHooks_internalMethods.page('Cloud instance', 'Nodes panel', eventData.properties);
			}
		],

		/**
		 * nodeView.onRunNode
		 */
		 onRunNode: [
			function(store, meta) {
				console.log('🔥 hook: nodeView.onRunNode');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		],

		/**
		 * nodeView.addNodeButton
		 */
		addNodeButton: [
			function (store, meta) {
				console.log('🔥 hook: nodeView.addNodeButton');

				const eventData = {
					eventName: "User added node to workflow canvas",
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: n8nFEHooks_userNodesPanelSession.sessionId,
					}
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		],

		/**
		 * nodeView.onRunWorkflow
		 */
		onRunWorkflow: [
			function (store, meta) {
				console.log('🔥 hook: nodeView.onRunWorkflow');

				const eventData = {
					eventName: "User clicked execute workflow button",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		],
	},

	credentialsSelectModal: {
		/**
		 * credentialsSelectModal.openCredentialType
		 */
		openCredentialType: [
			function(store, meta) {
				console.log('🔥 hook: credentialsSelectModal.openCredentialType');

				const eventData = {
					eventName: "User opened Credential modal",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},

	nodeExecuteButton: {
		/**
		 * nodeExecuteButton.onClick
		 */
		onClick: [
			function(store, meta) {
				console.log('🔥 hook: nodeExecuteButton.onClick');

				const eventData = {
					eventName: 'User clicked execute node button',
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},

	credentialEdit: {
		/**
		 * credentialEdit.saveCredential
		 */
		 saveCredential: [
			function(store, meta) {
				console.log('🔥 hook: credentialEdit.saveCredential');

				const eventData = {
					eventName: "User saved credentials",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},

	expressionEdit: {
		/**
		 * expressionEdit.closeDialog
		 */
		 closeDialog: [
			function(store, meta) {
				console.log('🔥 hook: expressionEdit.closeDialog');

				const eventData = {
					eventName: "User closed Expression Editor",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},

	parameterInput: {
		/**
		 * parameterInput.modeSwitch
		 */
		 modeSwitch: [
			function(store, meta) {
				console.log('🔥 hook: parameterInput.modeSwitch');

				const eventData = {
					eventName: "User switched parameter mode",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},

	personalizationModal: {
		/**
		 * personalizationModal.onSubmit
		 */
		 onSubmit: [
			function(store, meta) {
				console.log('🔥 hook: personalizationModal.onSubmit');

				n8nFEHooks_internalMethods.setMetadata(meta, 'user');
			}
		]
	},

	workflowActivate: {
		/**
		 * workflowActivate.updateWorkflowActivation
		 */
		 updateWorkflowActivation: [
			function(store, meta) {
				console.log('🔥 hook: workflowActivate.updateWorkflowActivation');

				const eventData = {
					eventName: "User set workflow active status",
					properties: meta,
				};

				n8nFEHooks_internalMethods.track(eventData);
			}
		]
	},
};
