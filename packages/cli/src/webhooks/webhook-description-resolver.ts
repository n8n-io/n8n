import { ExpressionEngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	IExecuteData,
	INode,
	IWebhookDescription,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValueType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { resolveNativeParameterValue } from 'n8n-workflow';

/** Drops the one object-valued entry, `resolve`, which is never evaluated. */
const fieldValue = (value: IWebhookDescription[string]) =>
	typeof value === 'object' ? undefined : value;

/**
 * Reads a field off a node's webhook description, natively where that provably
 * yields what the expression engine would, otherwise through the engine. What
 * the native path saves is an isolate per request, so it is taken on every
 * engine but `legacy`, which has none to build. `LiveWebhooks` skips acquiring
 * that isolate on the strength of the same checks, so every description read on
 * that path has to go through here.
 */
@Service()
export class WebhookDescriptionResolver {
	constructor(private readonly engineConfig: ExpressionEngineConfig) {}

	simple<T extends boolean | number | string | unknown[]>(
		workflow: Workflow,
		node: INode,
		description: IWebhookDescription,
		field: keyof IWebhookDescription,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys = {},
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		const value = fieldValue(description[field]);
		if (value === undefined) return defaultValue;

		const native = this.resolveNatively(workflow, node, description, field, value);
		if (native.resolved) return native.value as T | undefined;

		return workflow.expression.getSimpleParameterValue(
			node,
			value,
			mode,
			additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}

	complex<T extends NodeParameterValueType>(
		workflow: Workflow,
		node: INode,
		description: IWebhookDescription,
		field: keyof IWebhookDescription,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys = {},
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		const value = fieldValue(description[field]);
		if (value === undefined) return defaultValue;

		const native = this.resolveNatively(workflow, node, description, field, value);
		if (native.resolved) return native.value as T | undefined;

		return workflow.expression.getComplexParameterValue(
			node,
			value,
			mode,
			additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}

	private resolveNatively(
		workflow: Workflow,
		node: INode,
		description: IWebhookDescription,
		field: keyof IWebhookDescription,
		value: string | boolean,
	) {
		if (!this.instanceCanResolveNatively) return { resolved: false } as const;

		// The engine's `$parameter` proxy reads the workflow's own node - with
		// node-type defaults filled in — regardless of which node object we hold.
		const ownNode = workflow.getNode(node.name);
		if (ownNode === null) return { resolved: false } as const;

		return resolveNativeParameterValue(ownNode, value, description.resolve?.[field]);
	}

	private get instanceCanResolveNatively(): boolean {
		const { engine, preferNativeWebhookResolution } = this.engineConfig;
		return engine !== 'legacy' && preferNativeWebhookResolution;
	}
}
