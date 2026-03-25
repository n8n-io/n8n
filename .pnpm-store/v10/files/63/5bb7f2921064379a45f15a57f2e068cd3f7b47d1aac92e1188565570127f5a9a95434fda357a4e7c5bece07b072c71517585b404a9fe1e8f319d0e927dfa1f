/**
 * Represents event-specific properties. Refer to the events documentation for
 * the lists of initial properties:
 * - [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent/DragEvent)
 * - [FocusEvent](https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent/FocusEvent)
 * - [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/KeyboardEvent)
 * - [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent)
 * - [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/PointerEvent)
 * - [TouchEvent](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/TouchEvent)
 * - [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event/Event)
 */
export type EvaluationArgument = object;

export type PageFunction<Arg, R> = string | ((arg: Unboxed<Arg>) => R);

export type Unboxed<Arg> = Arg extends [infer A0, infer A1] ? [Unboxed<A0>, Unboxed<A1>]
    : Arg extends [infer A0, infer A1, infer A2] ? [Unboxed<A0>, Unboxed<A1>, Unboxed<A2>]
    : Arg extends [infer A0, infer A1, infer A2, infer A3] ? [Unboxed<A0>, Unboxed<A1>, Unboxed<A2>, Unboxed<A3>]
    : Arg extends Array<infer T> ? Array<Unboxed<T>>
    : Arg extends object ? { [Key in keyof Arg]: Unboxed<Arg[Key]> }
    : Arg;

/**
 * CPUProfile is the mandatory input to be passed into {@link Page}'s
 * `throttleCPU` method.
 */
export interface CPUProfile {
    /**
     * rate as a slowdown factor (1 is no throttle, 2 is 2x slowdown, etc).
     */
    rate: number;
}

/**
 * NetworkProfile is the mandatory input to be passed into {@link Page}'s
 * `throttleNetwork` method.
 */
export interface NetworkProfile {
    /**
     * Minimum latency from request sent to response headers received (ms).
     */
    latency: number;

    /**
     * Maximal aggregated download throughput (bytes/sec). -1 disables download
     * throttling.
     */
    download: number;

    /**
     * Maximal aggregated upload throughput (bytes/sec). -1 disables upload
     * throttling.
     */
    upload: number;
}

export interface SelectOptionsObject {
    /**
     * Matches by `option.value`.
     */
    value?: string;

    /**
     * Matches by `option.label`.
     */
    label?: string;

    /**
     * Matches by the index.
     */
    index?: number;
}

export type ResourceType =
    | "document"
    | "stylesheet"
    | "image"
    | "media"
    | "font"
    | "script"
    | "texttrack"
    | "xhr"
    | "fetch"
    | "eventsource"
    | "websocket"
    | "manifest"
    | "other";
export type MouseButton = "left" | "right" | "middle";
export type KeyboardModifier = "Alt" | "Control" | "Meta" | "Shift";
export type ElementState = "attached" | "detached" | "visible" | "hidden";
export type InputElementState = ElementState | "enabled" | "disabled" | "editable";
export type LifecycleEvent = "load" | "domcontentloaded" | "networkidle";

export interface TimeoutOptions {
    /**
     * Maximum time in milliseconds. Pass 0 to disable the timeout. Default is overridden by the setDefaultTimeout option on `BrowserContext` or `Page`.
     * Defaults to 30000.
     */
    timeout?: number;
}

export interface StrictnessOptions {
    /**
     * When `true`, the call requires selector to resolve to a single element.
     * If given selector resolves to more than one element, the call throws
     * an exception. Defaults to `false`.
     */
    strict?: boolean;
}

export interface EventSequenceOptions {
    /**
     * Delay between events in milliseconds. Defaults to 0.
     */
    delay?: number;
}

export interface File {
    /**
     * File name
     */
    name: string;

    /**
     * File type
     */
    mimeType: string;

    /**
     * File content
     */
    buffer: ArrayBuffer;
}

export type ElementHandleOptions = {
    /**
     * Setting this to `true` will bypass the actionability checks (visible,
     * stable, enabled). Defaults to `false`.
     */
    force?: boolean;

    /**
     * If set to `true` and a navigation occurs from performing this action, it will not wait for it to complete.
     * Defaults to `false`.
     */
    noWaitAfter?: boolean;
} & TimeoutOptions;

export type ElementHandlePointerOptions = ElementHandleOptions & {
    /**
     * Setting this to `true` will perform the actionability checks without
     * performing the action. Useful to wait until the element is ready for the
     * action without performing it. Defaults to `false`.
     */
    trial?: boolean;
};

export type ElementClickOptions = ElementHandlePointerOptions & {
    /**
     * A point to use relative to the top left corner of the element. If not supplied,
     * a visible point of the element is used.
     */
    position?: { x: number; y: number };
};

export interface KeyboardModifierOptions {
    /**
     * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the action.
     * If not specified, currently pressed modifiers are used.
     */
    modifiers?: KeyboardModifier[];
}

export type KeyboardPressOptions =
    & {
        /**
         * If set to `true` and a navigation occurs from performing this action, it
         * will not wait for it to complete. Defaults to `false`.
         */
        noWaitAfter?: boolean;
    }
    & EventSequenceOptions
    & TimeoutOptions;

export type MouseMoveOptions = ElementClickOptions & KeyboardModifierOptions;

export type MouseClickOptions = {
    /**
     * The mouse button to use during the action.
     * Defaults to `left`.
     */
    button?: MouseButton;
} & EventSequenceOptions;

export type MouseMultiClickOptions = MouseClickOptions & {
    /**
     * The number of times the action is performed.
     * Defaults to 1.
     */
    clickCount?: number;
};

export interface MouseDownUpOptions {
    /**
     * The mouse button to use during the action.
     * Defaults to `left`.
     */
    button?: MouseButton;

    /**
     * Defaults to 1.
     */
    clickCount?: number;
}

export type ContentLoadOptions = {
    /**
     * When to consider operation succeeded, defaults to `load`. Events can be
     * either:
     * - `'domcontentloaded'` - consider operation to be finished when the
     * `DOMContentLoaded` event is fired.
     * - `'load'` - consider operation to be finished when the `load` event is
     * fired.
     * - `'networkidle'` - **DISCOURAGED** consider operation to be finished
     * when there are no network connections for at least `500` ms. Don't use
     * this method for testing especially with chatty websites where the event
     * may never fire, rely on web assertions to assess readiness instead.
     */
    waitUntil?: LifecycleEvent;
} & TimeoutOptions;

export type NavigationOptions = {
    /**
     * Referer header value.
     */
    referer?: string;
} & ContentLoadOptions;

export interface ResourceTiming {
    /**
     * Request start time in milliseconds elapsed since January 1, 1970 00:00:00 UTC
     */
    startTime: number;

    /**
     * Time immediately before the browser starts the domain name lookup for the resource.
     * The value is given in milliseconds relative to `startTime`, -1 if not available.
     */
    domainLookupStart: number;

    /**
     * Time immediately after the browser ends the domain name lookup for the resource.
     * The value is given in milliseconds relative to `startTime`, -1 if not available.
     */
    domainLookupEnd: number;

    /**
     * Time immediately before the user agent starts establishing the connection to the server
     * to retrieve the resource. The value is given in milliseconds relative to `startTime`,
     * -1 if not available.
     */
    connectStart: number;

    /**
     * Time immediately before the browser starts the handshake process to secure the current
     * connection. The value is given in milliseconds relative to `startTime`, -1 if not available.
     */
    secureConnectionStart: number;

    /**
     * Time immediately after the user agent establishes the connection to the server
     * to retrieve the resource. The value is given in milliseconds relative to `startTime`,
     * -1 if not available.
     */
    connectEnd: number;

    /**
     * Time immediately before the browser starts requesting the resource from the server,
     * cache, or local resource. The value is given in milliseconds relative to `startTime`,
     * -1 if not available.
     */
    requestStart: number;

    /**
     * Time immediately after the browser receives the first byte of the response from the server,
     * cache, or local resource. The value is given in milliseconds relative to `startTime`,
     * -1 if not available.
     */
    responseStart: number;

    /**
     * Time immediately after the browser receives the last byte of the resource or immediately
     * before the transport connection is closed, whichever comes first. The value is given
     * in milliseconds relative to `startTime`, -1 if not available.
     */
    responseEnd: number;
}

export interface SecurityDetailsObject {
    /**
     * Common Name component of the Issuer field. The value is extracted from the
     * certificate. This should only be used for informational purposes.
     */
    issuer?: string;

    /**
     * The specific TLS protocol used. For example `TLS 1.3`.
     */
    protocol?: string;

    /**
     * Common Name component of the Subject field. The value is extracted from the
     * certificate. This should only be used for informational purposes.
     */
    subjectName?: string;

    /**
     * Unix timestamp (in seconds) specifying the exact date/time when this cert
     * becomes valid.
     */
    validFrom?: number;

    /**
     * Unix timestamp (in seconds) specifying the exact date/time when this cert
     * becomes invalid.
     */
    validTo?: number;

    /**
     * String with hex encoded SHA256 fingerprint of the certificate. The value is
     * extracted from the certificate.
     */
    sanList?: string[];
}

export interface Rect {
    /**
     * The x coordinate of the element in pixels.
     * (0, 0) is the top left corner of the viewport.
     */
    x: number;

    /**
     * The y coordinate of the element in pixels.
     * (0, 0) is the top left corner of the viewport.
     */
    y: number;

    /**
     * The width of the element in pixels.
     */
    width: number;

    /**
     * The height of the element in pixels.
     */
    height: number;
}

export type ImageFormat = "jpeg" | "png";

export interface ScreenshotOptions {
    /**
     * The file path to save the image to. The screenshot type will be inferred from file extension.
     */
    path?: string;

    /**
     * The screenshot format.
     * @default 'png'
     */
    type?: ImageFormat;

    /**
     * Hide default white background and allow capturing screenshots with transparency.
     * Not applicable to `jpeg` images.
     * @default false
     */
    omitBackground?: boolean;

    /**
     * The quality of the image, between 0-100. Not applicable to `png` images.
     * @default 100
     */
    quality?: number;
}

/**
 * Methods to periodically check for a value.
 * - `raf` - use `requestAnimationFrame` callback to poll
 * - `mutation` - use a mutation observer
 * - `interval` - use a polling interval
 */
export type PollingMethod = "raf" | "mutation" | "interval";

