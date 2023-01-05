import { mocked } from 'jest-mock';
import type { INode, IWorkflowCredentials } from 'n8n-workflow';
import * as Db from '@/Db';
import { WorkflowCredentials } from '@/WorkflowCredentials';

// Define a function used to mock the findOne function
async function mockFind({
	id,
	type,
}: {
	id: string;
	type: string;
}): Promise<IWorkflowCredentials | null> {
	// Simple statement that maps a return value based on the `id` parameter
	if (id === notFoundNode.credentials!!.test.id) {
		return null;
	}
	// Otherwise just build some kind of credential object and return it
	return {
		[type]: {
			[id]: {
				id: id,
				name: type,
				type: type,
				nodesAccess: [],
				data: '',
			},
		},
	};
}

jest.mock('@/Db', () => {
	return {
		collections: {
			Credentials: {
				findOne: jest.fn(mockFind),
			},
		},
	};
});

// Create an array of Nodes with info that pass or fail the checks as required.
// DB returns an object of type { [id: string]: ICredentialsEncrypted } but as it isn't checked
// All the mock will need to return is some form of Object when successful

describe('WorkflowCredentials', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	test('Should return an error if any node has no credential ID', () => {
		const credentials = noIdNode.credentials!!.test;
		const expectedError = new Error(
			`Credentials with name "${credentials.name}" for type "test" miss an ID.`,
		);
		expect(WorkflowCredentials([noIdNode])).rejects.toEqual(expectedError);
		expect(mocked(Db.collections.Credentials.findOne)).toHaveBeenCalledTimes(0);
	});

	test('Should return an error if credentials cannot be found in the DB', () => {
		const credentials = notFoundNode.credentials!!.test;
		const expectedError = new Error(
			`Could not find credentials for type "test" with ID "${credentials.id}".`,
		);
		expect(WorkflowCredentials([notFoundNode])).rejects.toEqual(expectedError);
		expect(mocked(Db.collections.Credentials.findOne)).toHaveBeenCalledTimes(1);
	});

	test('Should ignore duplicates', async () => {
		const response = await WorkflowCredentials([validNode, validNode, validNode]);
		expect(Object.keys(response)).toEqual(['test']);
	});

	test('Should ignore Nodes with no credentials set', async () => {
		const response = await WorkflowCredentials([validNode, noCredentialsNode]);
		expect(Object.keys(response)).toEqual(['test']);
	});

	test('Should work for Nodes with multiple credentials', async () => {
		const response = await WorkflowCredentials([multiCredNode]);
		expect(Object.keys(response)).toEqual(['mcTest', 'mcTest2']);
	});
});

const validNode: INode = {
	id: '1',
	name: 'Node with Valid Credentials',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		test: {
			id: 'cred#1',
			name: 'Test Credentials',
		},
	},
	parameters: {},
};

const noIdNode: INode = {
	id: '2',
	name: 'Node with no Credential ID',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		test: {
			id: null,
			name: 'NOFIND',
		},
	},
	parameters: {},
};

const notFoundNode: INode = {
	id: '3',
	name: 'Node that will not be found in the DB',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		test: {
			id: 'noDB',
			name: 'Not in Database',
		},
	},
	parameters: {},
};

const noCredentialsNode: INode = {
	id: '4',
	name: 'Node that has no credentials',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	parameters: {},
};

// Reference this as a DataObject so I can provide a null credential for testing
const multiCredNode: INode = {
	id: '5',
	name: 'Node that has mutliple credential elements',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		mcTest: {
			id: 'multicred#1',
			name: 'First of Multiple Credentials',
		},
		mcTest2: {
			id: 'multicred#2',
			name: 'Second of Multiple Credentials',
		},
	},
	parameters: {},
};
