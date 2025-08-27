/**
 * n8n workflow. This is a simplified version of the actual workflow object.
 */
export type Workflow = {
	id: string;
	name: string;
	tags?: string[];
};

export type Credential = {
	id: string;
	name: string;
	type: string;
};
