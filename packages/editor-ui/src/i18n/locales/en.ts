export default {
	en: {

		nodeViewError: {
			error: 'ERROR',
			details: 'Details',
			time: 'Time',
			httpCode: 'HTTP-Code',
			cause: 'Cause',
			dataBelowMayContain: 'Data below may contain sensitive information. Proceed with caution when sharing.',
			stack: 'Stack',
		},

		noTagsView: {
			readyToOrganizeYourWorkflows: 'Ready to organize your workflows?',
			withWorkflowTagsYouReFree: 'With workflow tags, you\'re free to create the perfect tagging system for your flows',
			createATag: 'Create a tag',
		},

		tagsView: {
			inUse: `$\{count} workflow$\{count > 1 ? "s" : ""}`, // interpolation problem
			notBeingUsed: 'Not being used',
		},

		workflowDetails: {
			addTag: 'Add tag',
			active: 'Active',
		},

		tagsTable: {
			areYouSureYouWantToDeleteThisTag: 'Are you sure you want to delete this tag?',
			createTag: 'Create tag',
			saveChanges: 'Save changes',
			cancel: 'Cancel',
			deleteTag: 'Delete tag',
			name: 'Name',
			usage: 'Usage',
			editTag: 'Edit Tag',
		},

		tagsTableHeader: {
			addNew: 'Add new',
			searchTags: 'Search Tags',
		},

		about: {
			aboutN8n: "About n8n",
			n8nVersion: 'n8n Version',
			sourceCode: "Source Code",
			license: "License",
			close: "Close",
			apacheWithCommons20Clause: "Apache 2.0 with Commons Clause",
		},

		binaryDataDisplay: {
			backToList: 'Back to list',
			dataToDisplayDidNotGetFound: 'Data to display did not get found',
		},

		collectionParameter: {
			currentlyNoPropertiesExist: 'Currently no properties exist',
		},

		credentialsEdit: {
			nodeDocumentation: 'Node Documentation',
			needHelp: 'Need help?',
			openCredentialDocs: 'Open credential docs',
			credentialType: 'Credential type',
			createNewCredentials: 'Create New Credentials',
		},

		credentialsInput: {
			credentialsName: 'Credentials Name:',
			credentialData: 'Credential Data:',
			enterAllRequiredProperties: 'Enter all required properties',
			connected: 'Connected',
			notConnected: 'Not connected',
			oAuth2CallbackUrl: 'OAuth Callback URL',
			nodesWithAccess: 'Nodes with access:',
			important: 'Important',
			addAtLeastOneNodeWhichHasAccessToTheCredentials: 'Add at least one node which has access to the credentials!',
			save: 'Save',
			create: 'Create',
			noAccess: 'No Access',
			access: 'Access',
		},

		credentialsList: {
			yourSavedCredentials: 'Your saved credentials:',
			addNew: 'Add New',
			createNewCredentials: 'Create New Credentials',
			confirmMessage: {
				message: `Are you sure you want to delete "\${credential.name}" credentials?`, // interpolation problem
				headline: 'Delete Credentials?',
				confirmButtonText: 'Yes, delete!',
				cancelButtonText: '',
			},
		},

		dataDisplay: {
			nodeDocumentation: 'Node Documentation',
			needHelp: 'Need help?',
			openDocumentationFor: 'Open {{nodeType.displayName}} documentation', // interpolation problem
		},

		duplicateWorkflowDialog: {
			enterWorkflowName: 'Enter workflow name',
			save: 'Save',
			cancel: 'Cancel',
			duplicateWorkflow: 'Duplicate Workflow',
			chooseOrCreateATag: 'Choose or create a tag',
		},

		executionsList: {
			filters: 'Filters:',
			autoRefresh: 'Auto refresh',
			selected: 'Selected',
			checkAll: 'Check all',
			runningParens: 'running',
			retryOf: 'Retry of',
			successRetry: 'Success retry',
			running: 'Running',
			success: 'Success',
			error: 'Error',
			unknown: 'Unknown',
			retryWithCurrentlySavedWorkflow: 'Retry with currently saved workflow',
			retryWithOriginalworkflow: 'Retry with original workflow',
			loadMore: 'Load More',
			workflowExecutions: 'Workflow Executions',
			allWorkflows: 'All Workflows',
			anyStatus: 'Any Status',
			startedAtId: 'Started At / ID',
			name: 'Name',
			status: 'Status',
			mode: 'Mode',
			runningTime: 'Running Time',
			retryExecution: 'Retry execution',
			openPastExecution: 'Open Past Execution',
			confirmMessage: {
				message: `Are you sure that you want to delete the $\{this.numSelected} selected executions?`, // interpolation problem
				headline: 'Delete Executions?',
				confirmButtonText: 'Yes, delete!',
				cancelButtonText: '',
			},
			statusTooltipText: {
				theWorkflowIsCurrentlyExecuting: 'The worklow is currently executing.',
				theWorkflowExecutionWasARetryOfAndItWasSuccessful: `The workflow execution was a retry of "\${entry.retryOf}" and it was successful.`, // interpolation problem
				theWorkflowExecutionWasSuccessful: 'The worklow execution was successful.',
				theWorkflowExecutionWasARetryOfAndFailed: `The workflow execution was a retry of "\${entry.retryOf}" and failed.<br />New retries have to be,started from the original execution.`, // interpolation problem
				theWorkflowExecutionFailedButTheRetryWasSuccessful: `The workflow execution failed but the retry "\${entry.retrySuccessId}" was successful.`,
				theWorkflowExecutionIsProbablyStillRunning: 'The workflow execution is probably still running but it may have crashed and n8n cannot safely tell. ',
				theWorkflowExecutionFailed: 'The workflow execution failed.',
			},
		},

		expressionEdit: {
			editExpression: 'Edit Expression',
			variableSelector: 'Variable Selector',
			expression: 'Expression',
			result: 'Result',
		},

		fixedCollectionParameter: {
			currentlyNoItemsExist: 'Currently no items exist',
		},

		mainSideBar: {
			workflows: 'Workflows',
			workflow: 'Workflow',
			new: 'New',
			open: 'Open',
			save: 'Save',
			duplicate: 'Duplicate',
			delete: 'Delete',
			download: 'Download',
			importFromUrl: 'Import from URL',
			importFromFile: 'Import from File',
			settings: 'Settings',
			credentials: 'Credentials',
			executions: 'Executions',
			help: 'Help',
			aboutN8n: 'About n8n',
			confirmMessage: {
				message: `Are you sure that you want to delete the workflow "$\{this.workflowName}"?`, // interpolation problem
				headline: 'Delete Workflow?',
				confirmButtonText: 'Yes, delete!',
				cancelButtonText: '',
			},
			helpMenuItems: {
				documentation: 'Documentation',
				forum: 'Forum',
				workflows: 'workflows',
			},
		},

		multipleParameter: {
			currentlyNoItemsExist: 'Currently no items exist',
		},

		nodeCreateList: {
			noNodesMatchYourSearchCriteria: '🙃 no nodes matching your search criteria',
			typeToFilter: 'Type to filter...',
			regular: 'Regular',
			trigger: 'Trigger',
			all: 'All',
		},

		nodeCreator: {
			createNode: 'Create Node',
		},

		nodeCredentials: {
			credentials: 'Credentials',
		},

		nodeSettings: {
			theNodeIsNotValidAsItsTypeIsUnknown: 'The node is not valid as its type {{ node.type }} is unknown.', // interpolation problem
			thisNodeDoesNotHaveAnyParameters: 'This node does not have any parameters.',
			settings: {
				notes: {
					displayName: 'Notes',
					description: 'Optional note to save with the node.',
				},
				notesInFlow: {
					displayName: 'Display note in flow?',
					description: 'If active, the note above will display in the flow as a subtitle.',
				},
				color: {
					displayName: 'Node Color',
					description: 'The color of the node in the flow.',
				},
				alwaysOutputData: {
					displayName: 'Always Output Data',
					description: 'If active, the node will return an empty item even if the <br />node returns no data during an initial execution. Be careful setting <br />this on IF-Nodes as it could cause an infinite loop.',
				},
				executeOnce: {
					displayName: 'Execute Once',
					description: 'If active, the node executes only once, with data<br /> from the first item it recieves.',
				},
				retryOnFail: {
					displayName: 'Retry On Fail',
					description: 'If active, the node tries to execute a failed attempt <br /> multiple times until it succeeds.',
				},
				maxTries: {
					displayName: 'Max. Tries',
					description: 'Number of times Retry On Fail should attempt to execute the node <br />before stopping and returning the execution as failed.',
				},
				waitBetweenTries: {
					displayName: 'Wait Between Tries',
					description: 'How long to wait between each attempt. Value in ms.',
				},
				continueOnFail: {
					displayName: 'Continue On Fail',
					description: 'If active, the workflow continues even if this node\'s <br />execution fails. When this occurs, the node passes along input data from<br />previous nodes - so your workflow should account for unexpected output data.',
				},
			},
		},

		nodeWebhooks: {
			webhookUrls: 'Webhook URLs',
			displayUrlFor: 'Display URL for:',
		},

		parameterInput: {
			addExpression: 'Add Expression',
			removeExpression: 'Remove Expression',
			resetValue: 'Reset Value',
		},

		pushConnectionTracker: {
			cannotConnectToServer: 'Cannot connect to server.<br />It is either down or you have a connection issue. <br />It should reconnect automatically once the issue is resolved.',
			connectionLost: 'Connection lost',
		},

		runData: {
			executeNode: 'Execute Node',
			items: 'Items',
			startTime: 'Start Time',
			executionTime: 'Execution Time',
			ms: 'ms',
			output: 'Output',
			dataOfExecution: 'Data of Execution',
			copyItemPath: 'Copy Item Path',
			copyParameterPath: 'Copy Parameter Path',
			copyValue: 'Copy Value',
			nodeReturnedALargeAmountOfData: 'Node returned a large amount of data',
			theNodeContains: 'The node contains {{parseInt(dataSize/1024).toLocaleString()}} KB of data.<br />Displaying it could cause problems!<br /><br />If you do decide to display it, avoid the JSON view!', // interpolation problem
			displayDataAnyway: 'Display Data Anyway',
			noTextDataFound: 'No text data found',
			entriesExistButThey: 'Entries exist but they do not contain any JSON data.',
			noBinaryDataFound: 'No binary data found',
			fileName: 'File Name',
			fileExtension: 'File Extension',
			mimeType: 'Mime Type',
			showBinaryData: 'Show Binary Data',
			dataReturnedByTheNodeWillDisplayHere: 'Data returned by this node will display here.',
			noData: 'No data',
		},

		saveWorkflowButton: {
			save: 'Save',
			saved: 'Saved',
		},

		tagsDropdown: {
			typeToCreateATag: 'Type to create a tag',
			noMatchingTagsExist: 'No matching tags exist',
			noTagsExist: 'No tags exist',
			manageTags: 'Manage tags',
		},

		tagsManager: {
			manageTags: 'Manage tags',
			done: 'Done',
			couldNotDeleteTag: 'Could not delete tag',
		},

		variableSelectorItem: {
			selectItem: 'Select Item',
			empty: '--- EMPTY ---',
		},

		workflowActivator: {
			theWorkflowIsSetToBeActiveBut: 'The workflow is set to be active but could not be started.<br />Click to display error message.',
			deactivateWorkflow: 'Deactivate workflow',
			activateWorkflow: 'Activate workflow',
			confirmMessage: {
				message: 'When you activate the workflow all currently unsaved changes of the workflow will be saved.',
				headline: 'Activate and save?',
				confirmButtonText: 'Yes, activate and save!',
				cancelButtonText: '',
			},
		},

		workflowOpen: {
			openWorkflow: 'Open Workflow',
			filterByTags: 'Filter by tags...',
			searchWorkflows: 'Deutsch',
			name: 'Name',
			created: 'Created',
			updated: 'Updated',
			active: 'Active',
			confirmMessage: {
				message: 'When you switch workflows your current workflow changes will be lost.',
				headline: 'Save your Changes?',
				confirmButtonText: 'Yes, switch workflows and forget changes',
				cancelButtonText: '',
			},
		},

		workflowSettings: {
			workflowSettings: 'Workflow Settings',
			noWorkflow: '- No Workflow -',
			errorWorkflow: 'Error Workflow',
			timezone: 'Timezone',
			saveDataErrorExecution: 'Save Data Error Execution', // colon
			saveDataSuccessExecution: 'Save Data Success Execution',
			saveManualExecutions: 'Save Manual Executions',
			saveExecutionProgress: 'Save Execution Progress',
			timeoutWorkflow: 'Timeout Workflow',
			editExpression: 'Edit Expression',
			timeoutAfter: 'Timeout After',
			hours: 'hours',
			minutes: 'minutes',
			seconds: 'seconds',
			save: 'Save',
			saveDataErrorExecutionOptions: {
				defaultSave: `Default - ' + (this.defaultValues.saveDataErrorExecution === 'all' ? 'Save' : 'Do not save')`, // interpolation problem
				save: 'Save',
				doNotSave: 'Do not save',
			},
			saveDataSuccessExecutionOptions: {
				defaultSave: `Default - ' + (this.defaultValues.saveDataSuccessExecution === 'all' ? 'Save' : 'Do not save')`, // interpolation problem
				save: 'Save',
				doNotSave: 'Do not save',
			},
			saveExecutionProgressOptions: {
				defaultSave: `Default - ' + (this.defaultValues.saveExecutionProgress === true ? 'Yes' : 'No')`, // interpolation problem
				yes: 'Yes',
				no: 'No',
			},
			saveManualOptions: {
				defaultSave: `Default - ' + (this.defaultValues.saveManualExecutions === true ? 'Yes' : 'No')`, // interpolation problem
				yes: 'Yes',
				no: 'No',
			},
			helpTexts: {
				errorWorkflow: 'The workflow to run in case the current one fails.<br />To function correctly that workflow has to contain an "Error Trigger" node!',
				timezone: 'The timezone in which the workflow should run. Gets for example used by "Cron" node.',
				saveDataErrorExecution: 'If data data of executions should be saved in case they failed.',
				saveDataSuccessExecution: 'If data data of executions should be saved in case they succeed.',
				saveExecutionProgress: 'If data should be saved after each node, allowing you to resume in case of errors from where it stopped. May increase latency.',
				saveManualExecutions: 'If data data of executions should be saved when started manually from the editor.',
				executionTimeoutToggle: 'Cancel workflow execution after defined time',
				executionTimeout: 'After what time the workflow should timeout.',
			},
		},

		nodeView: {
			stoppingCurrentExecution: 'Stopping current execution',
			stopCurrentExecution:'Stop current execution',
			executesTheWorkflowFromTheStartOrWebhookNode: 'Executes the Workflow from the Start or Webhook Node.',
			runButtonText: {
				executeWorkflow: 'Execute Workflow',
				waitingForWebhookCall: 'Waiting for Webhook-Call',
				executingWorkflow: 'Executing Workflow',
			},
			confirmMessage: {
				beforeRouteLeave: {
					message: 'When you switch workflows your current workflow changes will be lost.',
					headline: 'Save your Changes?',
					confirmButtonText: 'Yes, switch workflows and forget changes',
					cancelButtonText: '',
				},
				receivedCopyPasteData: {
					message: `Import workflow from this URL:<br /><i>$\{plainTextData}<i>`, // interpolation problem
					headline: 'Import Workflow from URL?',
					confirmButtonText: 'Yes, import!',
					cancelButtonText: '',
				},
				initView: {
					message: 'When you switch workflows your current workflow changes will be lost.',
					headline: 'Save your Changes?',
					confirmButtonText: 'Yes, switch workflows and forget changes',
					cancelButtonText: '',
				},
			},
		},

		'n8n-nodes-base': {
			start: {
				hello: "hallöchen",
			},
		},
	},
};
