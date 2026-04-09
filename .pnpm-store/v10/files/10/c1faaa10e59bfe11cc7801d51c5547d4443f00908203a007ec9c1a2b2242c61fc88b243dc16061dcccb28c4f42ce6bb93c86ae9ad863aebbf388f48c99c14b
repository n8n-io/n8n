export type FrameworkOverridesIncomingSource = 'resize-observer' | 'ensureVisible' | 'popupPositioning';
export interface AgFrameworkOverrides {
    /**
     * This method is to cater for Angular's change detection.
     * Angular uses Zones, we want to run internal AG Grid outside of Zone JS so that we do not kick off
     * Angular change detection. Any event listener or setTimeout() or setInterval() run by our code
     * would trigger change detection in Angular.
     *
     * Before events are returned to the user, those functions are wrapped in Angular's zone
     * again so that the user's code triggers change detection as normal. See wrapOutgoing() below.
     */
    wrapIncoming: <T>(callback: () => T, source?: FrameworkOverridesIncomingSource) => T;
}