export interface PollingOptions {
    /**
     * Polling method to use.
     * @default 'raf'
     */
    polling?: "raf" | "mutation" | "interval";

    /**
     * Polling interval in milliseconds if `polling` is set to `interval`.
     */
    interval?: number;
}

export interface ElementStateFilter {
    /**
     * The element state to filter for.
     * @default 'visible'
     */
    state?: ElementState;
}

/**
 * BrowserPermissions defines all the possible permissions that can be granted
 * to the browser application.
 */
export type BrowserPermissions =
    | "geolocation"
    | "midi"
    | "midi-sysex"
    | "notifications"
    | "camera"
    | "microphone"
    | "background-sync"
    | "ambient-light-sensor"
    | "accelerometer"
    | "gyroscope"
    | "magnetometer"
    | "accessibility-events"
    | "clipboard-read"
    | "clipboard-write"
    | "payment-handler";

export interface NewBrowserContextOptions {
    /**
     * Setting this to `true` will bypass a page's Content-Security-Policy.
     * Defaults to `false`.
     */
    bypassCSP?: boolean;

    /**
     * Emulates `'prefers-colors-scheme'` media feature, supported values
     * are `'light'`, `'dark'`, and `'no-preference'`. Default to
     * `'light'`.
     */
    colorScheme?: "light" | "dark" | "no-preference";

    /**
     * Sets the resolution ratio in physical pixels to the resolution in
     * CSS pixels i.e. if set higher than 1, then images will look
     * sharper on high pixel density screens. Defaults to 1.
     */
    deviceScaleFactor?: number;

    /**
     * Contains additional HTTP headers to be sent with every request,
     * where the keys are HTTP headers and values are HTTP header
     * values. Defaults to null.
     */
    extraHTTPHeaders?: { [key: string]: string };

    /**
     * Sets the user's geographical location. Defaults to null.
     */
    geolocation?: {
        /**
         * latitude should be between -90 and 90.
         */
        latitude: number;

        /**
         * longitude should be between -180 and 180.
         */
        longitude: number;

        /**
         * accuracy should only be a non-negative number. Defaults to 0.
         */
        accuracy: number;
    };

    /**
     * Whether to simulate a device with touch events. Defaults to
     * `false`.
     */
    hasTouch?: boolean;

    /**
     * Sets the credentials for HTTP authentication using Basic Auth.
     */
    httpCredentials?: {
        username: string;

        password: string;
    };

    /**
     * Whether to ignore HTTPS errors that may be caused by invalid
     * certificates. Defaults to `false`.
     */
    ignoreHTTPSErrors?: boolean;

    /**
     * Whether to simulate a mobile device. Defaults to `false`.
     */
    isMobile?: boolean;

    /**
     * Whether to activate JavaScript support for the context. Defaults
     * to `false`.
     */
    javaScriptEnabled?: boolean;

    /**
     * Specifies the user's locale following ICU locale (e.g. 'en_US').
     * Defaults to host system locale.
     */
    locale?: string;

    /**
     * Whether to emulate an offline network. Defaults to `false`.
     */
    offline?: boolean;

    /**
     * Permissions to grant for the context's pages. Defaults to
     * null.
     */
    permissions?: BrowserPermissions[];

    /**
     * Minimizes the amount of motion by emulating the
     * 'prefers-reduced-motion' media feature. Defaults to
     * `'no-preference'`.
     */
    reducedMotion?: "reduce" | "no-preference";

    /**
     * Sets a window screen size for all pages in the context. It can
     * only be used when the viewport is set. Defaults to
     * `{'width': 1280, 'height': 720}`.
     */
    screen?: {
        /**
         * Page width in pixels.
         */
        width: number;

        /**
         * Page height in pixels.
         */
        height: number;
    };

    /**
     * Changes the context's timezone. See ICU's metaZones.txt for a
     * list of supported timezone IDs. Defaults to what is set on the
     * system.
     */
    timezoneID?: string;

    /**
     * Specifies the user agent to use in the context. Defaults to what
     * is set on the by the browser.
     */
    userAgent?: string;

    /**
     * Sets a viewport size for all pages in the context. null disables
     * the default viewport. Defaults to `{'width': 1280, 'height': 720}`.
     */
    viewport?: {
        /**
         * Page width in pixels.
         */
        width: number;

        /**
         * Page height in pixels.
         */
        height: number;
    };
}

/**
 * The `browser` named export is the entry point for all your tests,
 * it interacts with the actual web browser via Chrome DevTools Protocol (CDP).
 */
export const browser: Browser;

/**
 * `Browser` represents the main web browser instance.
 */
export interface Browser {
    /**
     * Closes the current `BrowserContext`. If there is no active
     * `BrowserContext`, this method will throw an error.
     */
    closeContext(): void;

    /**
     * Returns the current `BrowserContext`. There is a 1-to-1 mapping between
     * `Browser` and `BrowserContext`. If no `BrowserContext` has been
     * initialized, it will return null.
     */
    context(): BrowserContext | null;

    /**
     * Indicates whether the CDP connection to the browser process is active or
     * not.
     */
    isConnected(): boolean;

    /**
     * Creates and returns a new `BrowserContext` if one hasn't already been
     * initialized for the `Browser`. If one has already been initialized an
     * error is thrown.
     *
     * There is a 1-to-1 mapping between `Browser` and `BrowserContext`. Due to
     * this restriction, if one already exists, it must be closed first before
     * creating a new one.
     * @param options
     */
    newContext(
        options?: NewBrowserContextOptions,
    ): Promise<BrowserContext>;

    /**
     * Creates and returns a new `Page` in a new `BrowserContext` if a
     * `BrowserContext` hasn't already been initialized for the `Browser`. If a
     * `BrowserContext` has already been initialized an error is thrown.
     *
     * There is a 1-to-1 mapping between `Browser` and `BrowserContext`. Due to
     * this restriction, if one already exists, it must be closed first before
     * creating a new one.
     * @param options
     */
    newPage(
        options?: NewBrowserContextOptions,
    ): Promise<Page>;

    /**
     * Returns the browser application's user agent.
     */
    userAgent(): string;

    /**
     * Returns the browser application's version.
     */
    version(): string;
}

/**
 * `BrowserContext` provides a way to operate multiple independent sessions, with
 * separate pages, cache, and cookies.
 */
export interface BrowserContext {
    /**
     * Adds a script which will be evaluated in one of the following scenarios:
     * - Whenever a page is created in the browser context or is navigated.
     * - Whenever a child frame is attached or navigated in any page in the
     *   browser context. In this case, the script is evaluated in the context
     *   of the newly attached frame.
     *
     * The script is evaluated after the document is created but before any of
     * its scripts were run. This is useful to amend the JavaScript environment,
     * e.g. to override `Math.random`.
     *
     * **Usage**
     *
     * An example of overriding `Math.random` before the page loads:
     *
     * ```js
     * const browserContext = await browser.newContext();
     * await browserContext.addInitScript("Math.random = function(){return 0}");
     *
     * const page = await browserContext.newPage();
     * await page.goto(url);
     * ```
     *
     * @param script Script to be evaluated in all pages in the browser context.
     */
    addInitScript(script: string | { content?: string }): Promise<void>;

    /**
     * Returns the `Browser` instance that this `BrowserContext` belongs to.
     */
    browser(): Browser;

    /**
     * Adds {@link Cookie | cookies} into this {@link BrowserContext}.
     *
     * @param cookies The {@link Cookie | cookies} to add to this {@link BrowserContext}.
     * @example
     * ```js
     * await context.addCookies([
     *   { name: 'foo', value: 'foovalue', sameSite: 'Lax', url: 'https://k6.io' },
     *   { name: 'bar', value: 'barvalue', sameSite: 'Strict', domain: 'test.k6.io', path: '/bar' },
     * ]);
     * ```
     */
    addCookies(cookies: Cookie[]): Promise<void>;

    /**
     * Clears the {@link Cookie | cookies} in this {@link BrowserContext}.
     *
     * @example
     * ```js
     * await context.addCookies([{ name: 'foo', value: 'bar', url: 'https://k6.io' }]);
     * context.cookies().length; // 1
     * await context.clearCookies();
     * context.cookies().length; // 0
     * ```
     */
    clearCookies(): Promise<void>;

    /**
     * Retrieves the {@link Cookie | cookies} in this {@link BrowserContext} filtered by provided URLs,
     * or all {@link Cookie | cookies} if no URLs are provided.
     *
     * @param urls URLs to filter {@link Cookie | cookies} by.
     * @example
     * ```js
     * // Get all cookies in the browser context
     * const cookies = await context.cookies();
     *
     * // Get all cookies for the specified URLs
     * const cookies = await context.cookies('https://k6.io', 'https://test.k6.io');
     *
     * // Get all cookies for the specified URLs and filter by name
     * const cookies = await context.cookies('https://k6.io', 'https://test.k6.io').filter(c => c.name === 'foo');
     * ```
     */
    cookies(...urls: string[]): Promise<Cookie[]>;

    /**
     * Clears all permission overrides for the {@link BrowserContext}.
     * ```js
     * await context.clearPermissions();
     * ```
     */
    clearPermissions(): Promise<void>;

    /**
     * Close the `BrowserContext` and all its `Page`s.
     */
    close(): Promise<void>;

    /**
     * Grants specified permissions to the {@link BrowserContext}.
     * ```js
     * await context.grantPermissions(['geolocation']);
     * ```
     */
    grantPermissions(
        /**
         * A string array of permissions to grant.
         */
        permissions: BrowserPermissions[],
        options?: {
            /**
             * The origin to grant permissions to, e.g. 'https://test.k6.com'.
             */
            origin: string;
        },
    ): Promise<void>;

    /**
     * Creates a new `Page` in the `BrowserContext`.
     */
    newPage(): Promise<Page>;

    /**
     * Returns a list of `Page`s that belongs to the `BrowserContext`.
     */
    pages(): Page[];

    /**
     * Sets the default navigation timeout in milliseconds.
     */
    setDefaultNavigationTimeout(
        /**
         * The timeout in milliseconds.
         */
        timeout: number,
    ): void;

    /**
     * Sets the default maximum timeout for all methods accepting a timeout
     * option in milliseconds.
     */
    setDefaultTimeout(
        /**
         * The timeout in milliseconds.
         */
        timeout: number,
    ): void;

