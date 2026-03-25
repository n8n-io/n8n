"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_NOTIFICATION_TYPE = void 0;
exports.isEmailReference = isEmailReference;
exports.createEmailReference = createEmailReference;
/**
 * The entity type name for email notifications.
 */
exports.EMAIL_NOTIFICATION_TYPE = 'emailNotification';
/**
 * Type guard to check if an entity is an EmailReference.
 */
function isEmailReference(entity) {
    return entity?.type?.toLowerCase() === exports.EMAIL_NOTIFICATION_TYPE.toLowerCase();
}
/**
 * Factory function to create an EmailReference entity.
 */
function createEmailReference(id, conversationId, htmlBody) {
    return {
        type: 'emailNotification',
        id,
        conversationId,
        htmlBody,
    };
}
//# sourceMappingURL=email-reference.js.map