/**
 * The entity type name for email notifications.
 */
export const EMAIL_NOTIFICATION_TYPE = 'emailNotification';
/**
 * Type guard to check if an entity is an EmailReference.
 */
export function isEmailReference(entity) {
    return entity?.type?.toLowerCase() === EMAIL_NOTIFICATION_TYPE.toLowerCase();
}
/**
 * Factory function to create an EmailReference entity.
 */
export function createEmailReference(id, conversationId, htmlBody) {
    return {
        type: 'emailNotification',
        id,
        conversationId,
        htmlBody,
    };
}
//# sourceMappingURL=email-reference.js.map