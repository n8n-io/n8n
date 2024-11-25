import type {
	FunctionsBase,
	INode,
	INodeExecutionData,
	IWorkflowExecuteAdditionalData,
	NodeTypeAndVersion,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { deepCopy, LoggerProxy } from 'n8n-workflow';
import { Container } from 'typedi';

import { InstanceSettings } from '@/InstanceSettings';

export abstract class NodeExecutionContext implements Omit<FunctionsBase, 'getCredentials'> {
	protected readonly instanceSettings = Container.get(InstanceSettings);

	constructor(
		protected readonly workflow: Workflow,
		protected readonly node: INode,
		protected readonly additionalData: IWorkflowExecuteAdditionalData,
		protected readonly mode: WorkflowExecuteMode,
	) {}

	get logger() {
		return LoggerProxy;
	}

	getExecutionId() {
		return this.additionalData.executionId!;
	}

	getNode(): INode {
		return deepCopy(this.node);
	}

	getWorkflow() {
		const { id, name, active } = this.workflow;
		return { id, name, active };
	}

	getMode() {
		return this.mode;
	}

	getWorkflowStaticData(type: string) {
		return this.workflow.getStaticData(type, this.node);
	}

	getChildNodes(nodeName: string) {
		const output: NodeTypeAndVersion[] = [];
		const nodeNames = this.workflow.getChildNodes(nodeName);

		for (const n of nodeNames) {
			const node = this.workflow.nodes[n];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: node.disabled ?? false,
			});
		}
		return output;
	}

	getParentNodes(nodeName: string) {
		const output: NodeTypeAndVersion[] = [];
		const nodeNames = this.workflow.getParentNodes(nodeName);

		for (const n of nodeNames) {
			const node = this.workflow.nodes[n];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: node.disabled ?? false,
			});
		}
		return output;
	}

	getKnownNodeTypes() {
		return this.workflow.nodeTypes.getKnownTypes();
	}

	getRestApiUrl() {
		return this.additionalData.restApiUrl;
	}

	getInstanceBaseUrl() {
		return this.additionalData.instanceBaseUrl;
	}

	getInstanceId() {
		return this.instanceSettings.instanceId;
	}

	getTimezone() {
		return this.workflow.timezone;
	}

	getCredentialsProperties(type: string) {
		return this.additionalData.credentialsHelper.getCredentialsProperties(type);
	}

	async prepareOutputData(outputData: INodeExecutionData[]) {
		return [outputData];
	}
}
