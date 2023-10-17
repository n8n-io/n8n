import { LoggerProxy } from 'n8n-workflow';
import { debounceMessageReceiver, messageToRedisServiceCommandObject } from '../helpers';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import Container from 'typedi';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { License } from '@/License';
import * as Db from '@/Db';
import { ActiveWorkflowRunner } from '../../../ActiveWorkflowRunner';
import { OrchestrationMainService } from './orchestration.main.service';

export async function handleCommandMessageMain(messageString: string) {
	const queueModeId = config.get('redis.queueModeId');
	const isMainInstance = config.get('generic.instanceType') === 'main';
	const message = messageToRedisServiceCommandObject(messageString);

	if (message) {
		LoggerProxy.debug(
			`RedisCommandHandler(main): Received command message ${message.command} from ${message.senderId}`,
		);
		if (
			message.senderId === queueModeId ||
			(message.targets && !message.targets.includes(queueModeId))
		) {
			// Skipping command message because it's not for this instance
			LoggerProxy.debug(
				`Skipping command message ${message.command} because it's not for this instance.`,
			);
			return message;
		}
		switch (message.command) {
			case 'reloadLicense':
				if (!debounceMessageReceiver(message, 500)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				if (isMainInstance) {
					// at this point in time, only a single main instance is supported, thus this command _should_ never be caught currently
					LoggerProxy.error(
						'Received command to reload license via Redis, but this should not have happened and is not supported on the main instance yet.',
					);
					return message;
				}
				await Container.get(License).reload();
				break;
			case 'restartEventBus':
				if (!debounceMessageReceiver(message, 200)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				await Container.get(MessageEventBus).restart();
				break;
			case 'reloadExternalSecretsProviders':
				if (!debounceMessageReceiver(message, 200)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				await Container.get(ExternalSecretsManager).reloadAllProviders();
				break;
			case 'workflowWasUpdated':
				if (!debounceMessageReceiver(message, 100)) {
					message.payload = {
						result: 'debounced',
					};
					return message;
				}
				// only the current leader should need to re-activate workflows
				if (!message.payload?.workflowId || message.senderId === queueModeId) {
					return message;
				}
				if (Container.get(OrchestrationMainService).isLeader) {
					try {
						const workflow = await Db.collections.Workflow.findOne({
							where: {
								id: message.payload.workflowId as string,
							},
							select: ['id', 'active'],
						});
						// await Container.get(ExternalHooks).run('workflow.activate', [updatedWorkflow]);
						if (workflow) {
							await Container.get(ActiveWorkflowRunner).remove(workflow.id);
							await Container.get(ActiveWorkflowRunner).add(
								workflow.id,
								workflow.active ? 'update' : 'activate',
							);
							await Container.get(OrchestrationMainService).workflowWasActivated(
								workflow.id,
								[message.senderId],
								(message.payload.pushSessionId as string) ?? '',
							);
						}
					} catch (error) {
						LoggerProxy.error(
							`Error while trying to handle workflow update: ${(error as Error).message}`,
						);
					}
				}
				break;
			case 'workflowWasActivated':
				if (!message.payload?.workflowId || !message.payload?.pushSessionId) {
					return message;
				}
				// TODO: inform frontend of workflow activation result
				break;
			default:
				break;
		}
		return message;
	}
	return;
}
