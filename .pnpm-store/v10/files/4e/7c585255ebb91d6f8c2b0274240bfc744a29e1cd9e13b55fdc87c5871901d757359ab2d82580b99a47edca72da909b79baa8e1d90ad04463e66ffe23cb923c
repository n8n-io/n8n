import { NotificationType } from './notification-type';
import { isEmailReference } from './email-reference';
import { isWpxComment } from './wpx-comment';
import { AGENT_LIFECYCLE } from '../constants';
/**
 * Creates a wrapper for an agent notification activity.
 * @param activity - The activity
 * @returns An agent notification activity
 */
export function createAgentNotificationActivity(activity) {
    if (!activity) {
        throw new Error('Activity cannot be null or undefined');
    }
    let notificationType = NotificationType.Unknown;
    let wpxCommentNotification;
    let emailNotification;
    // Parse entities to extract notification types
    if (activity.entities && Array.isArray(activity.entities)) {
        for (const entity of activity.entities) {
            if (isWpxComment(entity)) {
                wpxCommentNotification = entity;
                notificationType = NotificationType.WpxComment;
            }
            else if (isEmailReference(entity)) {
                emailNotification = entity;
                notificationType = NotificationType.EmailNotification;
            }
        }
    }
    else {
        if (activity.name && activity.name.toLowerCase() === AGENT_LIFECYCLE) {
            notificationType = NotificationType.AgentLifecycleNotification;
        }
    }
    return {
        wpxCommentNotification,
        emailNotification,
        notificationType,
        conversation: activity.conversation,
        from: activity.from ?? {},
        recipient: activity.recipient ?? {},
        channelData: activity.channelData ?? {},
        text: activity.text ?? '',
        valueType: activity.valueType ?? '',
        value: activity.value ?? {}
    };
}
//# sourceMappingURL=agent-notification-activity.js.map