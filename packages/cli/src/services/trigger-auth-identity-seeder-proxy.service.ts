import { Service } from '@n8n/di';
import type { IRunExecutionData } from 'n8n-workflow';

export interface TriggerAuthIdentitySeeder {
	seed(runExecutionData: IRunExecutionData, token: string, resource: string): Promise<void>;
}

@Service()
export class TriggerAuthIdentitySeederProxy implements TriggerAuthIdentitySeeder {
	private seeder: TriggerAuthIdentitySeeder | null = null;

	constructor() {}

	registerSeeder(seeder: TriggerAuthIdentitySeeder): void {
		this.seeder = seeder;
	}

	async seed(runExecutionData: IRunExecutionData, token: string, resource: string): Promise<void> {
		if (this.seeder) {
			return await this.seeder.seed(runExecutionData, token, resource);
		}
		return;
	}
}
