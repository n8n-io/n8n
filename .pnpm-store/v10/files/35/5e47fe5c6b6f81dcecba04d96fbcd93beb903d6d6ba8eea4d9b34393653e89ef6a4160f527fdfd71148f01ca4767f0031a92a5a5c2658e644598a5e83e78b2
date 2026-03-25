/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { EventType } from './EventType.mjs';
import { InteractionType, InteractionStatus } from '../utils/BrowserConstants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class EventMessageUtils {
    /**
     * Gets interaction status from event message
     * @param message
     * @param currentStatus
     */
    static getInteractionStatusFromEvent(message, currentStatus) {
        switch (message.eventType) {
            case EventType.LOGIN_START:
                return InteractionStatus.Login;
            case EventType.SSO_SILENT_START:
                return InteractionStatus.SsoSilent;
            case EventType.ACQUIRE_TOKEN_START:
                if (message.interactionType === InteractionType.Redirect ||
                    message.interactionType === InteractionType.Popup) {
                    return InteractionStatus.AcquireToken;
                }
                break;
            case EventType.HANDLE_REDIRECT_START:
                return InteractionStatus.HandleRedirect;
            case EventType.LOGOUT_START:
                return InteractionStatus.Logout;
            case EventType.SSO_SILENT_SUCCESS:
            case EventType.SSO_SILENT_FAILURE:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.SsoSilent) {
                    // Prevent this event from clearing any status other than ssoSilent
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGOUT_END:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.Logout) {
                    // Prevent this event from clearing any status other than logout
                    break;
                }
                return InteractionStatus.None;
            case EventType.HANDLE_REDIRECT_END:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.HandleRedirect) {
                    // Prevent this event from clearing any status other than handleRedirect
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGIN_SUCCESS:
            case EventType.LOGIN_FAILURE:
            case EventType.ACQUIRE_TOKEN_SUCCESS:
            case EventType.ACQUIRE_TOKEN_FAILURE:
            case EventType.RESTORE_FROM_BFCACHE:
                if (message.interactionType === InteractionType.Redirect ||
                    message.interactionType === InteractionType.Popup) {
                    if (currentStatus &&
                        currentStatus !== InteractionStatus.Login &&
                        currentStatus !== InteractionStatus.AcquireToken) {
                        // Prevent this event from clearing any status other than login or acquireToken
                        break;
                    }
                    return InteractionStatus.None;
                }
                break;
        }
        return null;
    }
}

export { EventMessageUtils };
//# sourceMappingURL=EventMessage.mjs.map
