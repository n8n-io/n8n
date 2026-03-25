"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExtension = void 0;
const routeRank_1 = require("./routeRank");
/**
 * Represents an extension that adds channel-specific routing functionality to an agent application.
 * This class allows you to register routes that are only active for a specific channel.
 *
 * @typeParam TState - The type of turn state that extends TurnState
 */
class AgentExtension {
    /**
     * Creates a new AgentExtension instance for the specified channel.
     *
     * @param channelId - The channel ID that this extension will be associated with
     */
    constructor(channelId) {
        this.channelId = channelId;
    }
    /**
     * Adds a route to the agent application that is only active for the channel specified in this extension.
     * This method creates a channel-specific route by wrapping the provided route selector with an additional
     * check to ensure the incoming activity matches the extension's channel ID.
     *
     * @param app - The agent application instance to add the route to
     * @param routeSelector - A function that determines if the route should handle the incoming activity
     * @param routeHandler - The handler function that will process the activity when the route is matched
     * @param isInvokeRoute - Optional. Whether this route handles invoke activities. Defaults to false
     * @param rank - Optional. The priority rank of this route for routing precedence. Defaults to RouteRank.Unspecified
     *
     * @example
     * ```typescript
     * const teamsExtension = new AgentExtension<MyState>('msteams');
     * teamsExtension.addRoute(
     *   app,
     *   (context) => context.activity.type === 'message',
     *   async (context, state) => {
     *     // Handle Teams-specific message
     *     await context.sendActivity('Hello from Teams!');
     *   }
     * );
     * ```
     */
    addRoute(app, routeSelector, routeHandler, isInvokeRoute = false, rank = routeRank_1.RouteRank.Unspecified) {
        const ensureChannelMatches = async (context) => {
            return context.activity.channelId === this.channelId && routeSelector(context);
        };
        app.addRoute(ensureChannelMatches, routeHandler, isInvokeRoute, rank);
    }
}
exports.AgentExtension = AgentExtension;
//# sourceMappingURL=extensions.js.map