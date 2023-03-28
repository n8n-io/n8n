import { EnvironmentService } from './EnvironmentService.ee';

export class EnvironmentManager {
	private static environment: {
		service: EnvironmentService;
	};

	private static initialized: boolean;

	static getInstance(): {
		service: EnvironmentService;
	} {
		if (!this.initialized) {
			throw new Error('Environment Manager has not been initialized');
		}
		return this.environment;
	}

	static async init(): Promise<void> {
		this.environment = {
			service: new EnvironmentService(),
		};

		await this.environment.service.init();

		this.initialized = true;
	}
}
