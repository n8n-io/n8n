import type { RedoclyConfig } from './config-types';
export type ApiFunctionsRequest = {
    raw: Request;
    headers: Record<string, any>;
    params: Record<string, any>;
    query: Record<string, any>;
    cookies: Record<string, any>;
    body: ReadableStream<Uint8Array> | null;
};
export type ApiFunctionsResponse = {
    raw: Response;
    status: (code: number) => ApiFunctionsResponse;
    json: (data: object) => Response;
    text: (data: string, code?: number) => Response;
    send: (data: string | Buffer | object) => Response;
    redirect: (url: string, code?: number) => Response;
    cookie: (name: string, value: string, options?: CookieOptions) => ApiFunctionsResponse;
    clearCookie: (name: string) => ApiFunctionsResponse;
};
export type ApiFunctionsContext = {
    user: {
        teams: string[];
        claims: Record<string, any>;
        email: string | undefined;
        idpAccessToken: string | undefined;
        idpId: string | undefined;
    };
    config: RedoclyConfig;
};
export interface CookieOptions {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    secure?: boolean;
    signed?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
export type ServerPropsContext = ApiFunctionsContext;
export type ServerPropsRequest = ApiFunctionsRequest;
