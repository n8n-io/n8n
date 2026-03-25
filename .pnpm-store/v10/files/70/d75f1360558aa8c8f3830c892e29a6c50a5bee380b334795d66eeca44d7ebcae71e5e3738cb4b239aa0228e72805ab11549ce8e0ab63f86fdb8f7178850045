/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { PerformanceEvents, invoke, invokeAsync, ServerResponseType } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { DEFAULT_IFRAME_TIMEOUT_MS } from '../config/Configuration.mjs';
import { getEARForm, getCodeForm } from '../protocol/Authorize.mjs';
import { monitorWindowTimeout, emptyNavigateUri } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Creates a hidden iframe to given URL using user-requested scopes as an id.
 * @param urlNavigate
 * @param userRequestScopes
 */
async function initiateCodeRequest(requestUrl, performanceClient, logger, correlationId, navigateFrameWait) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerInitiateAuthRequest, correlationId);
    if (!requestUrl) {
        // Throw error if request URL is empty.
        logger.info("Navigate url is empty");
        throw createBrowserAuthError(emptyNavigateUri);
    }
    if (navigateFrameWait) {
        return invokeAsync(loadFrame, PerformanceEvents.SilentHandlerLoadFrame, logger, performanceClient, correlationId)(requestUrl, navigateFrameWait, performanceClient, correlationId);
    }
    return invoke(loadFrameSync, PerformanceEvents.SilentHandlerLoadFrameSync, logger, performanceClient, correlationId)(requestUrl);
}
async function initiateCodeFlowWithPost(config, authority, request, logger, performanceClient) {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getCodeForm(frame.contentDocument, config, authority, request, logger, performanceClient);
    form.submit();
    return frame;
}
async function initiateEarRequest(config, authority, request, logger, performanceClient) {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getEARForm(frame.contentDocument, config, authority, request, logger, performanceClient);
    form.submit();
    return frame;
}
/**
 * Monitors an iframe content window until it loads a url with a known hash, or hits a specified timeout.
 * @param iframe
 * @param timeout
 */
async function monitorIframeForHash(iframe, timeout, pollIntervalMilliseconds, performanceClient, logger, correlationId, responseType) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerMonitorIframeForHash, correlationId);
    return new Promise((resolve, reject) => {
        if (timeout < DEFAULT_IFRAME_TIMEOUT_MS) {
            logger.warning(`system.loadFrameTimeout or system.iframeHashTimeout set to lower (${timeout}ms) than the default (${DEFAULT_IFRAME_TIMEOUT_MS}ms). This may result in timeouts.`);
        }
        /*
         * Polling for iframes can be purely timing based,
         * since we don't need to account for interaction.
         */
        const timeoutId = window.setTimeout(() => {
            window.clearInterval(intervalId);
            reject(createBrowserAuthError(monitorWindowTimeout));
        }, timeout);
        const intervalId = window.setInterval(() => {
            let href = "";
            const contentWindow = iframe.contentWindow;
            try {
                /*
                 * Will throw if cross origin,
                 * which should be caught and ignored
                 * since we need the interval to keep running while on STS UI.
                 */
                href = contentWindow ? contentWindow.location.href : "";
            }
            catch (e) { }
            if (!href || href === "about:blank") {
                return;
            }
            let responseString = "";
            if (contentWindow) {
                if (responseType === ServerResponseType.QUERY) {
                    responseString = contentWindow.location.search;
                }
                else {
                    responseString = contentWindow.location.hash;
                }
            }
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            resolve(responseString);
        }, pollIntervalMilliseconds);
    }).finally(() => {
        invoke(removeHiddenIframe, PerformanceEvents.RemoveHiddenIframe, logger, performanceClient, correlationId)(iframe);
    });
}
/**
 * @hidden
 * Loads iframe with authorization endpoint URL
 * @ignore
 * @deprecated
 */
function loadFrame(urlNavigate, navigateFrameWait, performanceClient, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerLoadFrame, correlationId);
    /*
     * This trick overcomes iframe navigation in IE
     * IE does not load the page consistently in iframe
     */
    return new Promise((resolve, reject) => {
        const frameHandle = createHiddenIframe();
        window.setTimeout(() => {
            if (!frameHandle) {
                reject("Unable to load iframe");
                return;
            }
            frameHandle.src = urlNavigate;
            resolve(frameHandle);
        }, navigateFrameWait);
    });
}
/**
 * @hidden
 * Loads the iframe synchronously when the navigateTimeFrame is set to `0`
 * @param urlNavigate
 * @param frameName
 * @param logger
 */
function loadFrameSync(urlNavigate) {
    const frameHandle = createHiddenIframe();
    frameHandle.src = urlNavigate;
    return frameHandle;
}
/**
 * @hidden
 * Creates a new hidden iframe or gets an existing one for silent token renewal.
 * @ignore
 */
function createHiddenIframe() {
    const authFrame = document.createElement("iframe");
    authFrame.className = "msalSilentIframe";
    authFrame.style.visibility = "hidden";
    authFrame.style.position = "absolute";
    authFrame.style.width = authFrame.style.height = "0";
    authFrame.style.border = "0";
    authFrame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    authFrame.setAttribute("allow", "local-network-access *");
    document.body.appendChild(authFrame);
    return authFrame;
}
/**
 * @hidden
 * Removes a hidden iframe from the page.
 * @ignore
 */
function removeHiddenIframe(iframe) {
    if (document.body === iframe.parentNode) {
        document.body.removeChild(iframe);
    }
}

export { initiateCodeFlowWithPost, initiateCodeRequest, initiateEarRequest, monitorIframeForHash };
//# sourceMappingURL=SilentHandler.mjs.map
