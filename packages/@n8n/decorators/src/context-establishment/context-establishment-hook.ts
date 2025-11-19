import type { Constructable } from '@n8n/di';
import type { IExecutionContext, INode, INodeExecutionData, IWorkflowBase } from 'n8n-workflow';

export type ContextEstablishmentOptions = {
	triggerNode: INode;
	workflow: IWorkflowBase;
	triggerItem?: INodeExecutionData[];
	context: IExecutionContext;
	options?: Record<string, unknown>;
};

export type ContextEstablishmentResult = {
	triggerItem: INodeExecutionData[] | undefined;
	contextUpdate: Partial<IExecutionContext>;
};

export interface IContextEstablishmentHook {
	name: string;

	execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult>;

	// We need a function to select which trigger nodes are applicable for this hook
	isApplicableToTriggerNode?(nodeType: string): boolean;

	// We need to extend this interface to support UI options in the future as well
}

export type ContextEstablishmentHookClass = Constructable<IContextEstablishmentHook>;
