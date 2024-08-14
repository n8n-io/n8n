/**
 * n8n workflow. This is a simplified version of the actual workflow object.
 */
export interface Workflow {
	id: string;
	name: string;
	tags?: string[];
}
