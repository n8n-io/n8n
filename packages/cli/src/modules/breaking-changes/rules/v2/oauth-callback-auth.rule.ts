import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class OAuthCallbackAuthRule implements IBreakingChangeInstanceRule {
	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'oauth-callback-auth-v2',
			version: 'v2',
			title: 'Require auth on OAuth callback URLs by default',
			description:
				'OAuth callbacks now enforce n8n user authentication by default for improved security',
			category: BreakingChangeCategory.instance,
			severity: BreakingChangeSeverity.medium,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// Check if the instance has N8N_SKIP_AUTH_ON_OAUTH_CALLBACK set to true
		const skipAuth = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK === 'true';

		// Always show a warning about this change
		result.isAffected = true;
		result.instanceIssues.push({
			title: 'OAuth callback authentication now required',
			description:
				'OAuth callbacks will now enforce n8n user authentication by default unless N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is explicitly set to true.',
			level: skipAuth ? IssueLevel.info : IssueLevel.warning,
		});

		if (!skipAuth) {
			result.recommendations.push({
				action: 'Review OAuth workflows',
				description:
					'If you need to skip authentication on OAuth callbacks (e.g., for embed mode), set N8N_SKIP_AUTH_ON_OAUTH_CALLBACK=true',
			});
		}

		return result;
	}
}
