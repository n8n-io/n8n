"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentNotificationActivity = createAgentNotificationActivity;
const notification_type_1 = require("./notification-type");
const email_reference_1 = require("./email-reference");
const wpx_comment_1 = require("./wpx-comment");
const constants_1 = require("../constants");
/**
 * Creates a wrapper for an agent notification activity.
 * @param activity - The activity
 * @returns An agent notification activity
 */
function createAgentNotificationActivity(activity) {
    if (!activity) {
        throw new Error('Activity cannot be null or undefined');
    }
    let notificationType = notification_type_1.NotificationType.Unknown;
    let wpxCommentNotification;
    let emailNotification;
    // Parse entities to extract notification types
    if (activity.entities && Array.isArray(activity.entities)) {
        for (const entity of activity.entities) {
            if ((0, wpx_comment_1.isWpxComment)(entity)) {
                wpxCommentNotification = entity;
                notificationType = notification_type_1.NotificationType.WpxComment;
            }
            else if ((0, email_reference_1.isEmailReference)(entity)) {
                emailNotification = entity;
                notificationType = notification_type_1.NotificationType.EmailNotification;
            }
        }
    }
    else {
        if (activity.name && activity.name.toLowerCase() === constants_1.AGENT_LIFECYCLE) {
            notificationType = notification_type_1.NotificationType.AgentLifecycleNotification;
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