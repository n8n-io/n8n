import { Entity } from '@microsoft/agents-activity';
/**
 * Represents an email notification entity.
 */
export interface EmailReference extends Entity {
    /**
     * The type of the entity. Always 'emailNotification'.
     */
    type: 'emailNotification';
    /**
     * The ID of the email.
     */
    id?: string;
    /**
     * The conversation ID associated with the email.
     */
    conversationId?: string;
    /**
     * The HTML body content of the email.
     */
    htmlBody?: string;
}
/**
 * The entity type name for email notifications.
 */
export declare const EMAIL_NOTIFICATION_TYPE = "emailNotification";
/**
 * Type guard to check if an entity is an EmailReference.
 */
export declare function isEmailReference(entity: Entity): entity is EmailReference;
/**
 * Factory function to create an EmailReference entity.
 */
export declare function createEmailReference(id?: string, conversationId?: string, htmlBody?: string): EmailReference;
//# sourceMappingURL=email-reference.d.ts.map