import { Service } from '@n8n/di';
import type { INode, IWebhookResponseData } from 'n8n-workflow';

export interface TriggerAuthIdentitySeeder {
	seed(webhookResultData: IWebhookResponseData, triggerNode: INode): Promise<void>;
}

@Service()
export class TriggerAuthIdentitySeederProxy implements TriggerAuthIdentitySeeder {
	private seeder: TriggerAuthIdentitySeeder | null = null;

	constructor() {}

	registerSeeder(seeder: TriggerAuthIdentitySeeder): void {
		this.seeder = seeder;
	}

	async seed(webhookResultData: IWebhookResponseData, triggerNode: INode): Promise<void> {
		if (this.seeder) {
			return await this.seeder.seed(webhookResultData, triggerNode);
		}
		return;
	}
}
