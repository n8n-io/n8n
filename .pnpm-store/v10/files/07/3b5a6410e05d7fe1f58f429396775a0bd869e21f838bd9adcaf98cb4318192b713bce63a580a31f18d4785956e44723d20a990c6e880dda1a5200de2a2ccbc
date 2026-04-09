/// <reference types="node" />

interface Request {
    headers?: {
        authorization?: string | undefined;
    };
}

// See https://github.com/jshttp/basic-auth/blob/v1.1.0/index.js#L49
declare function auth(req: Request): auth.BasicAuthResult | undefined;

declare namespace auth {
    interface BasicAuthResult {
        name: string;
        pass: string;
    }

    /**
     * Parse basic auth to object.
     */
    function parse(authorizationHeader: string): BasicAuthResult | undefined;
}

export = auth;
