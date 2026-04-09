/** Result of parsing a libsql URL using {@link parseLibsqlUrl}. */
export interface ParsedLibsqlUrl {
    /** A WebSocket URL that can be used with {@link openWs} to open a {@link WsClient}. It is `undefined`
     * if the parsed URL specified HTTP explicitly. */
    hranaWsUrl: string | undefined;
    /** A HTTP URL that can be used with {@link openHttp} to open a {@link HttpClient}. It is `undefined`
     * if the parsed URL specified WebSockets explicitly. */
    hranaHttpUrl: string | undefined;
    /** The optional `authToken` query parameter that should be passed as `jwt` to
     * {@link openWs}/{@link openHttp}. */
    authToken: string | undefined;
}
/** Parses a URL compatible with the libsql client (`@libsql/client`). This URL may have the "libsql:" scheme
 * and may contain query parameters. */
export declare function parseLibsqlUrl(urlStr: string): ParsedLibsqlUrl;
