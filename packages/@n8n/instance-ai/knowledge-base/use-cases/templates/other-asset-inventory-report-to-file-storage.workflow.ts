// Use case: other / Asset Inventory Report to File Storage.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Setup: the asset inventory API needs a header API key credential. GET .../assets returns
// an array of { id, name, serial, assigned_to }. GET .../users returns an array of
// { id, name, email }. assigned_to on an asset matches id on a user.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	merge,
} from '@n8n/workflow-sdk';

// Runs twice a day.
const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Twice a Day',
		parameters: {
			rule: {
				interval: [
					{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 0 },
					{ field: 'days', daysInterval: 1, triggerAtHour: 18, triggerAtMinute: 0 },
				],
			},
		},
	},
});

// Gets the hardware assets from the asset inventory API.
const getHardware = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Get Hardware',
		credentials: { httpTemplatedCustomAuth: newCredential('Asset inventory API') },
		parameters: {
			method: 'GET',
			url: placeholder('Asset inventory API URL, for example https://api.example.com/assets'),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
		},
	},
	output: [
		{ id: '1001', name: 'ThinkPad X1', serial: 'SN-10001', assigned_to: '501' },
		{ id: '1002', name: 'MacBook Pro 14', serial: 'SN-10002', assigned_to: '502' },
	],
});

// Gets the users from the same asset inventory API.
const getUsers = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Get Users',
		credentials: { httpTemplatedCustomAuth: newCredential('Asset inventory API') },
		parameters: {
			method: 'GET',
			url: placeholder('Asset inventory API URL, for example https://api.example.com/users'),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
		},
	},
	output: [
		{ id: '501', name: 'Jane Doe', email: 'jane.doe@example.com' },
		{ id: '502', name: 'John Smith', email: 'john.smith@example.com' },
	],
});

// Adds the matching user's fields to each asset.
const addOwnerNames = merge({
	version: 3.2,
	config: {
		name: 'Add Owner Names',
		parameters: {
			mode: 'combine',
			combineBy: 'combineByFields',
			advanced: true,
			mergeByFields: { values: [{ field1: 'assigned_to', field2: 'id' }] },
			joinMode: 'enrichInput1',
			options: {},
		},
	},
});

// Converts the joined rows to a CSV file.
const buildCsv = node({
	type: 'n8n-nodes-base.convertToFile',
	version: 1.1,
	config: {
		name: 'Build CSV',
		parameters: { operation: 'csv', options: { fileName: 'assets.csv' } },
	},
});

// [file storage] Box. Swap for another file storage tool: replace this node only.
// It reads the CSV binary file from Build CSV.
const uploadReport = node({
	type: 'n8n-nodes-base.box',
	version: 1,
	config: {
		name: 'Upload Report',
		credentials: { boxOAuth2Api: newCredential('Box account') },
		parameters: {
			resource: 'file',
			operation: 'upload',
			binaryData: true,
			parentId: placeholder('Box folder ID to upload the report into'),
		},
	},
});

export default workflow('id', 'Asset Inventory Report to File Storage')
	.add(schedule)
	.to(getHardware)
	.to(addOwnerNames.input(0))
	.add(schedule)
	.to(getUsers)
	.to(addOwnerNames.input(1))
	.add(addOwnerNames)
	.to(buildCsv)
	.to(uploadReport);
