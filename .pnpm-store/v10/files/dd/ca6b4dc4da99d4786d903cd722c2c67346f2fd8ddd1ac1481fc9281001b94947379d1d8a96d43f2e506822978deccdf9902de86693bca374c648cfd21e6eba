/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError, AccountInfo } from "@azure/msal-common/browser";
import { EventType } from "./EventType.js";
import {
    InteractionStatus,
    InteractionType,
} from "../utils/BrowserConstants.js";
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

export type EventPayload =
    | AccountInfo
    | PopupRequest
    | RedirectRequest
    | SilentRequest
    | SsoSilentRequest
    | EndSessionRequest
    | AuthenticationResult
    | PopupEvent
    | BrokerConnectionEvent
    | null;

export type EventError = AuthError | Error | null;

export type EventCallbackFunction = (message: EventMessage) => void;

export class EventMessageUtils {
    /**
     * Gets interaction status from event message
     * @param message
     * @param currentStatus
     */
    static getInteractionStatusFromEvent(
        message: EventMessage,
        currentStatus?: InteractionStatus
    ): InteractionStatus | null {
        switch (message.eventType) {
            case EventType.LOGIN_START:
                return InteractionStatus.Login;
            case EventType.SSO_SILENT_START:
                return InteractionStatus.SsoSilent;
            case EventType.ACQUIRE_TOKEN_START:
                if (
                    message.interactionType === InteractionType.Redirect ||
                    message.interactionType === InteractionType.Popup
                ) {
                    return InteractionStatus.AcquireToken;
                }
                break;
            case EventType.HANDLE_REDIRECT_START:
                return InteractionStatus.HandleRedirect;
            case EventType.LOGOUT_START:
                return InteractionStatus.Logout;
            case EventType.SSO_SILENT_SUCCESS:
            case EventType.SSO_SILENT_FAILURE:
                if (
                    currentStatus &&
                    currentStatus !== InteractionStatus.SsoSilent
                ) {
                    // Prevent this event from clearing any status other than ssoSilent
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGOUT_END:
                if (
                    currentStatus &&
                    currentStatus !== InteractionStatus.Logout
                ) {
                    // Prevent this event from clearing any status other than logout
                    break;
                }
                return InteractionStatus.None;
            case EventType.HANDLE_REDIRECT_END:
                if (
                    currentStatus &&
                    currentStatus !== InteractionStatus.HandleRedirect
                ) {
                    // Prevent this event from clearing any status other than handleRedirect
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGIN_SUCCESS:
            case EventType.LOGIN_FAILURE:
            case EventType.ACQUIRE_TOKEN_SUCCESS:
            case EventType.ACQUIRE_TOKEN_FAILURE:
            case EventType.RESTORE_FROM_BFCACHE:
                if (
                    message.interactionType === InteractionType.Redirect ||
                    message.interactionType === InteractionType.Popup
                ) {
                    if (
                        currentStatus &&
                        currentStatus !== InteractionStatus.Login &&
                        currentStatus !== InteractionStatus.AcquireToken
                    ) {
                        // Prevent this event from clearing any status other than login or acquireToken
                        break;
                    }
                    return InteractionStatus.None;
                }
                break;
            default:
                break;
        }
        return null;
    }
}
