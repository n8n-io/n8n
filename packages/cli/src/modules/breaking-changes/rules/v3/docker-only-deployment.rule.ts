import { BreakingChangeRule } from '@n8n/decorators';
import { InstanceSettings } from 'n8n-core';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class DockerOnlyDeploymentRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	id: string = 'docker-only-deployment-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Docker becomes the only supported deployment method',
			description:
				'Support for running n8n via npm is removed. The new version must be run via the official Docker image.',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
			documentationUrl: 'https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (this.instanceSettings.isDocker) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance is not running in a container',
					description:
						'This instance appears to run outside a container (e.g. installed via npm). The new version can only be run via the official Docker image.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Migrate to a Docker-based deployment',
					description:
						'Move this instance to the official Docker image before updating, reusing your existing database and encryption key.',
				},
			],
		};
	}
}
