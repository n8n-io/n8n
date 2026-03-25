import { NotificationType } from './notification-type';
import { EmailReference } from './email-reference';
import { WpxComment } from './wpx-comment';
import { Activity, ConversationAccount, ChannelAccount } from '@microsoft/agents-activity';
/**
 * Represents a parsed agent notification activity with strongly-typed notification data.
 */
export interface AgentNotificationActivity {
    /**
     * WPX comment notification if present.
     */
    wpxCommentNotification?: WpxComment;
    /**
     * Email notification if present.
     */
    emailNotification?: EmailReference;
    /**
     * The type of notification detected.
     */
    notificationType: NotificationType;
    /**
     * The conversation account.
     */
    conversation?: ConversationAccount;
    /**
     * The sender of the activity.
     */
    from: ChannelAccount;
    /**
     * The recipient of the activity.
     */
    recipient: ChannelAccount;
    /**
     * Channel-specific data.
     */
    channelData: unknown;
    /**
     * The text content of the activity.
     */
    text: string;
    /**
     * The value type of the activity.
     */
    valueType: string;
    /**
     * The value payload of the activity.
     */
    value: unknown;
}
/**
 * Creates a wrapper for an agent notification activity.
 * @param activity - The activity
 * @returns An agent notification activity
 */
export declare function createAgentNotificationActivity(activity: Activity): AgentNotificationActivity;
//# sourceMappingURL=agent-notification-activity.d.ts.map