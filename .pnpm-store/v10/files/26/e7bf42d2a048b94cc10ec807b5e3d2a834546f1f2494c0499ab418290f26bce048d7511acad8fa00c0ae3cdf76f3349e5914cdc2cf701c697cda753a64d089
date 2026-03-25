"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_RESPONSE_TYPE = void 0;
exports.createEmailResponse = createEmailResponse;
exports.createEmailResponseActivity = createEmailResponseActivity;
const agents_activity_1 = require("@microsoft/agents-activity");
/**
 * The entity type name for email responses.
 */
exports.EMAIL_RESPONSE_TYPE = 'emailResponse';
/**
 * Factory function to create an EmailResponse entity.
 */
function createEmailResponse(htmlBody) {
    return {
        type: 'emailResponse',
        htmlBody: htmlBody ?? '',
    };
}
/**
 * Creates an activity with an EmailResponse entity
 * @param emailResponseHtmlBody - (Optional) The HTML body content for the email response
 * @returns A message activity containing the EmailResponse entity
 */
function createEmailResponseActivity(emailResponseHtmlBody) {
    return agents_activity_1.Activity.fromObject({
        type: 'message',
        entities: [createEmailResponse(emailResponseHtmlBody)]
    });
}
//# sourceMappingURL=email-response.js.map