/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Logger,
    IPerformanceClient,
    PerformanceEvents,
    invokeAsync,
    invoke,
    ServerResponseType,
    Authority,
    CommonAuthorizationUrlRequest,
} from "@azure/msal-common/browser";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import {
    BrowserConfiguration,
    DEFAULT_IFRAME_TIMEOUT_MS,
} from "../config/Configuration.js";
import { getCodeForm, getEARForm } from "../protocol/Authorize.js";

/**
 * Creates a hidden iframe to given URL using user-requested scopes as an id.
 * @param urlNavigate
 * @param userRequestScopes
 */
export async function initiateCodeRequest(
    requestUrl: string,
    performanceClient: IPerformanceClient,
    logger: Logger,
    correlationId: string,
    navigateFrameWait?: number
): Promise<HTMLIFrameElement> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.SilentHandlerInitiateAuthRequest,
        correlationId
    );

    if (!requestUrl) {
        // Throw error if request URL is empty.
        logger.info("Navigate url is empty");
        throw createBrowserAuthError(BrowserAuthErrorCodes.emptyNavigateUri);
    }
    if (navigateFrameWait) {
        return invokeAsync(
            loadFrame,
            PerformanceEvents.SilentHandlerLoadFrame,
            logger,
            performanceClient,
            correlationId
        )(requestUrl, navigateFrameWait, performanceClient, correlationId);
    }
    return invoke(
        loadFrameSync,
        PerformanceEvents.SilentHandlerLoadFrameSync,
        logger,
        performanceClient,
        correlationId
    )(requestUrl);
}

export async function initiateCodeFlowWithPost(
    config: BrowserConfiguration,
    authority: Authority,
    request: CommonAuthorizationUrlRequest,
    logger: Logger,
    performanceClient: IPerformanceClient
): Promise<HTMLIFrameElement> {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getCodeForm(
        frame.contentDocument,
        config,
        authority,
        request,
        logger,
        performanceClient
    );
    form.submit();
    return frame;
}

export async function initiateEarRequest(
    config: BrowserConfiguration,
    authority: Authority,
    request: CommonAuthorizationUrlRequest,
    logger: Logger,
    performanceClient: IPerformanceClient
): Promise<HTMLIFrameElement> {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getEARForm(
        frame.contentDocument,
        config,
        authority,
        request,
        logger,
        performanceClient
    );
    form.submit();
    return frame;
}

/**
 * Monitors an iframe content window until it loads a url with a known hash, or hits a specified timeout.
 * @param iframe
 * @param timeout
 */
export async function monitorIframeForHash(
    iframe: HTMLIFrameElement,
    timeout: number,
    pollIntervalMilliseconds: number,
    performanceClient: IPerformanceClient,
    logger: Logger,
    correlationId: string,
    responseType: ServerResponseType
): Promise<string> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.SilentHandlerMonitorIframeForHash,
        correlationId
    );

    return new Promise<string>((resolve, reject) => {
        if (timeout < DEFAULT_IFRAME_TIMEOUT_MS) {
            logger.warning(
                `system.loadFrameTimeout or system.iframeHashTimeout set to lower (${timeout}ms) than the default (${DEFAULT_IFRAME_TIMEOUT_MS}ms). This may result in timeouts.`
            );
        }

        /*
         * Polling for iframes can be purely timing based,
         * since we don't need to account for interaction.
         */
        const timeoutId = window.setTimeout(() => {
            window.clearInterval(intervalId);
            reject(
                createBrowserAuthError(
                    BrowserAuthErrorCodes.monitorWindowTimeout
                )
            );
        }, timeout);

        const intervalId = window.setInterval(() => {
            let href: string = "";
            const contentWindow = iframe.contentWindow;
            try {
                /*
                 * Will throw if cross origin,
                 * which should be caught and ignored
                 * since we need the interval to keep running while on STS UI.
                 */
                href = contentWindow ? contentWindow.location.href : "";
            } catch (e) {}

            if (!href || href === "about:blank") {
                return;
            }

            let responseString = "";
            if (contentWindow) {
                if (responseType === ServerResponseType.QUERY) {
                    responseString = contentWindow.location.search;
                } else {
                    responseString = contentWindow.location.hash;
                }
            }
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            resolve(responseString);
        }, pollIntervalMilliseconds);
    }).finally(() => {
        invoke(
            removeHiddenIframe,
            PerformanceEvents.RemoveHiddenIframe,
            logger,
            performanceClient,
            correlationId
        )(iframe);
    });
}

/**
 * @hidden
 * Loads iframe with authorization endpoint URL
 * @ignore
 * @deprecated
 */
function loadFrame(
    urlNavigate: string,
    navigateFrameWait: number,
    performanceClient: IPerformanceClient,
    correlationId: string
): Promise<HTMLIFrameElement> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.SilentHandlerLoadFrame,
        correlationId
    );

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
function loadFrameSync(urlNavigate: string): HTMLIFrameElement {
    const frameHandle = createHiddenIframe();

    frameHandle.src = urlNavigate;

    return frameHandle;
}

/**
 * @hidden
 * Creates a new hidden iframe or gets an existing one for silent token renewal.
 * @ignore
 */
function createHiddenIframe(): HTMLIFrameElement {
    const authFrame = document.createElement("iframe");

    authFrame.className = "msalSilentIframe";
    authFrame.style.visibility = "hidden";
    authFrame.style.position = "absolute";
    authFrame.style.width = authFrame.style.height = "0";
    authFrame.style.border = "0";
    authFrame.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms"
    );
    authFrame.setAttribute("allow", "local-network-access *");
    document.body.appendChild(authFrame);

    return authFrame;
}

/**
 * @hidden
 * Removes a hidden iframe from the page.
 * @ignore
 */
function removeHiddenIframe(iframe: HTMLIFrameElement): void {
    if (document.body === iframe.parentNode) {
        document.body.removeChild(iframe);
    }
}
