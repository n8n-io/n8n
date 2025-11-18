import type { InstanceType } from '@n8n/constants';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { InstanceStateProvider } from './types';

class ProviderNotSetError extends UnexpectedError {
	constructor() {
		super('Cannot query instance state because instance state provider has not been set');
	}
}

@Service()
export class InstanceState {
	instanceStateProvider: InstanceStateProvider | null = null;

	setInstanceStateProvider(provider: InstanceStateProvider) {
		this.instanceStateProvider = provider;
	}

	private assertProvider(): asserts this is { instanceStateProvider: InstanceStateProvider } {
		if (!this.instanceStateProvider) throw new ProviderNotSetError();
	}

	get instanceType(): InstanceType {
		this.assertProvider();

		return this.instanceStateProvider.instanceType;
	}

	/*
	 * If singular, checks if the current instance type matches,
	 * if multiple, checks if the current instance type is any of them
	 */
	isInstanceType(instanceType: InstanceType | InstanceType[]): boolean {
		this.assertProvider();

		if (typeof instanceType === 'string') {
			return this.instanceStateProvider.instanceType === instanceType;
		}

		return instanceType.includes(this.instanceStateProvider.instanceType);
	}
}
