export default {
	en: {

		nodeViewError: {
			error: 'ERROR',
			details: 'Details',
			dataBelowMayContain: 'Data below may contain sensitive information. Proceed with caution when sharing.',
			stack: 'Stack',
		},

		noTagsView: {
			readyToOrganizeYourWorkflows: 'Ready to organize your workflows?',
			withWorkflowTagsYouReFree: 'With workflow tags, you\'re free to create the perfect tagging system for your flows',
			createATag: 'Create a tag',
		},

		tagsTable: {
			areYouSureYouWantToDeleteThisTag: 'Are you sure you want to delete this tag?',
			createTag: 'Create tag',
			saveChanges: 'Save changes',
			deleteTag: 'Delete tag',
		},

		tagsTableHeader: {
			addNew: 'Add new',
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
			credentialType: 'Credential type:',
		},

		credentialsInput: {
			credentialsName: 'Credentials Name:',
			credentialData: 'Credential Data:',
			enterAllProperties: 'Enter all required properties',
			connected: 'Connected',
			notConnected: 'Not connected',
			oAuth2CallbackUrl: 'OAuth Callback URL',
			nodesWithAccess: 'Nodes with access:',
			important: 'Important',
			addAtLeastOneNodeWhichHasAccessToTheCredentials: 'Add at least one node which has access to the credentials!',
			save: 'Save',
			create: 'Create',
		},

		credentialsList: {
			yourSavedCredentials: 'Your saved credentials:',
			addNew: 'Add New',
		},

		dataDisplay: {
			nodeDocumentation: 'Node Documentation',
			openDocumentationFor: 'Open documentation for',
		},

		duplicateWorkflowDialog: {
			enterWorkflowName: 'Enter workflow name',
			// search: placeholder="
			save: 'Save',
			cancel: 'Cancel',
		},

		executionsList: {
			filters: 'Filters:',
			autoRefresh: 'Auto refresh',
			selected: 'Selected', // mind the whitespace+colon
			checkAll: 'Check all',
			runningParens: '(running)',
			successRetry: 'Success retry',
			running: 'Running',
			success: 'Success',
			error: 'Error',
			unknown: 'Unknown',
			retryWithCurrentlySavedWorkflow: 'Retry with currently saved workflow',
			retryWithOriginalworkflow: 'Retry with original workflow',
			loadMore: 'Load More',
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
		},

		multipleParameter: {
			currentlyNoItemsExist: 'Currently no items exist',
		},

		nodeCreateList: {
			noNodesMatchYourSearchCriteria: '🙃 no nodes matching your search criteria',
		},

		nodeCreator: {
			createNode: 'Create Node',
		},

		nodeCredentials: {
			credentials: 'Credentials',
		},

		nodeSettings: {
			theNodeIsNotValidAsItsTypeIsUnknown: 'The node is not valid as its type is unknown.', // middle problem
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
			startTime: 'Start Time', // semicolon
			executionTime: 'Execution Time', // semicolon
			output: 'Output', // pipe and colon
			dataOfExecution: 'Data of Execution', // pipe and colon
			copyItemPath: 'Copy Item Path',
			copyParameterPath: 'Copy Parameter Path',
			copyValue: 'Copy Value',
			nodeReturnedALargeAmountOfData: 'Node returned a large amount of data',
			theNodeContains: 'The node contains {{parseInt(dataSize/1024).toLocaleString()}} KB of data.<br />Displaying it could cause problems!<br /><br />If you do decide to display it, avoid the JSON view!', // middle problem
			displayDataAnyway: 'Display Data Anyway',
			noTextDataFound: 'No text data found',
			entriesExistButThey: 'Entries exist but they do not contain any JSON data.',
			noBinaryDataFound: 'No binary data found',
			fileName: 'File Name', // mind the colon
			fileExtension: 'File Extension',
			mimeType: 'Mime Type',
			showBinaryData: 'Show Binary Data',
			dataReturnedByTheNodeWillDisplayHere: 'Data returned by this node will display here.',
			noData: 'No data',
		},

		saveWorkflowButton: {
			save: 'Save',
		},

		tagsDropdown: {
			typeToCreateATag: 'Type to create a tag',
			noMatchingTagsExist: 'No matching tags exist',
			noTagsExist: 'No tags exist',
			manageTags: 'Manage tags',
		},

		variableSelectorItem: {
			selectItem: 'Select Item',
			empty: 'EMPTY', // middle
		},

		workflowActivator: {
			theWorkflowIsSetToBeActiveBut: 'The workflow is set to be active but could not be started.<br />Click to display error message.</div>',
		},

		workflowSettings: {
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
		},

		nodeView: {
			currentlyNoItemsExist: 'Currently no items exist',
			parameters: 'Parameters',
			settings: 'Settings',
		},

		'n8n-nodes-base': {},
	},
};
