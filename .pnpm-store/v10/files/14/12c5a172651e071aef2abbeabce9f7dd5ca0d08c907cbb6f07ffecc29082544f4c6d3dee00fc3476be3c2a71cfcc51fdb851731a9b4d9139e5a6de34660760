import { BrowserClientReplayOptions, ClientOptions, Event, SeverityLevel } from '@sentry/core';
import { Client } from '@sentry/core';
export interface TestClientOptions extends ClientOptions, BrowserClientReplayOptions {
}
/**
 *
 */
export declare class TestClient extends Client<TestClientOptions> {
    constructor(options: TestClientOptions);
    /**
     *
     */
    eventFromException(exception: any): PromiseLike<Event>;
    /**
     *
     */
    eventFromMessage(message: string, level?: SeverityLevel): PromiseLike<Event>;
}
/**
 *
 */
export declare function init(options: TestClientOptions): void;
/**
 *
 */
export declare function getDefaultClientOptions(options?: Partial<ClientOptions>): ClientOptions;
//# sourceMappingURL=TestClient.d.ts.map
