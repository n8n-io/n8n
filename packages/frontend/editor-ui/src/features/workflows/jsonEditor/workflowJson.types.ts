import type { IConnections, INode, IPinData, IWorkflowSettings } from 'n8n-workflow';

export type JsonPath = Array<string | number>;

export type TextRange = { from: number; to: number };

export type WorkflowNodeRef = { id?: string; name?: string };

/** The workflow as the JSON panel shows it: the saved form, without default parameter values. */
export type WorkflowJson = {
	name?: string;
	nodes: INode[];
	connections: IConnections;
	pinData?: IPinData;
	settings?: IWorkflowSettings;
};

export type WorkflowJsonIssue = {
	severity: 'error' | 'warning';
	path: JsonPath;
	message: string;
};
