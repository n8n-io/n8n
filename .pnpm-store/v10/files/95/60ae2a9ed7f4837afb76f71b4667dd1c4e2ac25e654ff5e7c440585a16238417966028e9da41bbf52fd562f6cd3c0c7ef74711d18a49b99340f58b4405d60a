import { TurnState } from '@microsoft/agents-hosting';
import { AgentNotificationHandler } from './extensions';
declare module '@microsoft/agents-hosting' {
    interface AgentApplication<TState extends TurnState> {
        onAgentNotification(channelId: string, routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticEmailNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticWordNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticExcelNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticPowerPointNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onLifecycleNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticUserCreatedNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticUserWorkloadOnboardingNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
        onAgenticUserDeletedNotification(routeHandler: AgentNotificationHandler<TState>, rank?: number, autoSignInHandlers?: string[]): void;
    }
}
//# sourceMappingURL=agent-notification.d.ts.map