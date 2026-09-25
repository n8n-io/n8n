import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { DockerOnlyDeploymentRule } from '../docker-only-deployment.rule';

describe('DockerOnlyDeploymentRule', () => {
	describe('detect()', () => {
		it('should not be affected when running in a container', async () => {
			const rule = new DockerOnlyDeploymentRule(mock<InstanceSettings>({ isDocker: true }));

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when running outside a container', async () => {
			const rule = new DockerOnlyDeploymentRule(mock<InstanceSettings>({ isDocker: false }));

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});
