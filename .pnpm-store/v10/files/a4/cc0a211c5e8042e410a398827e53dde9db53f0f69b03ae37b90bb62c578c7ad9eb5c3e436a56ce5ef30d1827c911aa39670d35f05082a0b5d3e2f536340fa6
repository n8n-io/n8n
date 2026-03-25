import { WebhookPayload } from './interfaces';
export declare class Context {
    /**
     * Webhook payload object that triggered the workflow
     */
    payload: WebhookPayload;
    eventName: string;
    sha: string;
    ref: string;
    workflow: string;
    action: string;
    actor: string;
    job: string;
    runAttempt: number;
    runNumber: number;
    runId: number;
    apiUrl: string;
    serverUrl: string;
    graphqlUrl: string;
    /**
     * Hydrate the context from the environment
     */
    constructor();
    get issue(): {
        owner: string;
        repo: string;
        number: number;
    };
    get repo(): {
        owner: string;
        repo: string;
    };
}
