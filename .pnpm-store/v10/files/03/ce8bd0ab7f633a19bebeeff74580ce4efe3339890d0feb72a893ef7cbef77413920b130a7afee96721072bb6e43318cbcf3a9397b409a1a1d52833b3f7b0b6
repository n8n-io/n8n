import { Activity } from '@microsoft/agents-activity';
/**
 * The entity type name for email responses.
 */
export const EMAIL_RESPONSE_TYPE = 'emailResponse';
/**
 * Factory function to create an EmailResponse entity.
 */
export function createEmailResponse(htmlBody) {
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
export function createEmailResponseActivity(emailResponseHtmlBody) {
    return Activity.fromObject({
        type: 'message',
        entities: [createEmailResponse(emailResponseHtmlBody)]
    });
}
//# sourceMappingURL=email-response.js.map