    /**
     * Sets the `BrowserContext`'s geolocation.
     */
    setGeolocation(
        geolocation?: {
            /**
             * latitude should be between -90 and 90.
             */
            latitude: number;

            /**
             * longitude should be between -180 and 180.
             */
            longitude: number;

            /**
             * accuracy should only be a non-negative number. Defaults to 0.
             */
            accuracy: number;
        },
    ): Promise<void>;

    /**
     * Toggles the `BrowserContext`'s connectivity on/off.
     */
    setOffline(
        /**
         * Whether to emulate the BrowserContext being disconnected (`true`)
         * or connected (`false`). Defaults to `false`.
         */
        offline: boolean,
    ): Promise<void>;

    /**
     * Waits for the event to fire and passes its value into the predicate
     * function. Currently the only supported event is 'page' which when used will
     * return the new {@link Page} that was created after `waitForEvent` was called.
     *
     * @example
     * ```js
     * // Call waitForEvent with a predicate which will return true once at least
     * // one page has been created.
     * const promise = context.waitForEvent("page", {
     *   predicate: page => {
     *     if (++counter >= 1) {
     *       return true
     *     }
     *
     *     return false
     *   }
     * })
     *
     * // Now we create a page.
     * const page = await context.newPage()
     *
     * // Wait for the predicate to pass.
     * await promise
     * ```
     */
    waitForEvent(
        /**
         * Name of event to wait for. The only supported event is 'page'. If any
         * other value is used an error will be thrown.
         */
        event: "page",
        /**
         * This is an optional argument. It can either be a predicate function or
         * an options object.
         */
        optionsOrPredicate?: {
            /**
             * Optional function that will be called when the {@link Page} event is
             * emitted. The event data will be passed to it and it must return true
             * to continue.
             *
             * If {@link Page} is passed to predicate, this signals that a new page
             * has been created.
             */
            predicate?: (page: Page) => boolean;

            /**
             * Maximum time to wait in milliseconds. Defaults to 30000 milliseconds or
             * the timeout set by setDefaultTimeout on the {@link BrowserContext}.
             */
            timeout?: number;
        } | ((page: Page) => boolean),
    ): Promise<Page>;
}

/**
 * {@link ConsoleMessage} objects are dispatched by page via the
 * `page.on('console')` event. For each console message logged in the page,
 * k6 browser delivers it to the registered handlers.
 *
 * ```js
 * // Listen for all console log messages in the browser page and output them
 * // in the test logs
 * page.on('console', msg => console.log(msg.text()));
 *
 * // Listen for all console events and handle errors
 * page.on('console', msg => {
 *   if (msg.type() === 'error')
 *     console.log(`Error text: "${msg.text()}"`);
 * });
 *
 * // Deconstruct console log arguments
 * await msg.args()[0].jsonValue(); // hello
 * await msg.args()[1].jsonValue(); // 42
 * ```
 */
export interface ConsoleMessage {
    /**
     * List of arguments passed to a `console` function call. See also
     * `page.on('console')`.
     */
    args(): JSHandle[];

    /**
     * The page that produced this console message, if any.
     */
    page(): null | Page;

    /**
     * The text of the console message.
     */
    text(): string;

    /**
     * One of the following values: `'log'`, `'debug'`, `'info'`, `'error'`,
     * `'warning'`, `'dir'`, `'dirxml'`, `'table'`, `'trace'`, `'clear'`,
     * `'startGroup'`, `'startGroupCollapsed'`, `'endGroup'`, `'assert'`,
     * `'profile'`, `'profileEnd'`, `'count'`, `'timeEnd'`.
     */
    type(): string;
}

/**
 * {@link Cookie} represents a cookie in a {@link BrowserContext}.
 *
 * @see
 * {@link BrowserContext} has methods to {@link BrowserContext.addCookies | add}, {@link BrowserContext.cookies | query} and {@link BrowserContext.clearCookies | clear} cookies.
 */
export interface Cookie {
    /**
     * The {@link Cookie | cookie}'s name.
     *
     * @defaultValue
     * The default is `''`.
     */
    name: string;

    /**
     * The {@link Cookie | cookie}'s value.
     *
     * @defaultValue
     * The default is `''`.
     */
    value: string;

    /**
     * The {@link Cookie | cookie}'s URL.
     *
     * Required unless one of {@link Cookie.domain | domain} or {@link Cookie.path | path} are specified.
     */
    url?: string;

    /**
     * The {@link Cookie | cookie}'s domain.
     *
     * Required unless one of {@link Cookie.url | url} or {@link Cookie.path | path} are specified.
     */
    domain?: string;

    /**
     * The {@link Cookie | cookie}'s path.
     *
     * Required unless one of {@link Cookie.url | url} or {@link Cookie.domain | domain} are specified.
     *
     * @defaultValue
     * The default is `'/'`.
     */
    path?: string;

    /**
     * The {@link Cookie | cookie}'s expiration date as the number of seconds since the UNIX epoch.
     *
     * If omitted, the {@link Cookie | cookie} becomes a session cookie.
     *
     * @defaultValue
     * The default is `-1`, meaning a session cookie.
     */
    expires?: number;

    /**
     * Whether the {@link Cookie | cookie} is http-only.
     *
     * @defaultValue
     * The default is `false`.
     */
    httpOnly?: boolean;

    /**
     * Whether the {@link Cookie | cookie} is secure.
     *
     * @defaultValue
     * The default is `false`.
     */
    secure?: boolean;

    /**
     * The {@link Cookie | cookie}'s same-site status.
     *
     * It can be one of `'Strict'`, `'Lax'`, or `'None'`.
     *
     * @defaultValue
     * The default is `'Lax'`.
     */
    sameSite?: CookieSameSite;
}

/**
 * CookieSameSite represents the same-site status of a {@link Cookie | cookie}.
 *
 * @defaultValue
 * The default is `'Lax'`.
 */
export type CookieSameSite = "Strict" | "Lax" | "None";

/**
 * ElementHandle represents an in-page DOM element.
 */
export interface ElementHandle extends JSHandle {
    /**
     * Finds an element matching the specified selector in the `ElementHandle`'s subtree.
     * @param selector A selector to query element for.
     * @returns An `ElementHandle` pointing to the result element or `null`.
     */
    $(selector: string): Promise<ElementHandle | null>;

    /**
     * Finds all elements matching the specified selector in the `ElementHandle`'s subtree.
     * @param selector A selector to query element for.
     * @returns A list of `ElementHandle`s pointing to the result elements.
     */
    $$(selector: string): Promise<ElementHandle[]>;

    /**
     * This method returns the bounding box of the element.
     * @returns Element's bounding box.
     */
    boundingBox(): Promise<Rect | null>;

    /**
     * Checks the checkbox element.
     * @param options The options to use.
     */
    check(options?: ElementClickOptions & StrictnessOptions): Promise<void>;

