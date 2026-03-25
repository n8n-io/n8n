export interface RequestMetadata {
    'x-goog-iam-authority-selector': string;
    'x-goog-iam-authorization-token': string;
}
export declare class IAMAuth {
    selector: string;
    token: string;
    /**
     * IAM credentials.
     *
     * @param selector the iam authority selector
     * @param token the token
     * @constructor
     */
    constructor(selector: string, token: string);
    /**
     * Acquire the HTTP headers required to make an authenticated request.
     */
    getRequestHeaders(): {
        'x-goog-iam-authority-selector': string;
        'x-goog-iam-authorization-token': string;
    };
}
