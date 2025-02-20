import { ApplicationError } from 'n8n-workflow';

import type { LICENSE_FEATURES } from '@/constants';

export class FeatureNotLicensedError extends ApplicationError {
	constructor(feature: (typeof LICENSE_FEATURES)[keyof typeof LICENSE_FEATURES]) {
		super(
			`Your license does not allow for ${feature}. To enable ${feature}, please upgrade to a license that supports this feature.`,
			{ level: 'warning' },
		);
	}
}
