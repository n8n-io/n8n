'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.FeatureNotLicensedError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class FeatureNotLicensedError extends n8n_workflow_1.UserError {
	constructor(feature) {
		super(
			`Your license does not allow for ${feature}. To enable ${feature}, please upgrade to a license that supports this feature.`,
			{ level: 'warning' },
		);
	}
}
exports.FeatureNotLicensedError = FeatureNotLicensedError;
//# sourceMappingURL=feature-not-licensed.error.js.map
