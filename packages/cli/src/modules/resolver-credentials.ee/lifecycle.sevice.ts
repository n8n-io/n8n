import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { Cipher, ExecuteContext } from 'n8n-core';
import {
	IExecuteData,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

type BeforeWorkflowExecute = {
	type: 'workflowExecuteBefore';
	workflow: IWorkflowBase;
	workflowInstance: Workflow;
	executionData: IRunExecutionData | undefined;
	additionalData: IWorkflowExecuteAdditionalData | undefined;
};

@Service()
export class LifecycleService {
	constructor(private readonly logger: Logger) {
		this.logger.debug('LifecycleService initialized');
	}

	init() {
		this.logger.debug('LifecycleService initialized');
		const encrypted = Container.get(Cipher).encrypt({
			__resolver: 'a08cb79f-2c32-48d5-aef9-c3e20d8d3305',
			engine: 'direct_map',
			token: 'fallback token in main credential',
		});

		this.logger.debug('Encryption successful', { encrypted });
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	async contextSetup(arg: BeforeWorkflowExecute) {
		// { "data": { "main": [[{ "json": { "headers": { "host": "localhost: 5678", "user-agent": "curl/8.7.1", "accept": "*/*" }, "params": { }, "query": { }, "body": { }, "webhookUrl": "http: //localhost: 5678/webhook/48388ca7-5223-4e3b-96a6-a331fdf88cea", "executionMode": "production" } }]] }
		// arg.executionData?.executionData?.nodeExecutionStack[0].data
		this.logger.debug('Context setup for workflow execution', {
			data: arg.executionData?.executionData?.nodeExecutionStack[0].data,
		});
		if (arg.executionData) {
			const triggerData = arg.executionData.executionData!.nodeExecutionStack[0].data.main[0]![0];
			const executionHook = arg.workflowInstance.getNode('ExecutionHook');
			if (executionHook && executionHook.type === 'n8n-nodes-base.code') {
				const node = arg.workflowInstance.nodeTypes.getByNameAndVersion(
					executionHook.type,
					executionHook.typeVersion,
				);
				if (node) {
					const context = new ExecuteContext(
						arg.workflowInstance,
						executionHook,
						arg.additionalData!,
						'internal',
						arg.executionData,
						0,
						[triggerData],
						arg.executionData.executionData!.nodeExecutionStack[0].data,
						{} as IExecuteData,
						[],
					);
					try {
						const output = await node.execute?.call(context);
						arg.executionData.executionContext = output[0][0].json.token as string;
						arg.executionData.executionData!.nodeExecutionStack[0].data.main[0]![0].json =
							output[0][0].json.item;
						this.logger.debug('ExecutionHook executed successfully', { output });
					} catch (error) {
						this.logger.error('ExecutionHook execution failed', { error });
					}
					this.logger.debug('ExecutionHook executed successfully');
				}
			}
			// delete (arg.executionData.executionData?.nodeExecutionStack[0].data as any).main![0]![0]!.json!.headers['x-auth-token'];
			// TODO: build context based on workflow data logged above!
		}
		await Promise.resolve();
	}
}
