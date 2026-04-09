import { LibsqlUrlParseError } from "./errors.js";
;
/** Parses a URL compatible with the libsql client (`@libsql/client`). This URL may have the "libsql:" scheme
 * and may contain query parameters. */
export function parseLibsqlUrl(urlStr) {
    const url = new URL(urlStr);
    let authToken = undefined;
    let tls = undefined;
    for (const [key, value] of url.searchParams.entries()) {
        if (key === "authToken") {
            authToken = value;
        }
        else if (key === "tls") {
            if (value === "0") {
                tls = false;
            }
            else if (value === "1") {
                tls = true;
            }
            else {
                throw new LibsqlUrlParseError(`Unknown value for the "tls" query argument: ${JSON.stringify(value)}`);
            }
        }
        else {
            throw new LibsqlUrlParseError(`Unknown URL query argument ${JSON.stringify(key)}`);
        }
    }
    let hranaWsScheme;
    let hranaHttpScheme;
    if ((url.protocol === "http:" || url.protocol === "ws:") && (tls === true)) {
        throw new LibsqlUrlParseError(`A ${JSON.stringify(url.protocol)} URL cannot opt into TLS using ?tls=1`);
    }
    else if ((url.protocol === "https:" || url.protocol === "wss:") && (tls === false)) {
        throw new LibsqlUrlParseError(`A ${JSON.stringify(url.protocol)} URL cannot opt out of TLS using ?tls=0`);
    }
    if (url.protocol === "http:" || url.protocol === "https:") {
        hranaHttpScheme = url.protocol;
    }
    else if (url.protocol === "ws:" || url.protocol === "wss:") {
        hranaWsScheme = url.protocol;
    }
    else if (url.protocol === "libsql:") {
        if (tls === false) {
            if (!url.port) {
                throw new LibsqlUrlParseError(`A "libsql:" URL with ?tls=0 must specify an explicit port`);
            }
            hranaHttpScheme = "http:";
            hranaWsScheme = "ws:";
        }
        else {
            hranaHttpScheme = "https:";
            hranaWsScheme = "wss:";
        }
    }
    else {
        throw new LibsqlUrlParseError(`This client does not support ${JSON.stringify(url.protocol)} URLs. ` +
            'Please use a "libsql:", "ws:", "wss:", "http:" or "https:" URL instead.');
    }
    if (url.username || url.password) {
        throw new LibsqlUrlParseError("This client does not support HTTP Basic authentication with a username and password. " +
            'You can authenticate using a token passed in the "authToken" URL query parameter.');
    }
    if (url.hash) {
        throw new LibsqlUrlParseError("URL fragments are not supported");
    }
    let hranaPath = url.pathname;
    if (hranaPath === "/") {
        hranaPath = "";
    }
    const hranaWsUrl = hranaWsScheme !== undefined
        ? `${hranaWsScheme}//${url.host}${hranaPath}` : undefined;
    const hranaHttpUrl = hranaHttpScheme !== undefined
        ? `${hranaHttpScheme}//${url.host}${hranaPath}` : undefined;
    return { hranaWsUrl, hranaHttpUrl, authToken };
}
