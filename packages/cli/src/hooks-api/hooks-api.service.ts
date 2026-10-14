import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { HooksApi, HooksApiV1, InstanceTypeV1 } from '@n8n/hooks-api';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { ExternalHooks } from '@/external-hooks';

import { PublicHttpService } from './v1/public-http.service';
import { PublicOwnershipService } from './v1/public-ownership.service';
import { PublicWorkflowHooksService } from './v1/public-workflow-hooks.service';
import { PublicWorkflowsService } from './v1/public-workflows.service';

const INSTANCE_TYPES_V1: readonly string[] = [
	'main',
	'webhook',
	'worker',
] satisfies InstanceTypeV1[];

const isInstanceTypeV1 = (type: string): type is InstanceTypeV1 => INSTANCE_TYPES_V1.includes(type);

/**
 * Builds the versioned in-process API and passes it to the `register` export
 * of every hook file. This is the stable alternative to the legacy hook exports.
 */
@Service()
export class HooksApiService {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownership: PublicOwnershipService,
		private readonly workflows: PublicWorkflowsService,
		private readonly workflowHooks: PublicWorkflowHooksService,
		private readonly http: PublicHttpService,
	) {}

	async register(): Promise<void> {
		const { registerFunctions } = this.externalHooks;
		if (registerFunctions.length === 0) return;

		const { instanceType } = this.instanceSettings;
		if (!isInstanceTypeV1(instanceType)) {
			this.logger.warn('Hooks API is not available on this instance type', { instanceType });
			return;
		}

		const api: HooksApi = { v1: this.buildV1(instanceType) };

		for (const register of registerFunctions) {
			try {
				await register(api);
			} catch (cause) {
				throw new UnexpectedError('Hook file failed to register', { cause });
			}
		}
	}

	private buildV1(instanceType: InstanceTypeV1): HooksApiV1 {
		return {
			version: 1,
			instance: { type: instanceType, n8nVersion: N8N_VERSION },
			ownership: this.ownership,
			workflows: this.workflows,
			http: instanceType === 'worker' ? undefined : this.http,
			hooks: { workflow: this.workflowHooks },
		};
	}
}
