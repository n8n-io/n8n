import { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

export const FIRST_CREDENTIAL_ID = '1';
export const SECOND_CREDENTIAL_ID = '2';
export const THIRD_CREDENTIAL_ID = '3';

const NODE_WITH_NO_CRED = '0133467b-df4a-473d-9295-fdd9d01fa45a';
const NODE_WITH_ONE_CRED = '4673f869-f2dc-4a33-b053-ca3193bc5226';
const NODE_WITH_TWO_CRED = '9b4208bd-8f10-4a6a-ad3b-da47a326f7da';

const nodeWithNoCredentials: INode = {
	id: NODE_WITH_NO_CRED,
	name: 'Node with no Credential',
	typeVersion: 1,
	type: 'n8n-nodes-base.fakeNode',
	position: [0, 0],
	credentials: {},
	parameters: {},
};

const nodeWithOneCredential: INode = {
	id: NODE_WITH_ONE_CRED,
	name: 'Node with a single credential',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		test: {
			id: FIRST_CREDENTIAL_ID,
			name: 'First fake credential',
		},
	},
	parameters: {},
};

const nodeWithTwoCredentials: INode = {
	id: NODE_WITH_TWO_CRED,
	name: 'Node with two credentials',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		mcTest: {
			id: SECOND_CREDENTIAL_ID,
			name: 'Second fake credential',
		},
		mcTest2: {
			id: THIRD_CREDENTIAL_ID,
			name: 'Third fake credential',
		},
	},
	parameters: {},
};

export function getWorkflow(options?: {
	addNodeWithoutCreds?: boolean;
	addNodeWithOneCred?: boolean;
	addNodeWithTwoCreds?: boolean;
}) {
	const workflow = new WorkflowEntity();

	workflow.nodes = [];

	if (options?.addNodeWithoutCreds) {
		workflow.nodes.push(nodeWithNoCredentials);
	}

	if (options?.addNodeWithOneCred) {
		workflow.nodes.push(nodeWithOneCredential);
	}

	if (options?.addNodeWithTwoCreds) {
		workflow.nodes.push(nodeWithTwoCredentials);
	}

	return workflow;
}
