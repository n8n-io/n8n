import type { INode, INodeCredentialsDetails } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { WorkflowTestError } from './errors';
import type { MockOutput } from './mock-node';
import {
	subWorkflowIssues,
	type IssueProducer,
	type WorkflowSetIssue,
} from './sub-workflows/issues';
import { deriveRequirements, type WorkflowSetRequirements } from './sub-workflows/requirements';

export type NodeDefinition = Omit<INode, 'position' | 'onError' | 'credentials'> & {
	position: number[];
	onError?: string;
	credentials?: Record<string, INodeCredentialsDetails | undefined>;
};

export interface ConnectionDefinition {
	node: string;
	type: string;
	index: number;
}

export interface WorkflowDefinition {
	id?: string;
	name: string;
	nodes: NodeDefinition[];
	connections: Record<string, Record<string, Array<ConnectionDefinition[] | null>>>;
	settings?: { timezone?: string; executionOrder?: string; [setting: string]: unknown };
}

export interface NodeReference {
	readonly workflow: WorkflowHandle;
	readonly name: string;
}

export class WorkflowHandle {
	readonly mocks = new Map<string, MockOutput>();

	constructor(
		readonly definition: WorkflowDefinition,
		readonly set: WorkflowSet,
	) {}

	get id() {
		return this.definition.id;
	}

	get name() {
		return this.definition.name;
	}

	node(name: string): NodeReference {
		const names = this.definition.nodes.map((node) => node.name);
		if (!names.includes(name)) {
			throw new WorkflowTestError(
				'NODE_NOT_FOUND',
				`Workflow "${this.name}" has no node "${name}". Nodes: ${names.join(', ')}`,
				{ workflow: this.name, node: name },
			);
		}
		return { workflow: this, name };
	}
}

export interface WorkflowSetSource {
	issueProducers: IssueProducer[];
	requirements?: WorkflowSetRequirements;
	idsByTarget?: Map<string, string>;
}

export class WorkflowSet {
	readonly workflows: WorkflowHandle[];

	constructor(
		definitions: WorkflowDefinition[],
		private readonly source: WorkflowSetSource = { issueProducers: [subWorkflowIssues] },
	) {
		this.workflows = definitions.map(
			(definition) => new WorkflowHandle(deepCopy(definition), this),
		);
	}

	get requirements(): WorkflowSetRequirements {
		return this.source.requirements ?? deriveRequirements(this);
	}

	issues(): WorkflowSetIssue[] {
		return this.source.issueProducers.flatMap((produce) => produce(this));
	}

	get(selector: string): WorkflowHandle {
		const id = this.source.idsByTarget?.get(selector) ?? selector;
		const byId = this.workflows.find((workflow) => workflow.id === id);
		if (byId) return byId;

		const byName = this.workflows.filter((workflow) => workflow.name === selector);
		if (byName.length === 1) return byName[0];
		if (byName.length > 1) {
			const ids = byName.map((workflow) => this.describeId(workflow)).join(', ');
			throw new WorkflowTestError(
				'WORKFLOW_AMBIGUOUS',
				`More than one workflow is named "${selector}". Select one by ID: ${ids}`,
			);
		}

		const names = this.workflows.map((workflow) => workflow.name).join(', ');
		throw new WorkflowTestError(
			'WORKFLOW_NOT_FOUND',
			`No workflow has the name or ID "${selector}". Workflows: ${names}`,
		);
	}

	private describeId({ id }: WorkflowHandle) {
		const target = [...(this.source.idsByTarget ?? [])].find(([, targetId]) => targetId === id);
		return target ? `${id} (${target[0]})` : id;
	}
}

export function loadWorkflows(definitions: WorkflowDefinition[]): WorkflowSet {
	return new WorkflowSet(definitions);
}

export function loadWorkflow(definition: WorkflowDefinition): WorkflowHandle {
	return loadWorkflows([definition]).workflows[0];
}
