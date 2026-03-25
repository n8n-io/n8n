"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agents_hosting_1 = require("@microsoft/agents-hosting");
const agent_notification_activity_1 = require("./models/agent-notification-activity");
const constants_1 = require("./constants");
/**
 * Helper function to check if an activity is an agentic request.
 */
function isAgenticRequest(turnContext) {
    if (!turnContext?.activity)
        return false;
    const role = turnContext.activity?.recipient?.role;
    return role === 'agenticAppInstance' || role === 'agenticUser';
}
/**
 * Helper function to add a route with agentic filtering.
 */
function addAgenticRoute(app, routeSelector, routeHandler, isInvokeRoute = false, rank = 32767, autoSignInHandlers) {
    const ensureAgentic = async (turnContext) => {
        return isAgenticRequest(turnContext) && await Promise.resolve(routeSelector(turnContext));
    };
    app.addRoute(ensureAgentic, routeHandler, isInvokeRoute, rank, autoSignInHandlers);
}
/**
 * Helper function to set up handler and route
 */
function onAgentNotificationInternal(app, channelId, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
handler, rank = 32767, autoSignInHandlers) {
    const routeSelector = async (turnContext) => {
        const activity = turnContext.activity;
        // In case core JS SDK is updated to match .NET SDK, this will need to be updated.
        if (!(activity.channelId) || !isAgenticChannel(activity.channelId)) {
            return false;
        }
        if (channelId !== 'agents:*') {
            if (!isValidChannel(channelId))
                return false;
            if (activity.channelId.toLowerCase() !== channelId.toLowerCase()) {
                return false;
            }
        }
        return true;
    };
    const routeHandler = async (turnContext, turnState) => {
        // Wrap the activity
        const agentNotificationActivity = (0, agent_notification_activity_1.createAgentNotificationActivity)(turnContext.activity);
        // Call the user's handler
        return handler(turnContext, turnState, agentNotificationActivity);
    };
    addAgenticRoute(app, routeSelector, routeHandler, false, rank, autoSignInHandlers);
}
/**
 * Helper function to set up handler and route
 */
function onLifecycleNotificationInternal(app, lifecycleEvent, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
handler, rank = 32767, autoSignInHandlers) {
    const routeSelector = async (turnContext) => {
        const activity = turnContext.activity;
        // In case core JS SDK is updated to match .NET SDK, this will need to be updated.
        if (!(activity.channelId) || !isAgenticChannel(activity.channelId) || !activity.valueType) {
            return false;
        }
        if (activity.name?.toLowerCase() !== constants_1.AGENT_LIFECYCLE) {
            return false;
        }
        // Check if the lifecycle event is valid
        if (lifecycleEvent !== '*') {
            if (!isValidLifecycleEvent(lifecycleEvent))
                return false;
            if (activity.valueType.toLowerCase() !== lifecycleEvent.toLowerCase())
                return false;
        }
        return true;
    };
    const routeHandler = async (turnContext, turnState) => {
        // Wrap the activity
        const agentNotificationActivity = (0, agent_notification_activity_1.createAgentNotificationActivity)(turnContext.activity);
        // Call the user's handler
        return handler(turnContext, turnState, agentNotificationActivity);
    };
    addAgenticRoute(app, routeSelector, routeHandler, false, rank, autoSignInHandlers);
}
/**
 * Registers a route handler for agent notifications.
 *
 * @param this - The agent application
 * @param channelId - The channel id to filter notifications on
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgentNotification(channelId, handler, rank = 32767, autoSignInHandlers) {
    onAgentNotificationInternal(this, channelId, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler specifically for email notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticEmailNotification(handler, rank = 32767, autoSignInHandlers) {
    onAgentNotificationInternal(this, constants_1.AGENTS_EMAIL_SUBCHANNEL, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler specifically for Word notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticWordNotification(handler, rank = 32767, autoSignInHandlers) {
    onAgentNotificationInternal(this, constants_1.AGENTS_WORD_SUBCHANNEL, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler specifically for Excel notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticExcelNotification(handler, rank = 32767, autoSignInHandlers) {
    onAgentNotificationInternal(this, constants_1.AGENTS_EXCEL_SUBCHANNEL, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler specifically for PowerPoint notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticPowerPointNotification(handler, rank = 32767, autoSignInHandlers) {
    onAgentNotificationInternal(this, constants_1.AGENTS_POWERPOINT_SUBCHANNEL, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler for all lifecycle notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onLifecycleNotification(handler, rank = 32767, autoSignInHandlers) {
    onLifecycleNotificationInternal(this, '*', handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler for all lifecycle notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticUserIdentityCreatedNotification(handler, rank = 32767, autoSignInHandlers) {
    onLifecycleNotificationInternal(this, constants_1.USER_CREATED_LIFECYCLE_EVENT, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler for all lifecycle notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticUserWorkloadOnboardingNotification(handler, rank = 32767, autoSignInHandlers) {
    onLifecycleNotificationInternal(this, constants_1.USER_WORKLOAD_ONBOARDING_LIFECYCLE_EVENT, handler, rank, autoSignInHandlers);
}
/**
 * Registers a route handler for all lifecycle notifications.
 *
 * @param this - The agent application
 * @param handler - The notification handler
 * @param rank - Rank order in which to evaluate this
 * @param autoSignInHandlers - handlers
 */
function onAgenticUserIdentityDeletedNotification(handler, rank = 32767, autoSignInHandlers) {
    onLifecycleNotificationInternal(this, constants_1.USER_DELETED_LIFECYCLE_EVENT, handler, rank, autoSignInHandlers);
}
/**
 * Checks if the given channel ID is an agentic channel.
 */
function isAgenticChannel(channelId) {
    return channelId.toLowerCase().startsWith(constants_1.AGENTS_CHANNEL);
}
/**
 * Validates if a sub-channel is supported.
 */
function isValidChannel(channel) {
    const validChannels = [
        constants_1.AGENTS_EMAIL_SUBCHANNEL,
        constants_1.AGENTS_EXCEL_SUBCHANNEL,
        constants_1.AGENTS_WORD_SUBCHANNEL,
        constants_1.AGENTS_POWERPOINT_SUBCHANNEL,
    ];
    return validChannels.includes(channel.toLowerCase());
}
/**
 * Validates if a lifecycle event is supported.
 */
function isValidLifecycleEvent(lifecycleEvent) {
    const validLifecycleEvents = [
        constants_1.USER_CREATED_LIFECYCLE_EVENT,
        constants_1.USER_WORKLOAD_ONBOARDING_LIFECYCLE_EVENT,
        constants_1.USER_DELETED_LIFECYCLE_EVENT
    ];
    return validLifecycleEvents.includes(lifecycleEvent.toLowerCase());
}
agents_hosting_1.AgentApplication.prototype.onAgentNotification = onAgentNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticEmailNotification = onAgenticEmailNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticWordNotification = onAgenticWordNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticExcelNotification = onAgenticExcelNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticPowerPointNotification = onAgenticPowerPointNotification;
agents_hosting_1.AgentApplication.prototype.onLifecycleNotification = onLifecycleNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticUserCreatedNotification = onAgenticUserIdentityCreatedNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticUserWorkloadOnboardingNotification = onAgenticUserWorkloadOnboardingNotification;
agents_hosting_1.AgentApplication.prototype.onAgenticUserDeletedNotification = onAgenticUserIdentityDeletedNotification;
//# sourceMappingURL=agent-notification.js.map