    /**
     * Clicks the element.
     * @param options The options to use.
     * @returns A promise that resolves when the element is clicked.
     */
    click(
        options?: {
            /**
             * The mouse button (`left`, `middle` or `right`) to use during the action.
             * Defaults to `left`.
             */
            button?: MouseButton;

            /**
             * The number of times the action is performed. Defaults to `1`.
             */
            clickCount?: number;

            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * Get the content frame for element handles.
     * @returns The content frame handle of the element handle.
     */
    contentFrame(): Promise<Frame>;

    /**
     * Double clicks the element.
     * @param options The options to use.
     */
    dblclick(
        options?: {
            /**
             * The mouse button (`left`, `middle` or `right`) to use during the action.
             * Defaults to `left`.
             */
            button?: MouseButton;

            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * Dispatches a DOM event to the element.
     * @param type DOM event type: `"click"` etc.
     * @param eventInit Optional event-specific initialization properties.
     * @param options
     */
    dispatchEvent(
        type: string,
        eventInit?: EvaluationArgument,
    ): Promise<void>;

    /**
     * Fill the `input` or `textarea` element with the provided `value`.
     * @param value Value to fill for the `input` or `textarea` element.
     * @param options Element handle options.
     */
    fill(value: string, options?: ElementHandleOptions): Promise<void>;

    /**
     * Focuses the element.
     */
    focus(): Promise<void>;

    /**
     * Fetch the element's attribute value.
     * @param name Attribute name to get the value for.
     * @returns Attribute value.
     */
    getAttribute(name: string): Promise<string | null>;

    /**
     * Scrolls element into view and hovers over its center point.
     * @param options Hover options.
     */
    hover(options?: ElementClickOptions & KeyboardModifierOptions): Promise<void>;

    /**
     * Returns the `element.innerHTML`.
     * @returns Element's innerHTML.
     */
    innerHTML(): Promise<string>;

    /**
     * Returns the `element.innerText`.
     * @returns Element's innerText.
     */
    innerText(): Promise<string>;

    /**
     * Returns `input.value` for the selected `input`, `textarea` or `select` element.
     * @returns The input value of the element.
     */
    inputValue(options?: TimeoutOptions): Promise<string>;

    /**
     * Checks if a checkbox or radio is checked.
     * @returns Whether the element is checked.
     */
    isChecked(): Promise<boolean>;

    /**
     * Checks if the element is disabled.
     * @returns Whether the element is disabled.
     */
    isDisabled(): Promise<boolean>;

    /**
     * Checks if the element is editable.
     * @returns Whether the element is editable.
     */
    isEditable(): Promise<boolean>;

    /**
     * Checks if the element is enabled.
     * @returns Whether the element is enabled.
     */
    isEnabled(): Promise<boolean>;

    /**
     * Checks if the element is hidden.
     * @returns Whether the element is hidden.
     */
    isHidden(): Promise<boolean>;

    /**
     * Checks if the element is visible.
     * @returns Whether the element is visible.
     */
    isVisible(): Promise<boolean>;

    /**
     * Returns the frame containing the given element.
     * @returns The frame that contains the element handle.
     */
    ownerFrame(): Promise<Frame>;

    /**
     * Focuses the element, and then uses `keyboard.down` and `keyboard.up` with the specified key.
     * @param key A keyboard key name or a single character to press.
     * @param options Keyboard press options.
     */
    press(key: string, options?: KeyboardPressOptions): Promise<void>;

    /**
     * This method scrolls element into view, if needed, and then captures a
     * screenshot of it.
     * @param options Screenshot options.
     * @returns An `ArrayBuffer` with the screenshot data.
     */
    screenshot(options?: ScreenshotOptions & TimeoutOptions): Promise<ArrayBuffer>;

    /**
     * This method checks whether the element is actionable using provided options, and
     * then tries to scroll it into view, unless it is completely visible.
     * @param options Element handle options.
     */
    scrollIntoViewIfNeeded(options?: ElementHandleOptions): Promise<void>;

    /**
     * Select one or more options of a `<select>` element which match the values.
     * @param values Values of options to select.
     * @param options Element handle options.
     * @returns List of selected options.
     */
    selectOption(
        values: string | ElementHandle | SelectOptionsObject | string[] | ElementHandle[] | SelectOptionsObject[],
        options?: ElementHandleOptions,
    ): Promise<string[]>;

    /**
     * Focuses the element and selects all its text content.
     * @param options Element handle options.
     */
    selectText(options?: ElementHandleOptions): Promise<void>;

    /**
     * Sets the file input element's value to the specified files.
     *
     * To work with local files on the file system, use the experimental
     * fs module to load and read the file contents.
     *
     * The {@link ElementHandle | element handle} must be an [input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input).
     * @param files
     * @param options
     */
    setInputFiles(files: File | File[], options?: {
        /**
         * Maximum time in milliseconds. Pass 0 to disable the timeout. Default
         * is overridden by the setDefaultTimeout option on {@link BrowserContext} or
         * {@link Page}.
         * @default 30000
         */
        timeout?: number;

        /**
         * If set to `true` and a navigation occurs from performing this action, it
         * does not wait for it to complete.
         * @default false
         */
        noWaitAfter?: boolean;
    }): Promise<void>;

    /**
     * Scrolls element into view if needed, and then uses `page.tapscreen` to tap in the center of the element
     * or at the specified position.
     * @param options Tap options.
     */
    tap(options?: MouseMoveOptions): Promise<void>;

    /**
     * Returns the `node.textContent`.
     * @returns The text content of the element.
     */
    textContent(): Promise<string | null>;

    /**
     * Scrolls element into view, focuses element and types text.
     * @param text Text to type into the element.
     * @param options Typing options.
     */
    type(text: string, options?: KeyboardPressOptions): Promise<void>;

    /**
     * Scrolls element into view, and if it's an input element of type
     * checkbox that is already checked, clicks on it to mark it as unchecked.
     * @param options Click options.
     */
    uncheck(options?: ElementClickOptions & StrictnessOptions): Promise<void>;

    /**
     * Returns when the element satisfies the `state`.
     * @param state Wait for element to satisfy this state.
     * @param options Wait options.
     */
    waitForElementState(state: InputElementState, options?: TimeoutOptions): Promise<void>;

    /**
     * Returns when the child element matching `selector` satisfies the `state`.
     * @param selector A selector to query for.
     * @param options Wait options.
     */
    waitForSelector(
        selector: string,
        options?: { state?: ElementState } & StrictnessOptions & TimeoutOptions,
    ): Promise<ElementHandle>;
}

/**
 * Frame represents the frame within a page. A page is made up of hierarchy of frames.
 */
export interface Frame {
    /**
     * Finds an element matching the specified selector within the `Frame`.
     * @param selector A selector to query element for.
     * @returns An `ElementHandle` pointing to the result element or `null`.
     */
    $(selector: string): Promise<ElementHandle | null>;

    /**
     * Finds all elements matching the specified selector within the `Frame`.
     * @param selector A selector to query element for.
     * @returns A list of `ElementHandle`s pointing to the result elements.
     */
    $$(selector: string): Promise<ElementHandle[]>;

    /**
     * Checks the first checkbox element found that matches selector.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    check(selector: string, options?: ElementClickOptions & StrictnessOptions): Promise<void>;

    /**
     * Uncheck the first found element that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    uncheck(selector: string, options?: ElementClickOptions & StrictnessOptions): Promise<void>;

    /**
     * Clicks the element.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns A promise that resolves when the element is clicked.
     */
    click(selector: string, options?: MouseMultiClickOptions & StrictnessOptions): Promise<void>;

    /**
     * Double clicks the element.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    dblclick(selector: string, options?: MouseClickOptions & MouseMoveOptions & StrictnessOptions): Promise<void>;

    /**
     * Fills out the first element found that matches the selector.
     * @param selector The selector to use.
     * @param value The value to fill.
     * @param options The options to use.
     */
    fill(selector: string, value: string, options?: ElementHandleOptions & StrictnessOptions): Promise<void>;

    /**
     * Focuses the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    focus(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<void>;

    /**
     * Hovers the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    hover(selector: string, options?: ElementClickOptions & KeyboardModifierOptions & StrictnessOptions): Promise<void>;

    /**
     * Taps the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     */
    tap(selector: string, options?: ElementClickOptions & KeyboardModifierOptions & StrictnessOptions): Promise<void>;

    /**
     * Press the given key for the first element found that matches the selector.
     * @param selector The selector to use.
     * @param key The key to press.
     * @param options The options to use.
     */
    press(selector: string, key: string, options?: KeyboardPressOptions & StrictnessOptions): Promise<void>;

    /**
     * Type the given text for the first element found that matches the selector.
     * @param selector The selector to use.
     * @param text The text to type.
     * @param options The options to use.
     */
    type(selector: string, text: string, options?: KeyboardPressOptions & StrictnessOptions): Promise<void>;

    /**
     * Select the given options and return the array of option values of the first element
     * found that matches the selector.
     * @param selector The selector to use.
     * @param values The values to select.
     * @returns The array of option values of the first element found.
     */
    selectOption(
        selector: string,
        values: string | ElementHandle | SelectOptionsObject | string[] | ElementHandle[] | SelectOptionsObject[],
        options?: ElementHandleOptions & StrictnessOptions,
    ): Promise<string[]>;

    /**
     * Dispatches an event for the first element matching the selector.
     * @param selector The selector to use.
     * @param type The type of event to dispatch.
     * @param eventInit The event initialization properties.
     * @param options The options to use.
     */
    dispatchEvent(
        selector: string,
        type: string,
        eventInit?: object,
        options?: TimeoutOptions & StrictnessOptions,
    ): Promise<void>;

    /**
     * Returns the value of the `pageFunction` invocation.
     *
     * A string can also be passed in instead of a function.
     *
     * @param pageFunction Function to be evaluated in the page context.
     * @param arg Optional argument to pass to `pageFunction`.
     */
    evaluate<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<R>;

    /**
     * Returns the value of the `pageFunction` invocation as a [JSHandle].
     *
     * The only difference between page.evaluate(pageFunction[, arg]) and
     * page.evaluateHandle(pageFunction[, arg]) is that
     * page.evaluateHandle(pageFunction[, arg])returns [JSHandle].
     *
     * @param pageFunction Function to be evaluated in the page context.
     * @param arg Optional argument to pass to `pageFunction`.
     */
    evaluateHandle<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<JSHandle<R>>;

    /**
     * Get the page that owns frame.
     * @returns The page that owns frame.
     */
    page(): Page;

    /**
     * Get the parent frame.
     * @returns The parent frame, or `null` if there is no parent frame.
     */
    parentFrame(): Frame | null;

    /**
     * Get a list of all child frames.
     * @returns A list of all child frames.
     */
    childFrames(): Frame[];

    /**
     * Get the `ElementHandle` for this frame.
     * @returns The `ElementHandle` for this frame.
     */
    frameElement(): Promise<ElementHandle>;

    /**
     * Navigate the frame to the specified URL and return a HTTP response object.
     * @param url The URL to navigate to.
     * @param options The options to use.
     * @returns A promise that resolves to the HTTP response object.
     */
    goto(url: string, options?: NavigationOptions): Promise<Response | null>;

    /**
     * Replace the entire HTML document content.
     * @param html The HTML to use.
     * @param options The options to use.
     */
    setContent(html: string, options?: ContentLoadOptions): Promise<void>;

    /**
     * Get the name of the frame.
     * @returns The name of the frame.
     */
    name(): string;

    /**
     * Get the title of the frame.
     * @returns The title of the frame.
     */
    title(): Promise<string>;

    /**
     * Get the URL of the frame.
     * @returns The URL of the frame.
     */
    url(): string;

    /**
     * Get the HTML content of the frame.
     * @returns The HTML content of the frame.
     */
    content(): Promise<string>;

    /**
     * Get whether the frame is detached or not.
     * @returns `true` if the frame is detached, `false` otherwise.
     */
    isDetached(): boolean;

    /**
     * Сreates and returns a new locator for this frame.
     * @param selector The selector to use.
     * @returns The new locator.
     */
    locator(selector: string): Locator;

    /**
     * Get the `innerHTML` attribute of the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns The `innerHTML` attribute of the first element found.
     */
    innerHTML(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<string>;

    /**
     * Get the `innerText` attribute of the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns The `innerText` attribute of the first element found.
     */
    innerText(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<string>;

    /**
     * Get the text content of the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns The text content of the first element found.
     */
    textContent(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<string>;

    /**
     * Get the value of an attribute of the first element found that matches the selector.
     * @param selector The selector to use.
     * @param name The name of the attribute to get.
     * @param options The options to use.
     * @returns The value of the attribute.
     */
    getAttribute(selector: string, name: string, options?: TimeoutOptions & StrictnessOptions): Promise<string>;

    /**
     * Get the input value of the first element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns The input value of the first element found.
     */
    inputValue(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<string>;

    /**
     * Get the `checked` attribute of the first checkbox element found that matches the selector.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the checkbox is checked, `false` otherwise.
     */
    isChecked(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<boolean>;

    /**
     * Get whether the first element found that matches the selector is disabled or not.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the element is disabled, `false` otherwise.
     */
    isDisabled(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<boolean>;

    /**
     * Get whether the first element found that matches the selector is enabled or not.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the element is enabled, `false` otherwise.
     */
    isEnabled(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<boolean>;

    /**
     * Get whether the first element found that matches the selector is editable or not.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the element is editable, `false` otherwise.
     */
    isEditable(selector: string, options?: TimeoutOptions & StrictnessOptions): Promise<boolean>;

    /**
     * Get whether the first element found that matches the selector is hidden or not.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the element is hidden, `false` otherwise.
     */
    isHidden(selector: string, options?: StrictnessOptions): Promise<boolean>;

    /**
     * Get whether the first element found that matches the selector is visible or not.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns `true` if the element is visible, `false` otherwise.
     */
    isVisible(selector: string, options?: StrictnessOptions): Promise<boolean>;

    /**
     * Sets the file input element's value to the specified files.
     *
     * To work with local files on the file system, use the experimental
     * fs module to load and read the file contents.
     *
     * This method expects a `selector` to point to an
     * [input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input).
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param files
     * @param options
     */
    setInputFiles(selector: string, files: File | File[], options?: {
        /**
         * Maximum time in milliseconds. Pass 0 to disable the timeout. Default
         * is overridden by the setDefaultTimeout option on {@link BrowserContext} or
         * {@link Page}
         * @default 30000
         */
        timeout?: number;

        /**
         * If set to `true` and a navigation occurs from performing this action, it
         * will not wait for it to complete.
         * @default false
         */
        noWaitAfter?: boolean;
    }): Promise<void>;

    /**
     * Wait for the given function to return a truthy value.
     * @param predicate The function to call and wait for.
     * @param options The options to use.
     */
    waitForFunction<R, Arg>(
        pageFunction: PageFunction<Arg, R>,
        options?: PollingOptions & TimeoutOptions,
        arg?: Arg,
    ): Promise<JSHandle<R>>;

    /**
     * Wait for the given load state to be reached.
     * This will unblock if that lifecycle event has already been received.
     * @param state The load state to wait for, defaults to `load`.
     * @param options The options to use.
     */
    waitForLoadState(state?: LifecycleEvent, options?: TimeoutOptions): Promise<void>;

    /**
     * Waits for the navigation event to happen.
     * @param options The options to use.
     * @returns A promise that resolves to the response of the navigation when it happens.
     */
    waitForNavigation(options?: ContentLoadOptions): Promise<Response | null>;

    /**
     * Wait for the given selector to match the waiting criteria.
     * @param selector The selector to use.
     * @param options The options to use.
     * @returns The first element found that matches the selector.
     */
    waitForSelector(
        selector: string,
        options?: ElementStateFilter & TimeoutOptions & StrictnessOptions,
    ): Promise<ElementHandle>;

    /**
     * Wait for the given timeout to elapse.
     * @param timeout The timeout to wait for.
     */
    waitForTimeout(timeout: number): Promise<void>;
}

/**
 * JSHandle represents an in-page JavaScript object.
 */
export interface JSHandle<T = any> {
    /**
     * Returns either `null` or the object handle itself, if the object handle is
     * an instance of `ElementHandle`.
     * @returns The ElementHandle if available.
     */
    asElement(): Promise<ElementHandle | null>;

    /**
     * Stops referencing the element handle.
     */
    dispose(): Promise<void>;

    /**
     * Evaluates the page function and returns its return value.
     * This method passes this handle as the first argument to the page function.
     * @param pageFunction The function to be evaluated.
     * @param args The arguments to pass to the page function.
     * @returns The return value of `pageFunction`.
     */
    evaluate<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<R>;

    /**
     * Evaluates the page function and returns a `JSHandle`.
     * This method passes this handle as the first argument to the page function.
     * Unlike `evaluate`, `evaluateHandle` returns the value as a `JSHandle`
     * @param pageFunction The function to be evaluated.
     * @param args The arguments to pass to the page function.
     * @returns A JSHandle of the return value of `pageFunction`.
     */
    evaluateHandle<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<JSHandle<R>>;

    /**
     * Fetches a map with own property names of of the `JSHandle` with their values as
     * `JSHandle` instances.
     * @returns A map with property names as keys and `JSHandle` instances for the property values.
     */
    getProperties(): Promise<Map<string, JSHandle>>;

    /**
     * Fetches a JSON representation of the object.
     * @returns A JSON representation of the object.
     */
    jsonValue(): Promise<any>;
}

/**
 * Keyboard provides an API for managing a virtual keyboard.
 */
export interface Keyboard {
    /**
     * Sends a key down message to a session target.
     * A superset of the key values can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).
     * @param key Name of key to press, such as `ArrowLeft`.
     */
    down(key: string): Promise<void>;

    /**
     * Dispatches an `input` event with the given `text`.
     * This method does not emit `keyDown`, `keyUp` or `keyPress` events.
     * @param text Event text.
     */
    insertText(text: string): Promise<void>;

    /**
     * Sends a key press message to a session target.
     * A press message consists of successive key down and up messages.
     * @param key Sequence of keys to press.
     * @param options Specifies the typing options.
     */
    press(key: string, options?: { delay?: number }): Promise<void>;

    /**
     * Type sends a `press` message to a session target for each character in text.
     * It sends an insertText message if a character is not among
     * valid characters in the keyboard's layout.
     * Modifier keys `Shift`, `Control`, `Alt`, `Meta` are _not_ respected.
     * @param text A text to type into a focused element.
     * @param options Specifies the typing options.
     */
    type(text: string, options?: { delay?: number }): Promise<void>;

    /**
     * Sends a key up message to a session target.
     * A superset of the key values can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).
     * @param key Name of key to release, such as `ArrowLeft`.
     */
    up(key: string): Promise<void>;
}

/**
 * The Locator API makes it easier to work with dynamically changing elements.
 * Some of the benefits of using it over existing ways to locate an element
 * (e.g. Page.$()) include:
 *
 * - Helps with writing robust tests by finding an element even if the
 * underlying frame navigates.
 * - Makes it easier to work with dynamic web pages and SPAs built with Svelte,
 * React, Vue, etc.
 */
export interface Locator {
    /**
     * Clears text boxes and input fields of any existing values.
     *
     * **Usage**
     *
     * ```js
     * // Clears the input field matching the selector.
     * page.locator('input[name="login"]').clear();
     * ```
     *
     * @param options Options to use.
     */
    clear(options?: ElementHandleOptions): Promise<void>;

    /**
     * Mouse click on the chosen element.
     * @param options Options to use.
     * @returns Promise which resolves when the element is successfully clicked.
     */
    click(options?: MouseMoveOptions & MouseMultiClickOptions): Promise<void>;

    /**
     * Mouse double click on the chosen element.
     * @param options Options to use.
     */
    dblclick(options?: MouseMoveOptions & MouseMultiClickOptions): Promise<void>;

    /**
     * Use this method to select an `input type="checkbox"`.
     * @param options Options to use.
     */
    check(options?: ElementClickOptions): Promise<void>;

    /**
     * Use this method to unselect an `input type="checkbox"`.
     * @param options Options to use.
     */
    uncheck(options?: ElementClickOptions): Promise<void>;

    /**
     * Checks to see if the `input type="checkbox"` is selected or not.
     * @param options Options to use.
     * @returns `true` if the element is checked, `false` otherwise.
     */
    isChecked(options?: TimeoutOptions): Promise<boolean>;

    /**
     * Checks if the element is editable.
     * @param options Options to use.
     * @returns `true` if the element is editable, `false` otherwise.
     */
    isEditable(options?: TimeoutOptions): Promise<boolean>;

    /**
     * Checks if the element is `enabled`.
     * @param options Options to use.
     * @returns `true` if the element is enabled, `false` otherwise.
     */
    isEnabled(options?: TimeoutOptions): Promise<boolean>;

    /**
     * Checks if the element is `disabled`.
     * @param options Options to use.
     * @returns `true` if the element is disabled, `false` otherwise.
     */
    isDisabled(options?: TimeoutOptions): Promise<boolean>;

    /**
     * Checks if the element is `visible`.
     * @returns `true` if the element is visible, `false` otherwise.
     */
    isVisible(): Promise<boolean>;

    /**
     * Checks if the element is `hidden`.
     * @returns `true` if the element is hidden, `false` otherwise.
     */
    isHidden(): Promise<boolean>;

    /**
     * Fill an `input`, `textarea` or `contenteditable` element with the provided value.
     * @param value Value to fill for the `input` or `textarea` element.
     * @param options Options to use.
     */
    fill(value: string, options?: ElementHandleOptions): Promise<void>;

    /**
     * Focuses the element using locator's selector.
     * @param options Options to use.
     */
    focus(options?: TimeoutOptions): Promise<void>;

    /**
     * Returns the element attribute value for the given attribute name.
     * @param name Attribute name to retrieve value for.
     * @param options Options to use.
     * @returns Attribute value.
     */
    getAttribute(name: string, options?: TimeoutOptions): Promise<string | null>;

    /**
     * Returns the `element.innerHTML`.
     * @param options Options to use.
     * @returns Element's innerHTML.
     */
    innerHTML(options?: TimeoutOptions): Promise<string>;

    /**
     * Returns the `element.innerText`.
     * @param options Options to use.
     * @returns Element's innerText.
     */
    innerText(options?: TimeoutOptions): Promise<string>;

    /**
     * Returns the `element.textContent`.
     * @param options Options to use.
     * @returns Element's textContent.
     */
    textContent(options?: TimeoutOptions): Promise<string | null>;

    /**
     * Returns `input.value` for the selected `input`, `textarea` or `select` element.
     * @param options Options to use.
     * @returns The input value of the element.
     */
    inputValue(options?: TimeoutOptions): Promise<string>;

    /**
     * Select one or more options which match the values. If the select has the multiple attribute, all matching options are selected,
     * otherwise only the first option matching one of the passed options is selected.
     * @param values Values of options to select.
     * @param options Options to use.
     * @returns List of selected options.
     */
    selectOption(
        values: string | string[] | { value?: string; label?: string; index?: number },
        options?: ElementHandleOptions,
    ): Promise<string[]>;

    /**
     * Press a single key on the keyboard or a combination of keys.
     * A superset of the key values can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).
     * @param key Name of the key to press or a character to generate, such as `ArrowLeft` or `a`.
     * @param options Keyboard press options.
     */
    press(key: string, options?: KeyboardPressOptions): Promise<void>;

    /**
     * Type a text into the input field.
     * @param text Text to type into the input field.
     * @param options Typing options.
     */
    type(text: string, options?: KeyboardPressOptions): Promise<void>;

    /**
     * Hover over the element.
     * @param options Options to use.
     */
    hover(options?: MouseMoveOptions): Promise<void>;

    /**
     * Tap on the chosen element.
     * @param options Options to use.
     */
    tap(options?: MouseMoveOptions): Promise<void>;

    /**
     * Dispatches HTML DOM event types e.g. `click`.
     * @param type DOM event type.
     * @param eventInit Event-specific properties.
     * @param options Options to use.
     */
    dispatchEvent(type: string, eventInit?: EvaluationArgument, options?: TimeoutOptions): Promise<void>;

    /**
     * Wait for the element to be in a particular state e.g. `visible`.
     * @param options Wait options.
     */
    waitFor(options?: { state?: ElementState } & TimeoutOptions): Promise<void>;
}

/**
 * Mouse provides an API for managing a virtual mouse.
 */
export interface Mouse {
    /**
     * Shortcut for `mouse.move(x, y)`, `mouse.down()`, `mouse.up()`.
     * @param x The x position.
     * @param y The y position.
     * @param options The click options.
     */
    click(x: number, y: number, options?: MouseMultiClickOptions): Promise<void>;

    /**
     * Shortcut for `mouse.move(x, y)`, `mouse.down()`, `mouse.up()`, `mouse.down()`,
     * `mouse.up()`.
     * @param x The x position.
     * @param y The y position.
     * @param options The click options.
     */
    dblclick(x: number, y: number, options?: MouseClickOptions): Promise<void>;

    /**
     * Dispatches a `mousedown` event.
     * @param options The mouse down options.
     */
    down(options?: MouseDownUpOptions): Promise<void>;

    /**
     * Dispatches a `mousemove` event.
     * @param x The x position.
     * @param y The y position.
     * @param options The mouse move options.
     */
    move(x: number, y: number, options?: { steps?: number }): Promise<void>;

    /**
     * Dispatches a `mouseup` event.
     * @param options The mouse up options.
     */
    up(options?: MouseDownUpOptions): Promise<void>;
}

/**
 * Page provides methods to interact with a single tab in a running web browser
 * instance. One instance of the browser can have many page instances.
 */
export interface Page {
    /**
     * Activates the browser tab so that it comes into focus and actions can be
     * performed against it.
     */
    bringToFront(): Promise<void>;

    /**
     * **NOTE** Use locator-based `locator.check([options])` instead.
     *
     * This method is used to select an input checkbox.
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    check(
        selector: string,
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (visible,
             * stable, enabled). Defaults to `false`.
             */
            force?: boolean;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based `locator.click([options])` instead.
     *
     * This method clicks an element matching `selector`.
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    click(
        selector: string,
        options?: {
            /**
             * The mouse button (`left`, `middle` or `right`) to use during the action.
             * Defaults to `left`.
             */
            button?: MouseButton;

            /**
             * The number of times the action is performed. Defaults to `1`.
             */
            clickCount?: number;

            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * This will close the tab that this page is associated with.
     */
    close(): Promise<void>;

    /**
     * Gets the HTML contents of the page.
     */
    content(): Promise<string>;

    /**
     * Gets the `BrowserContext` that the page belongs to.
     */
    context(): BrowserContext;

    /**
     * **NOTE** Use locator-based `locator.dblclick([options])` instead.
     *
     * Mouse double clicks an element matching provided selector.
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    dblclick(
        selector: string,
        options?: {
            /**
             * The mouse button (`left`, `middle` or `right`) to use during the action.
             * Defaults to `left`.
             */
            button?: MouseButton;

            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based locator.dispatchEvent([options]) instead.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param type DOM event type: `"click"` etc.
     * @param eventInit Optional event-specific initialization properties.
     * @param options
     */
    dispatchEvent(
        selector: string,
        type: string,
        eventInit?: EvaluationArgument,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * This method changes the `CSS media type` through the `media` argument,
     * and/or the `'prefers-colors-scheme'` media feature, using the `colorScheme`
     * argument.
     * @param options
     */
    emulateMedia(options?: {
        /**
         * Emulates `'prefers-colors-scheme'` media feature, supported values are
         * `'light'`, `'dark'`, and `'no-preference'`.
         */
        colorScheme?: "light" | "dark" | "no-preference";

        /**
         * Changes the CSS media type of the page. The only allowed values are
         * `'screen'`, and `'print'`.
         */
        media?: "screen" | "print";

        /**
         * Emulates `'prefers-reduced-motion'` media feature, supported values are
         * `'reduce'`, `'no-preference'`.
         */
        reducedMotion?: "reduce" | "no-preference";
    }): Promise<void>;

    /**
     * This emulates your website with the specified vision deficiency type.
     * The supported types are:
     * - none: default.
     * - blurredVision: where vision is less precise.
     * - protanopia: the inability to perceive any red light.
     * - deuteranopia: the inability to perceive any green light.
     * - tritanopia: the inability to perceive any blue light.
     * - achromatopsia: the inability to perceive any color except for shades of
     * grey (extremely rare).
     * @param type
     */
    emulateVisionDeficiency(
        type: "none" | "blurredVision" | "deuteranopia" | "protanopia" | "tritanopia" | "achromatopsia",
    ): Promise<void>;

    /**
     * Returns the value of the `pageFunction` invocation.
     *
     * A string can also be passed in instead of a function.
     *
     * @param pageFunction Function to be evaluated in the page context.
     * @param arg Optional argument to pass to `pageFunction`.
     */
    evaluate<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<R>;

    /**
     * Returns the value of the `pageFunction` invocation as a [JSHandle].
     *
     * The only difference between page.evaluate(pageFunction[, arg]) and
     * page.evaluateHandle(pageFunction[, arg]) is that
     * page.evaluateHandle(pageFunction[, arg])returns [JSHandle].
     *
     * @param pageFunction Function to be evaluated in the page context.
     * @param arg Optional argument to pass to `pageFunction`.
     */
    evaluateHandle<R, Arg>(pageFunction: PageFunction<Arg, R>, arg?: Arg): Promise<JSHandle<R>>;

    /**
     * **NOTE** Use locator-based `locator.fill(value[, options])` instead.
     *
     * Fill an `input`, `textarea` or `[contenteditable]` element with the
     * provided value.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param value Value to fill for the `<input>`, `<textarea>` or
     * `[contenteditable]` element.
     * @param options
     */
    fill(
        selector: string,
        value: string,
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based `locator.focus([options])` instead.
     *
     * This method fetches an element with `selector` and focuses it.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    focus(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * Frames returns an array of frames on the page.
     */
    frames(): Frame[];

    /**
     * **NOTE** Use locator-based locator.getAttribute(name[, options]) instead.
     *
     * Returns the element attribute value for the given attribute name.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param name Attribute name to get the value for.
     * @param options
     */
    getAttribute(
        selector: string,
        name: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string | null>;

    /**
     * Navigates to the specified url and returns the main resource response.
     *
     * navigating to `about:blank` or navigation to the same URL with a different
     * hash, will succeed and return `null`.
     *
     * @param url URL to navigate page to. The url should include scheme, e.g.
     * `https://`.
     * @param options
     */
    goto(url: string, options?: NavigationOptions): Promise<Response | null>;

    /**
     * **NOTE** Use locator-based locator.hover([options]) instead.
     *
     * This method hovers over an element matching `selector`.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    hover(
        selector: string,
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (`visible`,
             * `stable`, `enabled`). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based locator.innerHTML([options]) instead.
     *
     * Returns `element.innerHTML`.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    innerHTML(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string>;

    /**
     * **NOTE** Use locator-based locator.innerText([options]) instead.
     *
     * Returns `element.innerText`.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    innerText(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string>;

    /**
     * **NOTE** Use locator-based locator.inputValue([options]) instead.
     *
     * Returns `input.value` for the selected `<input>` or `<textarea>` or
     * `<select>` element.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    inputValue(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string>;

    /**
     * **NOTE** Use locator-based locator.isChecked([options]) instead.
     *
     * Checks to see if the `checkbox` `input` type is selected or not.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isChecked(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<boolean>;

    /**
     * Indicates that the page has been closed.
     */
    isClosed(): boolean;

    /**
     * **NOTE** Use locator-based locator.isDisabled([options]) instead.
     *
     * Returns whether the element is disabled.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isDisabled(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<boolean>;

    /**
     * **NOTE** Use locator-based locator.isEditable([options]) instead.
     *
     * Returns whether the element is editable.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isEditable(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<boolean>;

    /**
     * **NOTE** Use locator-based locator.isEnabled([options]) instead.
     *
     * Returns whether the element is enabled.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isEnabled(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<boolean>;

    /**
     * **NOTE** Use locator-based locator.isHidden() instead.
     *
     * Returns whether the element is hidden.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isHidden(selector: string, options?: StrictnessOptions): Promise<boolean>;

    /**
     * **NOTE** Use locator-based locator.isVisible() instead.
     *
     * Returns whether the element is visible.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    isVisible(selector: string, options?: StrictnessOptions): Promise<boolean>;

    /**
     * Returns the keyboard instance to interact with a virtual keyboard on the
     * page.
     */
    keyboard: Keyboard;

    /**
     * The method returns an element locator. Locators resolve to the element
     * when the action takes place, which means locators can span over navigations
     * where the underlying dom changes.
     *
     * @param selector A selector to use when resolving DOM element.
     */
    locator(selector: string): Locator;

    /**
     * The page's main frame. Page is made up of frames in a hierarchical. At the
     * top is mainFrame. A page is guaranteed to have a mainFrame.
     */
    mainFrame(): Frame;

    /**
     * Returns the mouse instance to interact with a virtual mouse on the page.
     */
    mouse: Mouse;

    /**
     * Emitted when JavaScript within the page calls one of console API methods
     * , e.g. `console.log` or `console.dir`. Also emitted if the page throws
     * an error or a warning.
     *
     * The arguments passed into `console.log` are available on the
     * {@link ConsoleMessage} event handler argument.
     *
     * **Usage**
     *
     * ```js
     * page.on('console', msg => {
     *   const values = [];
     *   for (const arg of msg.args())
     *     values.push(arg.jsonValue());
     *   console.log(...values);
     * });
     * page.evaluate(() => console.log('hello', 5, { foo: 'bar' }));
     * ```
     */
    on(event: "console", listener: (consoleMessage: ConsoleMessage) => void): void;

    /**
     * Returns the page that opened the current page. The first page that is
     * navigated to will have a null opener.
     */
    opener(): Promise<Page | null>;

    /**
     * **NOTE** Use locator-based locator.press(key[, options]) instead.
     *
     * Focuses the element, and then uses keyboard.down(key) and
     * keyboard.up(key).
     *
     * A superset of the `key` values can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values).
     *
     * Following modification shortcuts are also supported: `Shift`, `Control`,
     * `Alt`, `Meta`, `ShiftLeft`.
     *
     * Holding down `Shift` will type the text that corresponds to the `key` in
     * the upper case.
     *
     * If `key` is a single character, it is case-sensitive, so the values `a`
     * and `A` will generate different respective texts.
     *
     * Shortcuts such as `key: "Control+o"` or `key: "Control+Shift+T"` are
     * supported as well. When specified with the modifier, modifier is pressed
     * and being held while the subsequent key is being pressed.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param key Name of the key to press or a character to generate, such as
     * `ArrowLeft` or `a`.
     * @param options
     */
    press(
        selector: string,
        key: string,
        options?: {
            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * This reloads the current page Returns the main resource response.
     *
     * @param options
     */
    reload(options?: {
        /**
         * Maximum operation time in milliseconds. Defaults to `30` seconds. The
         * default value can be changed via the
         * browserContext.setDefaultNavigationTimeout(timeout),
         * browserContext.setDefaultTimeout(timeout),
         * page.setDefaultNavigationTimeout(timeout) or
         * page.setDefaultTimeout(timeout) methods.
         *
         * Setting the value to `0` will disable the timeout.
         */
        timeout?: number;

        /**
         * When to consider operation succeeded, defaults to `load`. Events can be
         * either:
         * - `'domcontentloaded'` - consider operation to be finished when the
         * `DOMContentLoaded` event is fired.
         * - `'load'` - consider operation to be finished when the `load` event is
         * fired.
         * - `'networkidle'` - **DISCOURAGED** consider operation to be finished
         * when there are no network connections for at least `500` ms. Don't use
         * this method for testing especially with chatty websites where the event
         * may never fire, rely on web assertions to assess readiness instead.
         */
        waitUntil?: "load" | "domcontentloaded" | "networkidle";
    }): Promise<Response | null>;

    /**
     * Returns the buffer with the captured screenshot from the browser.
     *
     * @param options
     */
    screenshot(
        options?: {
            /**
             * An object which specifies clipping of the resulting image.
             */
            clip?: {
                /**
                 * x-coordinate of top-left corner of clip area
                 */
                x: number;

                /**
                 * y-coordinate of top-left corner of clip area
                 */
                y: number;

                /**
                 * width of clipping area
                 */
                width: number;

                /**
                 * height of clipping area
                 */
                height: number;
            };

            /**
             * When true, takes a screenshot of the full scrollable page, instead of
             * the currently visible viewport. Defaults to `false`.
             */
            fullPage?: boolean;
        } & ScreenshotOptions,
    ): Promise<ArrayBuffer>;

    /**
     * **NOTE** Use locator-based locator.selectOption(values[, options]) instead.
     *
     * This select one or more options which match the values from a <select>
     * element.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param values Options to select. If the select has multiple attribute, all
     * matching options are selected, otherwise only the first option matching
     * one of the passed options is selected. Object can be made up of keys with
     * value, label or index.
     * @param options
     */
    selectOption(
        selector: string,
        values: string | ElementHandle | SelectOptionsObject | string[] | ElementHandle[] | SelectOptionsObject[],
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (visible,
             * stable, enabled). Defaults to `false`.
             */
            force?: boolean;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string[]>;

    /**
     * Set the supplied html string to the current page.
     *
     * @param html HTML markup to assign to the page.
     * @param options
     */
    setContent(
        html: string,
        options?: {
            /**
             * Maximum operation time in milliseconds. Defaults to `30` seconds. The
             * default value can be changed via the
             * browserContext.setDefaultNavigationTimeout(timeout),
             * browserContext.setDefaultTimeout(timeout),
             * page.setDefaultNavigationTimeout(timeout) or
             * page.setDefaultTimeout(timeout) methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * When to consider operation succeeded, defaults to `load`. Events can be
             * either:
             * - `'domcontentloaded'` - consider operation to be finished when the
             * `DOMContentLoaded` event is fired.
             * - `'load'` - consider operation to be finished when the `load` event is
             * fired.
             * - `'networkidle'` - **DISCOURAGED** consider operation to be finished
             * when there are no network connections for at least `500` ms. Don't use
             * this method for testing especially with chatty websites where the event
             * may never fire, rely on web assertions to assess readiness instead.
             */
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
        },
    ): Promise<void>;

    /**
     * This setting will change the navigation timeout for the following methods:
     * - page.goto(url[, options])
     * - page.reload([options])
     * - page.setContent(html[, options])
     * - page.waitForNavigation([options])
     *
     * @param timeout in milliseconds
     */
    setDefaultNavigationTimeout(timeout: number): void;

    /**
     * This setting will change the timeout for all the methods accepting a
     * `timeout` option.
     *
     * @param timeout in milliseconds
     */
    setDefaultTimeout(timeout: number): void;

    /**
     * This sets extra HTTP headers which will be sent with subsequent
     * HTTP requests.
     *
     * @param headers An object containing the additional HTTP headers.
     * All header values must be strings.
     */
    setExtraHTTPHeaders(headers: { [key: string]: string }): Promise<void>;

    /**
     * Sets the file input element's value to the specified files.
     *
     * To work with local files on the file system, use the experimental
     * fs module to load and read the file contents.
     *
     * This method expects a `selector` to point to an
     * [input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input).
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param files
     * @param options
     */
    setInputFiles(selector: string, files: File | File[], options?: {
        /**
         * Maximum time in milliseconds. Pass 0 to disable the timeout. Default
         * is overridden by the setDefaultTimeout option on {@link BrowserContext} or
         * {@link Page}
         * @default 30000
         */
        timeout?: number;

        /**
         * If set to `true` and a navigation occurs from performing this action, it
         * will not wait for it to complete.
         * @default false
         */
        noWaitAfter?: boolean;
    }): Promise<void>;

    /**
     * This will update the page's width and height.
     *
     * @param viewportSize
     */
    setViewportSize(viewportSize: {
        /**
         * page width in pixels.
         */
        width: number;

        /**
         * page height in pixels.
         */
        height: number;
    }): Promise<void>;

    /**
     * **NOTE** Use locator-based locator.tap([options]) instead.
     *
     * Tap the first element that matches the selector.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    tap(
        selector: string,
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (visible,
             * stable, enabled). Defaults to `false`.
             */
            force?: boolean;

            /**
             * `Alt`, `Control`, `Meta` or `Shift` modifiers keys pressed during the
             * action. If not specified, currently pressed modifiers are used,
             * otherwise defaults to `null`.
             */
            modifiers?: KeyboardModifier[];

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based locator.textContent([options]) instead.
     *
     * Returns `element.textContent`.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    textContent(
        selector: string,
        options?: {
            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<string | null>;

    /**
     * Throttles the CPU in Chrome/Chromium to slow it down by the specified
     * `rate` in {@link CPUProfile}. {@link CPUProfile} is a mandatory
     * input argument. The default `rate` is `1`.
     *
     * **Usage**
     *
     * ```js
     * page.throttleCPU({ rate: 4 });
     * ```
     */
    throttleCPU(profile: CPUProfile): Promise<void>;

    /**
     * Throttles the network in Chrome/Chromium to slow it down by the specified
     * fields in {@link NetworkProfile}. {@link NetworkProfile} is a mandatory
     * input argument.
     *
     * **Usage**
     *
     * ```js
     * page.throttleNetwork({
     *   latency: 750,
     *   download: 250,
     *   upload: 250,
     * });
     * ```
     *
     * To work with the most commonly tested network profiles, import `networkProfiles`
     * from the browser module. There are three profiles available:
     * - `'No Throttling'` (default)
     * - `'Fast 3G'`
     * - `'Slow 3G'`
     *
     * **Usage**
     *
     * ```js
     * import { browser, networkProfiles } from 'k6/experimental/browser';
     * ... // redacted
     *   const context = browser.newContext();
     *   const page = context.newPage();
     *
     *   try {
     *     page.throttleNetwork(networkProfiles['Slow 3G']);
     * ... // redacted
     * ```
     */
    throttleNetwork(profile: NetworkProfile): Promise<void>;

    /**
     * Returns the page's title.
     */
    title(): Promise<string>;

    /**
     * Returns the touchscreen instance to interact with a virtual touchscreen on
     * the page.
     */
    touchscreen: Touchscreen;

    /**
     * **NOTE** Use locator-based locator.type(text[, options]) instead.
     *
     * Type the `text` in the first element found that matches the selector.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param text The text to type into the element.
     * @param options
     */
    type(
        selector: string,
        text: string,
        options?: {
            /**
             * Milliseconds to wait between `mousedown` and `mouseup`. Defaults to `0`.
             */
            delay?: number;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * **NOTE** Use locator-based `locator.uncheck([options])` instead.
     *
     * This method is used to unselect an input checkbox.
     *
     * @param selector A selector to search for an element. If there are multiple
     * elements satisfying the selector, the first will be used.
     * @param options
     */
    uncheck(
        selector: string,
        options?: {
            /**
             * Setting this to `true` will bypass the actionability checks (visible,
             * stable, enabled). Defaults to `false`.
             */
            force?: boolean;

            /**
             * If set to `true` and a navigation occurs from performing this action, it
             * will not wait for it to complete. Defaults to `false`.
             */
            noWaitAfter?: boolean;

            /**
             * A point to use relative to the top left corner of the element. If not
             * supplied, a visible point of the element is used.
             */
            position?: {
                x: number;

                y: number;
            };

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;

            /**
             * Setting this to `true` will perform the actionability checks without
             * performing the action. Useful to wait until the element is ready for the
             * action without performing it. Defaults to `false`.
             */
            trial?: boolean;
        },
    ): Promise<void>;

    /**
     * Returns the page's URL.
     */
    url(): string;

    /**
     * Returns the page's size (width and height).
     */
    viewportSize(): {
        /**
         * page width in pixels.
         */
        width: number;

        /**
         * page height in pixels.
         */
        height: number;
    };

    /**
     * Returns when the `pageFunction` returns a truthy value.
     *
     * @param pageFunction Function to be evaluated in the page context.
     * @param arg Optional argument to pass to `pageFunction`.
     * @param options
     */
    waitForFunction<R, Arg>(
        pageFunction: PageFunction<Arg, R>,
        options?: {
            /**
             * If `polling` is `'raf'`, then `pageFunction` is constantly executed in
             * `requestAnimationFrame` callback. If `polling` is a number, then it is
             * treated as an interval in milliseconds at which the function would be
             * executed. Defaults to `raf`.
             */
            polling?: number | "raf";

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
        arg?: Arg,
    ): Promise<JSHandle<R>>;

    /**
     * This waits for the given load state to be reached. It will immediately
     * unblock if that lifecycle event has already been received.
     *
     * @param state Optional load state to wait for, defaults to `load`:
     * - `'domcontentloaded'` - consider operation to be finished when the
     * `DOMContentLoaded` event is fired.
     * - `'load'` - consider operation to be finished when the `load` event is
     * fired.
     * - `'networkidle'` - **DISCOURAGED** consider operation to be finished
     * when there are no network connections for at least `500` ms. Don't use
     * this method for testing especially with chatty websites where the event
     * may never fire, rely on web assertions to assess readiness instead.
     * @param options
     */
    waitForLoadState(
        state?: "load" | "domcontentloaded" | "networkidle",
        options?: {
            /**
             * Maximum operation time in milliseconds. Defaults to `30` seconds. The
             * default value can be changed via the
             * browserContext.setDefaultNavigationTimeout(timeout),
             * browserContext.setDefaultTimeout(timeout),
             * page.setDefaultNavigationTimeout(timeout) or
             * page.setDefaultTimeout(timeout) methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<void>;

    /**
     * Waits for the given navigation lifecycle event to occur and returns the main
     * resource response.
     *
     * @param options
     */
    waitForNavigation(options?: {
        /**
         * Maximum operation time in milliseconds. Defaults to `30` seconds. The
         * default value can be changed via the
         * browserContext.setDefaultNavigationTimeout(timeout),
         * browserContext.setDefaultTimeout(timeout),
         * page.setDefaultNavigationTimeout(timeout) or
         * page.setDefaultTimeout(timeout) methods.
         *
         * Setting the value to `0` will disable the timeout.
         */
        timeout?: number;

        /**
         * When to consider operation succeeded, defaults to `load`. Events can be
         * either:
         * - `'domcontentloaded'` - consider operation to be finished when the
         * `DOMContentLoaded` event is fired.
         * - `'load'` - consider operation to be finished when the `load` event is
         * fired.
         * - `'networkidle'` - **DISCOURAGED** consider operation to be finished
         * when there are no network connections for at least `500` ms. Don't use
         * this method for testing especially with chatty websites where the event
         * may never fire, rely on web assertions to assess readiness instead.
         */
        waitUntil?: "load" | "domcontentloaded" | "networkidle";
    }): Promise<Response | null>;

    /**
     * **NOTE** Use web assertions that assert visibility or a locator-based
     * locator.waitFor([options]) instead.
     *
     * Returns when element specified by selector satisfies `state` option.
     *
     * @param selector A selector to query for.
     * @param options
     */
    waitForSelector(
        selector: string,
        options?: {
            /**
             * Defaults to `'visible'`. Can be either:
             * - `'attached'` - wait for element to be present in DOM.
             * - `'detached'` - wait for element to not be present in DOM.
             * - `'visible'` - wait for element to have non-empty bounding box and no
             * `visibility:hidden`.
             * - `'hidden'` - wait for element to be either detached from DOM, or have
             * an empty bounding box or `visibility:hidden`.
             */
            state?: "attached" | "detached" | "visible" | "hidden";

            /**
             * When `true`, the call requires selector to resolve to a single element.
             * If given selector resolves to more than one element, the call throws
             * an exception. Defaults to `false`.
             */
            strict?: boolean;

            /**
             * Maximum time in milliseconds. Defaults to `30` seconds. Default is
             * overridden by the `setDefaultTimeout` option on `BrowserContext` or
             * `page` methods.
             *
             * Setting the value to `0` will disable the timeout.
             */
            timeout?: number;
        },
    ): Promise<ElementHandle>;

    /**
     * **NOTE** Never wait for timeout in production, use this only for debugging.
     * Tests that wait for time are inherently flaky. Use `Locator` actions and
     * web assertions that wait automatically.
     *
     * Waits for the given `timeout` in milliseconds.
     *
     * @param timeout A timeout to wait for
     */
    waitForTimeout(timeout: number): Promise<void>;

    /**
     * This method returns all of the dedicated WebWorkers associated with the page.
     */
    workers(): Worker[];

    /**
     * **NOTE** Use locator-based page.locator(selector[, options]) instead.
     *
     * The method finds an element matching the specified selector within the page.
     * If no elements match the selector, the return value resolves to `null`.
     * To wait for an element on the page, use locator.waitFor([options]).
     * @param selector A selector to query for.
     */
    $(selector: string): Promise<ElementHandle | null>;

    /**
     * **NOTE** Use locator-based page.locator(selector[, options]) instead.
     *
     * The method finds all elements matching the specified selector within the
     * page. If no elements match the selector, the return value resolves to `[]`.
     * @param selector A selector to query for.
     */
    $$(selector: string): Promise<ElementHandle[]>;
}

/**
 * Request represents requests which are sent by a page.
 */
export interface Request {
    /**
     * An object with HTTP headers associated with the request. All header names are
     * lower-case.
     * @returns The headers object.
     */
    allHeaders(): Promise<Record<string, string>>;

    /**
     * @returns the Frame that initiated this request
     */
    frame(): Frame;

    /**
     * An object with HTTP headers associated with the request. All header names are
     * lower-case.
     * @returns An object with HTTP headers associated with the request.
     */
    headers(): Record<string, string>;

    /**
     * An array with all the request HTTP headers. Unlike `Request.allHeaders()`,
     * header names are not lower-cased. Headers with multiple entries, such as
     * `Set-Cookie`, appear in the array multiple times.
     * @returns An array of all the request HTTP headers.
     */
    headersArray(): Promise<Array<{ name: string; value: string }>>;

    /**
     * Retuns the value of the header matching the name. The name is case insensitive.
     * @param name Header name to retrieve value for.
     * @returns The value of the header matching the name.
     */
    headerValue(name: string): Promise<string | null>;

    /**
     * @returns a boolean stating whether the request is for a navigation
     */
    isNavigationRequest(): boolean;

    /**
     * Request's method (GET, POST, etc.)
     * @returns request's method name
     */
    method(): string;

    /**
     * Contains the request's post body, if any.
     * @returns request's post body
     */
    postData(): string | null;

    /**
     * Request's post body in a binary form, if any.
     * @returns an ArrayBuffer with request's post data
     */
    postDataBuffer(): ArrayBuffer | null;

    /**
     * Contains the request's resource type as it was perceived by the rendering engine.
     * ResourceType will be one of the following: `document`, `stylesheet`, `image`,
     * `media`, `font`, `script`, `texttrack`, `xhr`, `fetch`, `eventsource`,
     * `websocket`, `manifest`, `other`.
     * @returns resource type name
     */
    resourceType(): ResourceType;

    /**
     * Returns the matching `Response` object, or `null` if the response was not received
     * due to error.
     * @returns The `Response` object, or `null` if the response was not received due to error.
     */
    response(): Promise<Response | null>;

    /**
     * Returns resource size information for given request.
     * @returns Resource size information for given request.
     */
    size(): Promise<{ body: number; headers: number }>;

    /**
     * Returns resource timing information for given request. Most of the timing values
     * become available upon the response, `responseEnd` becomes available when request
     * finishes.
     * @returns Resource timing information for given request.
     */
    timing(): ResourceTiming;

    /**
     * URL of the request.
     * @returns request URL
     */
    url(): string;
}

/**
 * Response represents responses which are received by page.
 */
export interface Response {
    /**
     * An object with HTTP headers associated with the response. All header names are
     * lower-case.
     * @returns The headers object.
     */
    allHeaders(): Promise<Record<string, string>>;

    /**
     * Returns the response body.
     * @returns A buffer with response body.
     */
    body(): Promise<ArrayBuffer>;

    /**
     * @returns the Frame that initiated this response
     */
    frame(): Frame;

    /**
     * An object with HTTP headers associated with the response. All header names are
     * lower-case.
     * @returns The headers object.
     */
    headers(): Record<string, string>;

    /**
     * An array with all the request HTTP response headers. Unlike `Response.headers()`, header
     * names are not lower-cased. Headers with multiple entries, such as `Set-Cookie`,
     * appear in the array multiple times.
     * @returns An array of all the request HTTP headers.
     */
    headersArray(): Promise<Array<{ name: string; value: string }>>;

    /**
     * Returns the value of the header matching the name. The name is case insensitive.
     * If multiple headers have the same name (except `Set-Cookie`), they are returned
     * as a list separated by ``,``. For `Set-Cookie`, the `\n` separator is used. If
     * no headers are found, `null` is returned.
     * @param name Header name to retrieve value for.
     * @returns The header value for the given name.
     */
    headerValue(name: string): Promise<string | null>;

    /**
     * Returns all values of the headers matching the name, for example `set-cookie`.
     * The name is case insensitive.
     * @param name Header name to retrieve values for.
     * @returns An array of header values for the given name.
     */
    headerValues(name: string): Promise<string[]>;

    /**
     * Returns the JSON representation of response body. Throws if response body is not
     * parsable via `JSON.parse`.
     * @returns JSON representation of response body.
     */
    json(): Promise<any>;

    /**
     * Contains a boolean stating whether the response was successful (status in the
     * range 200-299) or not.
     * @returns a boolean stating whether the response was successful
     */
    ok(): boolean;

    /**
     * The request that was used to produce the response.
     * @returns the matching `Request` object
     */
    request(): Request;

    /**
     * Security details associated with this response.
     * @returns A matching `SecurityDetailsObject`
     */
    securityDetails(): Promise<SecurityDetailsObject | null>;

    /**
     * Returns the IP address and port of the server for this response.
     * @returns The IP address and port of the server
     */
    serverAddr(): Promise<{ ipAddress: string; port: number } | null>;

    /**
     * Contains the status code of the response (e.g., 200 for a success).
     * @returns the status code of the response
     */
    status(): number;

    /**
     * Contains the status text of the response (e.g. usually an "OK" for a success).
     * @returns the status text of the response
     */
    statusText(): string;

    /**
     * The size of the response body and the headers.
     * @returns The size of the response body and the headers.
     */
    size(): Promise<{ body: number; headers: number }>;

    /**
     * Contains the URL of the response.
     * @returns the URL of the response
     */
    url(): string;
}

/**
 * Touchscreen provides an api for interacting with a virtual touchscreen. It
 * operates in main-frame CSS pixels relative to the top-left corner of the
 * viewport.
 */
export interface Touchscreen {
    /**
     * Taps on the specified position (`x`,`y`), which internally dispatches a `touchstart` and `touchend` event.
     * @param x The x position.
     * @param y The y position.
     */
    tap(x: number, y: number): Promise<void>;
}

/**
 * The Worker represents a [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).
 */
export interface Worker {
    /**
     * Get the URL of the web worker.
     * @return The URL of the web worker.
     */
    url(): string;
}
