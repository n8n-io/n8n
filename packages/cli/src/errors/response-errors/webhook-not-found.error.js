'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WebhookNotFoundError = exports.webhookNotFoundErrorMessage = void 0;
const not_found_error_1 = require('./not-found.error');
const webhookNotFoundErrorMessage = ({ path, httpMethod, webhookMethods }) => {
	let webhookPath = path;
	if (httpMethod) {
		webhookPath = `${httpMethod} ${webhookPath}`;
	}
	if (webhookMethods?.length && httpMethod) {
		let methods = '';
		if (webhookMethods.length === 1) {
			methods = webhookMethods[0];
		} else {
			const lastMethod = webhookMethods.pop();
			methods = `${webhookMethods.join(', ')} or ${lastMethod}`;
		}
		return `This webhook is not registered for ${httpMethod} requests. Did you mean to make a ${methods} request?`;
	} else {
		return `The requested webhook "${webhookPath}" is not registered.`;
	}
};
exports.webhookNotFoundErrorMessage = webhookNotFoundErrorMessage;
class WebhookNotFoundError extends not_found_error_1.NotFoundError {
	constructor({ path, httpMethod, webhookMethods }, { hint } = { hint: 'default' }) {
		const errorMsg = (0, exports.webhookNotFoundErrorMessage)({ path, httpMethod, webhookMethods });
		let hintMsg = '';
		if (!webhookMethods?.length) {
			hintMsg =
				hint === 'default'
					? "Click the 'Execute workflow' button on the canvas, then try again. (In test mode, the webhook only works for one call after you click this button)"
					: "The workflow must be active for a production URL to run successfully. You can activate the workflow using the toggle in the top-right of the editor. Note that unlike test URL calls, production URL calls aren't shown on the canvas (only in the executions list)";
		}
		super(errorMsg, hintMsg);
	}
}
exports.WebhookNotFoundError = WebhookNotFoundError;
//# sourceMappingURL=webhook-not-found.error.js.map
