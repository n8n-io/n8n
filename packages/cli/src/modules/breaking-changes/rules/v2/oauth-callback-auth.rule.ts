import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class OAuthCallbackAuthRule implements IBreakingChangeInstanceRule {
	id: string = 'oauth-callback-auth-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Require auth on OAuth callback URLs by default',
			description:
				'OAuth callbacks now enforce n8n user authentication by default for improved security',
			category: BreakingChangeCategory.instance,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
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
			level: skipAuth ? 'info' : 'warning',
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
