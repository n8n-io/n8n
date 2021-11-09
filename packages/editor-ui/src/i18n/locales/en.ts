export default {
	en: {
		about: {
			aboutN8n: 'About n8n',
			apacheWithCommons20Clause: 'Apache 2.0 with Commons Clause',
			close: 'Close',
			license: 'License',
			n8nVersion: 'n8n Version',
			sourceCode: 'Source Code',
		},
		binaryDataDisplay: {
			backToList: 'Back to list',
			dataToDisplayDidNotGetFound: 'Data to display did not get found',
		},
		collectionParameter: {
			chooseOptionToAdd: 'Choose Option To Add',
			currentlyNoPropertiesExist: 'Currently no properties exist',
		},
		credentialsEdit: {
			createNewCredentials: 'Create New Credentials',
			credentialType: 'Credential type',
			needHelp: 'Need help?',
			nodeDocumentation: 'Node Documentation',
			openCredentialDocs: 'Open credential docs',
			showError: {
				message: 'There was a problem loading the credentials',
				title: 'Problem loading credentials',
			},
			showMessage: {
				credentialsCreated: {
					message: 'credentials were successfully created!',
					title: 'Credentials created',
				},
				credentialsUpdated: {
					message: 'credentials were successfully updated!',
					title: 'Credentials updated',
				},
				credentialTypeNull1: {
					message: 'Credentials of type {credentialsType} are not known.',
					title: 'Credential type not known',
				},
				credentialTypeNull2: {
					message: 'Credentials of type {credentialsType} are not known.',
					title: 'Credential type not known',
				},
				currentCredentialsUndefined1: {
					message: 'Could not find the credentials with the id',
					title: 'Credentials not found',
				},
				currentCredentialsUndefined2: {
					message: 'No credentials could be loaded!',
					title: 'Problem loading credentials',
				},
				editCredentialsIdUndefined: {
					message: 'The ID of the credentials which should be edited is missing!',
					title: 'Credential ID missing',
				},
			},
			title: 'Edit Credentials',
		},
		credentialsInput: {
			access: 'Access',
			addAtLeastOneNodeWhichHasAccessToTheCredentials: 'Add at least one node which has access to the credentials!',
			connected: 'Connected',
			create: 'Create',
			credentialData: 'Credential Data',
			credentialsName: 'Credentials Name',
			enterAllRequiredProperties: 'Enter all required properties',
			important: 'Important',
			noAccess: 'No Access',
			nodesWithAccess: 'Nodes with access',
			notConnected: 'Not connected',
			oAuth2CallbackUrl: 'OAuth Callback URL',
			save: 'Save',
			showError: {
				createCredentials: {
					message: 'There was a problem creating the credentials',
					title: 'Problem Creating Credentials',
				},
				oAuthCredentialAuthorize: {
					message: 'Error generating authorization URL',
					title: 'OAuth Authorization Error',
				},
				updateCredentials: {
					message: 'There was a problem updating the credentials',
					title: 'Problem Updating Credentials',
				},
			},
			showMessage: {
				copyCallbackUrl: {
					message: 'Callback URL was successfully copied!',
					title: 'Copied',
				},
				receiveMessage: {
					message: 'Connected successfully!',
					title: 'Connected',
				},
			},
		},
		credentialsList: {
			addNew: 'Add New',
			confirmMessage: {
				cancelButtonText: '',
				confirmButtonText: 'Yes, delete!',
				headline: 'Delete Credentials?',
				message: 'Are you sure you want to delete {credentialName} credentials?',
			},
			createNewCredentials: 'Create New Credentials',
			credentials: 'Credentials',
			editCredentials: 'Edit Credentials',
			deleteCredentials: 'Delete Credentials',
			showError: {
				deleteCredential: {
					message: 'There was a problem deleting the credentials',
					title: 'Problem deleting credentials',
				},
				loadCredentials: {
					message: 'There was a problem loading the credentials',
					title: 'Problem loading credentials',
				},
			},
			showMessage: {
				message: 'The credential {credentialsName} got deleted!',
				title: 'Credentials deleted',
			},
			tableLabels: {
				name: 'Name',
				type: 'Type',
				created: 'Created',
				updated: 'Updated',
				operations: 'Operations',
			},
			yourSavedCredentials: 'Your saved credentials',
		},
		dataDisplay: {
			needHelp: 'Need help?',
			nodeDocumentation: 'Node Documentation',
			openDocumentationFor: 'Open {nodeTypeDisplayName} documentation',
		},
		duplicateWorkflowDialog: {
			cancel: 'Cancel',
			chooseOrCreateATag: 'Choose or create a tag',
			duplicateWorkflow: 'Duplicate Workflow',
			enterWorkflowName: 'Enter workflow name',
			save: 'Save',
			showMessage: {
				message: 'Please enter a name.',
				title: 'Name missing',
			},
		},
		executionsList: {
			allWorkflows: 'All Workflows',
			anyStatus: 'Any Status',
			autoRefresh: 'Auto refresh',
			checkAll: 'Check all',
			confirmMessage: {
				cancelButtonText: '',
				confirmButtonText: 'Yes, delete!',
				headline: 'Delete Executions?',
				message: 'Are you sure that you want to delete the {numSelected} selected executions?',
			},
			error: 'Error',
			filters: 'Filters',
			loadMore: 'Load More',
			mode: 'Mode',
			name: 'Name',
			openPastExecution: 'Open Past Execution',
			retryExecution: 'Retry execution',
			retryOf: 'Retry of',
			retryWithCurrentlySavedWorkflow: 'Retry with currently saved workflow',
			retryWithOriginalworkflow: 'Retry with original workflow',
			running: 'Running',
			runningParens: 'running',
			runningTime: 'Running Time',
			selected: 'Selected',
			showError: {
				handleDeleteSelected: {
					message: 'There was a problem deleting the executions',
					title: 'Problem deleting executions',
				},
				loadMore: {
					message: 'There was a problem loading the workflows',
					title: 'Problem loading workflows',
				},
				loadWorkflows: {
					message: 'There was a problem loading the workflows',
					title: 'Problem loading workflows',
				},
				refreshData: {
					message: 'There was a problem loading the data',
					title: 'Problem loading',
				},
				retryExecution: {
					message: 'There was a problem with the retry',
					title: 'Problem with retry',
				},
				stopExecution: {
					message: 'There was a problem stopping the execuction',
					title: 'Problem stopping execution',
				},
			},
			showMessage: {
				handleDeleteSelected: {
					message: 'The executions got deleted!',
					title: 'Execution deleted',
				},
				retrySuccessfulFalse: {
					message: 'The retry was not successful!',
					title: 'Retry unsuccessful',
				},
				retrySuccessfulTrue: {
					message: 'The retry was successful!',
					title: 'Retry successful',
				},
				stopExecution: {
					message: 'The execution with the id {activeExecutionId} got stopped!',
					title: 'Execution stopped',
				},
			},
			startedAtId: 'Started At / ID',
			status: 'Status',
			statusTooltipText: {
				theWorkflowExecutionFailed: 'The workflow execution failed.',
				theWorkflowExecutionFailedButTheRetryWasSuccessful: 'The workflow execution failed but the retry {entryRetrySuccessId} was successful.',
				theWorkflowExecutionIsProbablyStillRunning: 'The workflow execution is probably still running but it may have crashed and n8n cannot safely tell. ',
				theWorkflowExecutionWasARetryOfAndFailed: 'The workflow execution was a retry of {entryRetryOf} and failed.<br />New retries have to be,started from the original execution.',
				theWorkflowExecutionWasARetryOfAndItWasSuccessful: 'The workflow execution was a retry of {entryRetryOf} and it was successful.',
				theWorkflowExecutionWasSuccessful: 'The worklow execution was successful.',
				theWorkflowIsCurrentlyExecuting: 'The worklow is currently executing.',
			},
			success: 'Success',
			successRetry: 'Success retry',
			unknown: 'Unknown',
			workflowExecutions: 'Workflow Executions',
		},
		expressionEdit: {
			editExpression: 'Edit Expression',
			expression: 'Expression',
			result: 'Result',
			variableSelector: 'Variable Selector',
		},
		fixedCollectionParameter: {
			chooseOptionToAdd: 'Choose Option To Add',
			currentlyNoItemsExist: 'Currently no items exist',
		},
		genericHelpers: {
			showMessage: {
				message: 'The workflow can not be edited as a past execution gets displayed. To make changed either open the original workflow of which the execution gets displayed or save it under a new name first.',
				title: 'Workflow can not be changed!',
			},
		},
		mainSideBar: {
			aboutN8n: 'About n8n',
			confirmMessage: {
				cancelButtonText: '',
				confirmButtonText: 'Yes, delete!',
				headline: 'Delete Workflow?',
				message: 'Are you sure that you want to delete the workflow {workflowName}?',
			},
			credentials: 'Credentials',
			delete: 'Delete',
			download: 'Download',
			duplicate: 'Duplicate',
			executions: 'Executions',
			help: 'Help',
			helpMenuItems: {
				documentation: 'Documentation',
				forum: 'Forum',
				workflows: 'workflows',
			},
			importFromFile: 'Import from File',
			importFromUrl: 'Import from URL',
			new: 'New',
			open: 'Open',
			prompt: {
				cancel: 'Cancel',
				import: 'Import',
				importWorkflowFromUrl: 'Import Workflow from URL',
				invalidUrl: 'Invalid URL',
				workflowUrl: 'Workflow URL',
			},
			save: 'Save',
			settings: 'Settings',
			showError: {
				handleSelect: {
					message: 'There was a problem deleting the workflow',
					title: 'Problem deleting the workflow',
				},
				stopExecution: {
					message: 'There was a problem stopping the execuction',
					title: 'Problem stopping execution',
				},
			},
			showMessage: {
				handleFileImport: {
					message: 'The file does not contain valid JSON data.',
					title: 'Could not import file',
				},
				handleSelect1: {
					message: 'The workflow {workflowName} got deleted.',
					title: 'Workflow got deleted',
				},
				handleSelect2: {
					message: 'A new workflow got created',
					title: 'Workflow created',
				},
				handleSelect3: {
					message: 'A new workflow got created',
					title: 'Workflow created',
				},
				stopExecution: {
					message: 'The execution with the id {executionId} got stopped!',
					title: 'Execution stopped',
				},
			},
			workflow: 'Workflow',
			workflows: 'Workflows',
		},
		multipleParameter: {
			currentlyNoItemsExist: 'Currently no items exist',
		},
		nodeCredentials: {
			credentials: 'Credentials',
			showMessage: {
				message: 'The credentials named {name} of type {credentialType} could not be found!',
				title: 'Credentials not found',
			},
		},
		nodeErrorView: {
			cause: 'Cause',
			dataBelowMayContain: 'Data below may contain sensitive information. Proceed with caution when sharing.',
			details: 'Details',
			error: 'ERROR',
			httpCode: 'HTTP-Code',
			showMessage: {
				message: '',
				title: 'Copied to clipboard',
			},
			stack: 'Stack',
			time: 'Time',
		},
		nodeSettings: {
			settings: {
				alwaysOutputData: {
					description: 'If active, the node will return an empty item even if the <br />node returns no data during an initial execution. Be careful setting <br />this on IF-Nodes as it could cause an infinite loop.',
					displayName: 'Always Output Data',
				},
				color: {
					description: 'The color of the node in the flow.',
					displayName: 'Node Color',
				},
				continueOnFail: {
					description: 'If active, the workflow continues even if this node\'s <br />execution fails. When this occurs, the node passes along input data from<br />previous nodes - so your workflow should account for unexpected output data.',
					displayName: 'Continue On Fail',
				},
				executeOnce: {
					description: 'If active, the node executes only once, with data<br /> from the first item it recieves.',
					displayName: 'Execute Once',
				},
				maxTries: {
					description: 'Number of times Retry On Fail should attempt to execute the node <br />before stopping and returning the execution as failed.',
					displayName: 'Max. Tries',
				},
				notes: {
					description: 'Optional note to save with the node.',
					displayName: 'Notes',
				},
				notesInFlow: {
					description: 'If active, the note above will display in the flow as a subtitle.',
					displayName: 'Display note in flow?',
				},
				retryOnFail: {
					description: 'If active, the node tries to execute a failed attempt <br /> multiple times until it succeeds.',
					displayName: 'Retry On Fail',
				},
				waitBetweenTries: {
					description: 'How long to wait between each attempt. Value in ms.',
					displayName: 'Wait Between Tries',
				},
			},
			theNodeIsNotValidAsItsTypeIsUnknown: 'The node is not valid as its type {nodeType} is unknown.',
			thisNodeDoesNotHaveAnyParameters: 'This node does not have any parameters.',
		},
		nodeView: {
			confirmMessage: {
				beforeRouteLeave: {
					cancelButtonText: '',
					confirmButtonText: 'Yes, switch workflows and forget changes',
					headline: 'Save your Changes?',
					message: 'When you switch workflows your current workflow changes will be lost.',
				},
				initView: {
					cancelButtonText: '',
					confirmButtonText: 'Yes, switch workflows and forget changes',
					headline: 'Save your Changes?',
					message: 'When you switch workflows your current workflow changes will be lost.',
				},
				receivedCopyPasteData: {
					cancelButtonText: '',
					confirmButtonText: 'Yes, import!',
					headline: 'Import Workflow from URL?',
					message: 'Import workflow from this URL:<br /><i>{plainTextData}<i>',
				},
			},
			executesTheWorkflowFromTheStartOrWebhookNode: 'Executes the Workflow from the Start or Webhook Node.',
			prompt: {
				cancel: 'Cancel',
				invalidName: 'Invalid Name',
				newName: 'New Name',
				rename: 'Rename',
				renameNode: 'Rename Node',
			},
			runButtonText: {
				executeWorkflow: 'Execute Workflow',
				executingWorkflow: 'Executing Workflow',
				waitingForWebhookCall: 'Waiting for Webhook-Call',
			},
			showError: {
				getWorkflowDataFromUrl: {
					message: 'There was a problem loading the workflow data from URL',
					title: 'Problem loading workflow',
				},
				importWorkflowData: {
					message: 'There was a problem importing workflow data',
					title: 'Problem importing workflow',
				},
				mounted1: {
					message: 'There was a problem loading init data',
					title: 'Init Problem',
				},
				mounted2: {
					message: 'There was a problem initializing the workflow',
					title: 'Init Problem',
				},
				openExecution: {
					message: 'There was a problem opening the execution',
					title: 'Problem loading execution',
				},
				openWorkflow: {
					message: 'There was a problem opening the workflow',
					title: 'Problem opening workflow',
				},
				stopExecution: {
					message: 'There was a problem stopping the execuction',
					title: 'Problem stopping execution',
				},
				stopWaitingForWebhook: {
					message: 'There was a problem deleting webhook',
					title: 'Problem deleting the test-webhook',
				},
			},
			showMessage: {
				addNodeButton: {
					message: 'Node of type {nodeTypeName} could not be created as it is not known.',
					title: 'Could not create node!',
				},
				keyDown: {
					message: 'A new workflow got created!',
					title: 'Created',
				},
				showMaxNodeTypeError: {
					message: {
						singular: 'Node can not be created because in a workflow max. {maxNodes} node of type {nodeTypeDataDisplayName} is allowed!',
						plural: 'Node can not be created because in a workflow max. {maxNodes} nodes of type {nodeTypeDataDisplayName} are allowed!',
					},
					title: 'Could not create node!',
				},
				stopExecutionCatch: {
					message: 'Unable to stop operation in time. Workflow finished executing already.',
					title: 'Workflow finished executing',
				},
				stopExecutionTry: {
					message: 'The execution with the id {executionId} got stopped!',
					title: 'Execution stopped',
				},
				stopWaitingForWebhook: {
					message: 'The webhook got deleted!',
					title: 'Webhook got deleted',
				},
			},
			stopCurrentExecution: 'Stop current execution',
			stoppingCurrentExecution: 'Stopping current execution',
		},
		nodeWebhooks: {
			displayUrlFor: 'Display URL for',
			showMessage: {
				message: 'The webhook URL was successfully copied!',
				title: 'Copied',
			},
			webhookUrls: 'Webhook URLs',
		},
		noTagsView: {
			createATag: 'Create a tag',
			readyToOrganizeYourWorkflows: 'Ready to organize your workflows?',
			withWorkflowTagsYouReFree: 'With workflow tags, you\'re free to create the perfect tagging system for your flows',
		},
		oauth2: {
			clientId: 'Client ID',
			clientSecret: 'Client Secret',
		},
		parameterInput: {
			addExpression: 'Add Expression',
			removeExpression: 'Remove Expression',
			resetValue: 'Reset Value',
			selectDateAndTime: 'Select date and time',
		},
		pushConnection: {
			showMessage: {
				runDataExecutedFinishedFalse: {
					message: {
						errorMessage1: 'There was a problem executing the workflow!',
						errorMessage2: 'There was a problem executing the workflow:<br /><strong>{receivedError}</strong>',
					},
					title: 'Problem executing workflow',
				},
				runDataExecutedFinishedTrue: {
					message: 'Workflow did get executed successfully!',
					title: 'Workflow got executed',
				},
			},
		},
		pushConnectionTracker: {
			cannotConnectToServer: 'Cannot connect to server.<br />It is either down or you have a connection issue. <br />It should reconnect automatically once the issue is resolved.',
			connectionLost: 'Connection lost',
		},
		runData: {
			copyItemPath: 'Copy Item Path',
			copyParameterPath: 'Copy Parameter Path',
			copyValue: 'Copy Value',
			dataOfExecution: 'Data of Execution',
			dataReturnedByTheNodeWillDisplayHere: 'Data returned by this node will display here.',
			displayDataAnyway: 'Display Data Anyway',
			entriesExistButThey: 'Entries exist but they do not contain any JSON data.',
			executeNode: 'Execute Node',
			executionTime: 'Execution Time',
			fileExtension: 'File Extension',
			fileName: 'File Name',
			items: 'Items',
			mimeType: 'Mime Type',
			ms: 'ms',
			noBinaryDataFound: 'No binary data found',
			noData: 'No data',
			nodeReturnedALargeAmountOfData: 'Node returned a large amount of data',
			noTextDataFound: 'No text data found',
			output: 'Output',
			showBinaryData: 'Show Binary Data',
			startTime: 'Start Time',
			theNodeContains: 'The node contains {numberOfKb} KB of data.<br />Displaying it could cause problems!<br /><br />If you do decide to display it, avoid the JSON view!',
		},
		saveWorkflowButton: {
			save: 'Save',
			saved: 'Saved',
		},
		tagsDropdown: {
			manageTags: 'Manage tags',
			noMatchingTagsExist: 'No matching tags exist',
			noTagsExist: 'No tags exist',
			showError: {
				message: 'A problem occurred when trying to create the {name} tag',
				title: 'New tag was not created',
			},
			typeToCreateATag: 'Type to create a tag',
		},
		tagsManager: {
			couldNotDeleteTag: 'Could not delete tag',
			done: 'Done',
			manageTags: 'Manage tags',
			showError: {
				onCreate: {
					message: 'A problem occurred when trying to create the {escapedName} tag',
					title: 'New tag was not created',
				},
				onDelete: {
					message: 'A problem occurred when trying to delete the {escapedName} tag',
					title: 'Tag was not deleted',
				},
				onUpdate: {
					message: 'A problem occurred when trying to update the {escapedName} tag',
					title: 'Tag was not updated',
				},
			},
			showMessage: {
				onDelete: {
					message: 'A problem occurred when trying to delete the {escapedName} tag',
					title: 'Tag was deleted',
				},
				onUpdate: {
					message: 'The {escapedOldName} tag was successfully updated to {escapedName}',
					title: 'Tag was updated',
				},
			},
		},
		tagsTable: {
			areYouSureYouWantToDeleteThisTag: 'Are you sure you want to delete this tag?',
			cancel: 'Cancel',
			createTag: 'Create tag',
			deleteTag: 'Delete tag',
			editTag: 'Edit Tag',
			name: 'Name',
			saveChanges: 'Save changes',
			usage: 'Usage',
		},
		tagsTableHeader: {
			addNew: 'Add new',
			searchTags: 'Search Tags',
		},
		tagsView: {
			inUse: {
				singular: '{count} workflow',
				plural: '{count} workflows',
			},
			notBeingUsed: 'Not being used',
		},
		variableSelectorItem: {
			empty: '--- EMPTY ---',
			selectItem: 'Select Item',
		},
		workflowActivator: {
			activateWorkflow: 'Activate workflow',
			confirmMessage: {
				cancelButtonText: '',
				confirmButtonText: 'Yes, activate and save!',
				headline: 'Activate and save?',
				message: 'When you activate the workflow all currently unsaved changes of the workflow will be saved.',
			},
			deactivateWorkflow: 'Deactivate workflow',
			showError: {
				message: 'There was a problem and the workflow could not be {newStateName}',
				title: 'Problem',
			},
			showMessage: {
				activeChangedNodesIssuesExistTrue: {
					message: 'It is only possible to activate a workflow when all issues on all nodes got resolved!',
					title: 'Problem activating workflow',
				},
				activeChangedWorkflowIdUndefined: {
					message: 'The workflow did not get saved yet so can not be set active!',
					title: 'Problem activating workflow',
				},
				displayActivationError: {
					message: {
						catchBlock: 'Sorry there was a problem requesting the error',
						errorDataNotUndefined: 'The following error occurred on workflow activation:<br /><i>{message}</i>',
						errorDataUndefined: 'Sorry there was a problem. No error got found to display.',
					},
					title: 'Problem activating workflow',
				},
			},
			theWorkflowIsSetToBeActiveBut: 'The workflow is set to be active but could not be started.<br />Click to display error message.',
		},
		workflowDetails: {
			active: 'Active',
			addTag: 'Add tag',
			showMessage: {
				message: 'Please enter a name, or press \'esc\' to go back to the old one.',
				title: 'Name missing',
			},
		},
		workflowHelpers: {
			showMessage: {
				saveAsNewWorkflow: {
					message: 'There was a problem saving the workflow',
					title: 'Problem saving workflow',
				},
				saveCurrentWorkflow: {
					message: 'There was a problem saving the workflow',
					title: 'Problem saving workflow',
				},
			},
		},
		workflowOpen: {
			active: 'Active',
			confirmMessage: {
				cancelButtonText: '',
				confirmButtonText: 'Yes, switch workflows and forget changes',
				headline: 'Save your Changes?',
				message: 'When you switch workflows your current workflow changes will be lost.',
			},
			created: 'Created',
			filterByTags: 'Filter by tags...',
			name: 'Name',
			openWorkflow: 'Open Workflow',
			searchWorkflows: 'Deutsch',
			showError: {
				message: 'There was a problem loading the workflows',
				title: 'Problem loading workflows',
			},
			showMessage: {
				message: 'This is the current workflow',
				title: 'Already open',
			},
			updated: 'Updated',
		},
		workflowRun: {
			showError: {
				message: 'There was a problem running the workflow',
				title: 'Problem running workflow',
			},
			showMessage: {
				message: 'The workflow has issues. Please fix them first',
				title: 'Workflow can not be executed',
			},
		},
		workflowSettings: {
			editExpression: 'Edit Expression',
			errorWorkflow: 'Error Workflow',
			helpTexts: {
				errorWorkflow: 'The workflow to run in case the current one fails.<br />To function correctly that workflow has to contain an \'Error Trigger\' node!',
				executionTimeout: 'After what time the workflow should timeout.',
				executionTimeoutToggle: 'Cancel workflow execution after defined time',
				saveDataErrorExecution: 'If data data of executions should be saved in case they failed.',
				saveDataSuccessExecution: 'If data data of executions should be saved in case they succeed.',
				saveExecutionProgress: 'If data should be saved after each node, allowing you to resume in case of errors from where it stopped. May increase latency.',
				saveManualExecutions: 'If data data of executions should be saved when started manually from the editor.',
				timezone: 'The timezone in which the workflow should run. Gets for example used by \'Cron\' node.',
			},
			hours: 'hours',
			minutes: 'minutes',
			noWorkflow: '- No Workflow -',
			save: 'Save',
			saveDataErrorExecution: 'Save Data Error Execution',
			saveDataErrorExecutionOptions: {
				defaultSave: 'Default - ({defaultValue})',
				doNotSave: 'Do not save',
				save: 'Save',
			},
			saveDataSuccessExecution: 'Save Data Success Execution',
			saveDataSuccessExecutionOptions: {
				defaultSave: 'Default - ({defaultValue})',
				doNotSave: 'Do not save',
				save: 'Save',
			},
			saveExecutionProgress: 'Save Execution Progress',
			saveExecutionProgressOptions: {
				defaultSave: 'Default - ({defaultValue})',
				no: 'No',
				yes: 'Yes',
			},
			saveManualExecutions: 'Save Manual Executions',
			saveManualOptions: {
				defaultSave: 'Default - ({defaultValue})',
				no: 'No',
				yes: 'Yes',
			},
			seconds: 'seconds',
			showError: {
				openDialog: {
					message: 'The following error occurred loading the data',
					title: 'Problem loading settings',
				},
				saveSettings1: {
					errorMessage: 'timeout is activated but set to 0',
					message: 'There was a problem saving the settings',
					title: 'Problem saving settings',
				},
				saveSettings2: {
					errorMessage: 'Maximum Timeout is: {hours} hours, {minutes} minutes, {seconds} seconds',
					message: 'Set timeout is exceeding the maximum timeout!',
					title: 'Problem saving settings',
				},
				saveSettings3: {
					message: 'There was a problem saving the settings',
					title: 'Problem saving settings',
				},
			},
			showMessage: {
				openDialog: {
					message: 'No workflow active to display settings of.',
					title: 'No workflow active',
				},
				saveSettings: {
					message: 'The workflow settings got saved!',
					title: 'Settings saved',
				},
			},
			timeoutAfter: 'Timeout After',
			timeoutWorkflow: 'Timeout Workflow',
			timezone: 'Timezone',
			workflowSettings: 'Workflow Settings',
		},

		'n8n-nodes-base': {}, // required for node translation
	},
};
