/* eslint-disable import/no-cycle */
import express = require('express');
import { User } from './databases/entities/User';

// ----------------------------------
//      requests to /workflows
// ----------------------------------

type Node = {
	parameters: object;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
};

type CreateWorkflowPayload = Partial<{
	id: string; // delete if sent
	name: string;
	nodes: Node[];
	connections: object;
	active: boolean;
	settings: object;
	tags: string[];
}>;

export declare namespace WorkflowRequest {
	type Create = express.Request<{}, {}, CreateWorkflowPayload> & { user: User };

	type Get = express.Request<{ id: string }> & { user: User };
}
