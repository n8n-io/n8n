import { AuthError, AccountInfo } from "@azure/msal-common/browser";
import { EventType } from "./EventType.js";
import { InteractionStatus, InteractionType } from "../utils/BrowserConstants.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
export type EventMessage = {
    eventType: EventType;
    interactionType: InteractionType | null;
    payload: EventPayload;
    error: EventError;
    timestamp: number;
};
export type PopupEvent = {
    popupWindow: Window;
};
/**
 * Payload for the BrokerConnectionEstablished event
 */
export type BrokerConnectionEvent = {
    /**
     * The origin of the broker that is connected to the client
     */
    pairwiseBrokerOrigin: string;
};
export type EventPayload = AccountInfo | PopupRequest | RedirectRequest | SilentRequest | SsoSilentRequest | EndSessionRequest | AuthenticationResult | PopupEvent | BrokerConnectionEvent | null;
export type EventError = AuthError | Error | null;
export type EventCallbackFunction = (message: EventMessage) => void;
export declare class EventMessageUtils {
    /**
     * Gets interaction status from event message
     * @param message
     * @param currentStatus
     */
    static getInteractionStatusFromEvent(message: EventMessage, currentStatus?: InteractionStatus): InteractionStatus | null;
}
//# sourceMappingURL=EventMessage.d.ts.map