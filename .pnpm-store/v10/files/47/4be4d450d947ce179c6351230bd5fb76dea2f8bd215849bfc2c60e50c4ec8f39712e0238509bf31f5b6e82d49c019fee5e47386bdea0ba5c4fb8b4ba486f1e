type Method = 'get' | 'head' | 'post' | 'put' | 'patch' | 'delete';
interface HTTPRequestParams {
    [key: string]: any;
}
interface HTTPGatewayConfiguration {
    configure?: ((requestParams: HTTPRequestParams) => HTTPRequestParams) | null;
    onRequestWillStart?: ((requestParams: HTTPRequestParams) => void) | null;
    onRequestSocketAssigned?: ((requestParams: HTTPRequestParams) => void) | null;
    onSocketLookup?: ((requestParams: HTTPRequestParams) => void) | null;
    onSocketConnect?: ((requestParams: HTTPRequestParams) => void) | null;
    onSocketSecureConnect?: ((requestParams: HTTPRequestParams) => void) | null;
    onResponseReadable?: ((requestParams: HTTPRequestParams) => void) | null;
    onResponseEnd?: ((requestParams: HTTPRequestParams) => void) | null;
    useSocketConnectionTimeout?: boolean;
}
interface XHRGatewayConfiguration {
    withCredentials?: boolean;
    configure?: ((xmlHttpRequest: XMLHttpRequest) => void) | null;
}
type FetchGatewayConfiguration = Partial<RequestInit>;
interface GatewayConfiguration {
    Fetch: FetchGatewayConfiguration;
    HTTP: HTTPGatewayConfiguration;
    Mock?: Record<string, unknown>;
    XHR: XHRGatewayConfiguration;
    enableHTTP408OnTimeouts: boolean;
    emulateHTTP: boolean;
}

export type { GatewayConfiguration, HTTPGatewayConfiguration, HTTPRequestParams, Method };
