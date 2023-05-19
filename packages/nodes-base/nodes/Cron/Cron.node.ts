import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	TriggerTime,
} from 'n8n-workflow';
import { NodeHelpers, toCronExpression } from 'n8n-workflow';

import { CronJob } from 'cron';

export class Cron implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cron',
		name: 'cron',
		icon: 'fa:clock',
		group: ['trigger', 'schedule'],
		version: 1,
		hidden: true,
		description: 'Triggers the workflow at a specific time',
		eventTriggerDescription: '',
		activationMessage:
			'Your cron trigger will now trigger executions on the schedule you have defined.',
		defaults: {
			name: 'Cron',
			color: '#29a568',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking ‘execute workflow’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Trigger Times',
				name: 'triggerTimes',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Time',
				},
				default: {},
				description: 'Triggers for the workflow',
				placeholder: 'Add Cron Time',
				options: NodeHelpers.cronNodeOptions,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerTimes = this.getNodeParameter('triggerTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const cronTimes = (triggerTimes.item || []).map(toCronExpression);

		// The trigger function to execute when the cron-time got reached
		// or when manually triggered
		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		const timezone = this.getTimezone();

		// Start the cron-jobs
		const cronJobs = cronTimes.map(
			(cronTime) => new CronJob(cronTime, executeTrigger, undefined, true, timezone),
		);

		// Stop the cron-jobs
		async function closeFunction() {
			for (const cronJob of cronJobs) {
				cronJob.stop();
			}
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
