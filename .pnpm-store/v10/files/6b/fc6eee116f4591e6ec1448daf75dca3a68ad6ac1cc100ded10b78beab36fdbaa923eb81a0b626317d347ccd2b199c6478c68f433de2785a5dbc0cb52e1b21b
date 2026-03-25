import { Word } from "../shell/Word.js";
import { type Warnings } from "../Warnings.js";
import type { DataType } from "../Request.js";
export type FormType = "string" | "form";
export interface LongShort {
    type: "string" | "bool";
    name: string;
    removed?: string;
    expand?: boolean;
}
export interface LongOpts {
    [key: string]: LongShort | null;
}
export interface ShortOpts {
    [key: string]: string;
}
export declare const curlLongOpts: {
    readonly url: {
        readonly type: "string";
        readonly name: "url";
    };
    readonly "dns-ipv4-addr": {
        readonly type: "string";
        readonly name: "dns-ipv4-addr";
    };
    readonly "dns-ipv6-addr": {
        readonly type: "string";
        readonly name: "dns-ipv6-addr";
    };
    readonly "random-file": {
        readonly type: "string";
        readonly name: "random-file";
    };
    readonly "egd-file": {
        readonly type: "string";
        readonly name: "egd-file";
    };
    readonly "oauth2-bearer": {
        readonly type: "string";
        readonly name: "oauth2-bearer";
    };
    readonly "connect-timeout": {
        readonly type: "string";
        readonly name: "connect-timeout";
    };
    readonly "doh-url": {
        readonly type: "string";
        readonly name: "doh-url";
    };
    readonly ciphers: {
        readonly type: "string";
        readonly name: "ciphers";
    };
    readonly "dns-interface": {
        readonly type: "string";
        readonly name: "dns-interface";
    };
    readonly "disable-epsv": {
        readonly type: "bool";
        readonly name: "disable-epsv";
    };
    readonly "no-disable-epsv": {
        readonly type: "bool";
        readonly name: "disable-epsv";
        readonly expand: false;
    };
    readonly "disallow-username-in-url": {
        readonly type: "bool";
        readonly name: "disallow-username-in-url";
    };
    readonly "no-disallow-username-in-url": {
        readonly type: "bool";
        readonly name: "disallow-username-in-url";
        readonly expand: false;
    };
    readonly epsv: {
        readonly type: "bool";
        readonly name: "epsv";
    };
    readonly "no-epsv": {
        readonly type: "bool";
        readonly name: "epsv";
        readonly expand: false;
    };
    readonly "dns-servers": {
        readonly type: "string";
        readonly name: "dns-servers";
    };
    readonly trace: {
        readonly type: "string";
        readonly name: "trace";
    };
    readonly npn: {
        readonly type: "bool";
        readonly name: "npn";
    };
    readonly "no-npn": {
        readonly type: "bool";
        readonly name: "npn";
        readonly expand: false;
    };
    readonly "trace-ascii": {
        readonly type: "string";
        readonly name: "trace-ascii";
    };
    readonly alpn: {
        readonly type: "bool";
        readonly name: "alpn";
    };
    readonly "no-alpn": {
        readonly type: "bool";
        readonly name: "alpn";
        readonly expand: false;
    };
    readonly "limit-rate": {
        readonly type: "string";
        readonly name: "limit-rate";
    };
    readonly rate: {
        readonly type: "string";
        readonly name: "rate";
    };
    readonly compressed: {
        readonly type: "bool";
        readonly name: "compressed";
    };
    readonly "no-compressed": {
        readonly type: "bool";
        readonly name: "compressed";
        readonly expand: false;
    };
    readonly "tr-encoding": {
        readonly type: "bool";
        readonly name: "tr-encoding";
    };
    readonly "no-tr-encoding": {
        readonly type: "bool";
        readonly name: "tr-encoding";
        readonly expand: false;
    };
    readonly digest: {
        readonly type: "bool";
        readonly name: "digest";
    };
    readonly "no-digest": {
        readonly type: "bool";
        readonly name: "digest";
        readonly expand: false;
    };
    readonly negotiate: {
        readonly type: "bool";
        readonly name: "negotiate";
    };
    readonly "no-negotiate": {
        readonly type: "bool";
        readonly name: "negotiate";
        readonly expand: false;
    };
    readonly ntlm: {
        readonly type: "bool";
        readonly name: "ntlm";
    };
    readonly "no-ntlm": {
        readonly type: "bool";
        readonly name: "ntlm";
        readonly expand: false;
    };
    readonly "ntlm-wb": {
        readonly type: "bool";
        readonly name: "ntlm-wb";
    };
    readonly "no-ntlm-wb": {
        readonly type: "bool";
        readonly name: "ntlm-wb";
        readonly expand: false;
    };
    readonly basic: {
        readonly type: "bool";
        readonly name: "basic";
    };
    readonly "no-basic": {
        readonly type: "bool";
        readonly name: "basic";
        readonly expand: false;
    };
    readonly anyauth: {
        readonly type: "bool";
        readonly name: "anyauth";
    };
    readonly "no-anyauth": {
        readonly type: "bool";
        readonly name: "anyauth";
        readonly expand: false;
    };
    readonly wdebug: {
        readonly type: "bool";
        readonly name: "wdebug";
    };
    readonly "no-wdebug": {
        readonly type: "bool";
        readonly name: "wdebug";
        readonly expand: false;
    };
    readonly "ftp-create-dirs": {
        readonly type: "bool";
        readonly name: "ftp-create-dirs";
    };
    readonly "no-ftp-create-dirs": {
        readonly type: "bool";
        readonly name: "ftp-create-dirs";
        readonly expand: false;
    };
    readonly "create-dirs": {
        readonly type: "bool";
        readonly name: "create-dirs";
    };
    readonly "no-create-dirs": {
        readonly type: "bool";
        readonly name: "create-dirs";
        readonly expand: false;
    };
    readonly "create-file-mode": {
        readonly type: "string";
        readonly name: "create-file-mode";
    };
    readonly "max-redirs": {
        readonly type: "string";
        readonly name: "max-redirs";
    };
    readonly "proxy-ntlm": {
        readonly type: "bool";
        readonly name: "proxy-ntlm";
    };
    readonly "no-proxy-ntlm": {
        readonly type: "bool";
        readonly name: "proxy-ntlm";
        readonly expand: false;
    };
    readonly crlf: {
        readonly type: "bool";
        readonly name: "crlf";
    };
    readonly "no-crlf": {
        readonly type: "bool";
        readonly name: "crlf";
        readonly expand: false;
    };
    readonly stderr: {
        readonly type: "string";
        readonly name: "stderr";
    };
    readonly "aws-sigv4": {
        readonly type: "string";
        readonly name: "aws-sigv4";
    };
    readonly interface: {
        readonly type: "string";
        readonly name: "interface";
    };
    readonly krb: {
        readonly type: "string";
        readonly name: "krb";
    };
    readonly krb4: {
        readonly type: "string";
        readonly name: "krb";
    };
    readonly "haproxy-protocol": {
        readonly type: "bool";
        readonly name: "haproxy-protocol";
    };
    readonly "no-haproxy-protocol": {
        readonly type: "bool";
        readonly name: "haproxy-protocol";
        readonly expand: false;
    };
    readonly "haproxy-clientip": {
        readonly type: "string";
        readonly name: "haproxy-clientip";
    };
    readonly "max-filesize": {
        readonly type: "string";
        readonly name: "max-filesize";
    };
    readonly "disable-eprt": {
        readonly type: "bool";
        readonly name: "disable-eprt";
    };
    readonly "no-disable-eprt": {
        readonly type: "bool";
        readonly name: "disable-eprt";
        readonly expand: false;
    };
    readonly eprt: {
        readonly type: "bool";
        readonly name: "eprt";
    };
    readonly "no-eprt": {
        readonly type: "bool";
        readonly name: "eprt";
        readonly expand: false;
    };
    readonly xattr: {
        readonly type: "bool";
        readonly name: "xattr";
    };
    readonly "no-xattr": {
        readonly type: "bool";
        readonly name: "xattr";
        readonly expand: false;
    };
    readonly "ftp-ssl": {
        readonly type: "bool";
        readonly name: "ssl";
    };
    readonly "no-ftp-ssl": {
        readonly type: "bool";
        readonly name: "ssl";
        readonly expand: false;
    };
    readonly ssl: {
        readonly type: "bool";
        readonly name: "ssl";
    };
    readonly "no-ssl": {
        readonly type: "bool";
        readonly name: "ssl";
        readonly expand: false;
    };
    readonly "ftp-pasv": {
        readonly type: "bool";
        readonly name: "ftp-pasv";
    };
    readonly "no-ftp-pasv": {
        readonly type: "bool";
        readonly name: "ftp-pasv";
        readonly expand: false;
    };
    readonly socks5: {
        readonly type: "string";
        readonly name: "socks5";
    };
    readonly "tcp-nodelay": {
        readonly type: "bool";
        readonly name: "tcp-nodelay";
    };
    readonly "no-tcp-nodelay": {
        readonly type: "bool";
        readonly name: "tcp-nodelay";
        readonly expand: false;
    };
    readonly "proxy-digest": {
        readonly type: "bool";
        readonly name: "proxy-digest";
    };
    readonly "no-proxy-digest": {
        readonly type: "bool";
        readonly name: "proxy-digest";
        readonly expand: false;
    };
    readonly "proxy-basic": {
        readonly type: "bool";
        readonly name: "proxy-basic";
    };
    readonly "no-proxy-basic": {
        readonly type: "bool";
        readonly name: "proxy-basic";
        readonly expand: false;
    };
    readonly retry: {
        readonly type: "string";
        readonly name: "retry";
    };
    readonly "retry-connrefused": {
        readonly type: "bool";
        readonly name: "retry-connrefused";
    };
    readonly "no-retry-connrefused": {
        readonly type: "bool";
        readonly name: "retry-connrefused";
        readonly expand: false;
    };
    readonly "retry-delay": {
        readonly type: "string";
        readonly name: "retry-delay";
    };
    readonly "retry-max-time": {
        readonly type: "string";
        readonly name: "retry-max-time";
    };
    readonly "proxy-negotiate": {
        readonly type: "bool";
        readonly name: "proxy-negotiate";
    };
    readonly "no-proxy-negotiate": {
        readonly type: "bool";
        readonly name: "proxy-negotiate";
        readonly expand: false;
    };
    readonly "form-escape": {
        readonly type: "bool";
        readonly name: "form-escape";
    };
    readonly "no-form-escape": {
        readonly type: "bool";
        readonly name: "form-escape";
        readonly expand: false;
    };
    readonly "ftp-account": {
        readonly type: "string";
        readonly name: "ftp-account";
    };
    readonly "proxy-anyauth": {
        readonly type: "bool";
        readonly name: "proxy-anyauth";
    };
    readonly "no-proxy-anyauth": {
        readonly type: "bool";
        readonly name: "proxy-anyauth";
        readonly expand: false;
    };
    readonly "trace-time": {
        readonly type: "bool";
        readonly name: "trace-time";
    };
    readonly "no-trace-time": {
        readonly type: "bool";
        readonly name: "trace-time";
        readonly expand: false;
    };
    readonly "ignore-content-length": {
        readonly type: "bool";
        readonly name: "ignore-content-length";
    };
    readonly "no-ignore-content-length": {
        readonly type: "bool";
        readonly name: "ignore-content-length";
        readonly expand: false;
    };
    readonly "ftp-skip-pasv-ip": {
        readonly type: "bool";
        readonly name: "ftp-skip-pasv-ip";
    };
    readonly "no-ftp-skip-pasv-ip": {
        readonly type: "bool";
        readonly name: "ftp-skip-pasv-ip";
        readonly expand: false;
    };
    readonly "ftp-method": {
        readonly type: "string";
        readonly name: "ftp-method";
    };
    readonly "local-port": {
        readonly type: "string";
        readonly name: "local-port";
    };
    readonly socks4: {
        readonly type: "string";
        readonly name: "socks4";
    };
    readonly socks4a: {
        readonly type: "string";
        readonly name: "socks4a";
    };
    readonly "ftp-alternative-to-user": {
        readonly type: "string";
        readonly name: "ftp-alternative-to-user";
    };
    readonly "ftp-ssl-reqd": {
        readonly type: "bool";
        readonly name: "ssl-reqd";
    };
    readonly "no-ftp-ssl-reqd": {
        readonly type: "bool";
        readonly name: "ssl-reqd";
        readonly expand: false;
    };
    readonly "ssl-reqd": {
        readonly type: "bool";
        readonly name: "ssl-reqd";
    };
    readonly "no-ssl-reqd": {
        readonly type: "bool";
        readonly name: "ssl-reqd";
        readonly expand: false;
    };
    readonly sessionid: {
        readonly type: "bool";
        readonly name: "sessionid";
    };
    readonly "no-sessionid": {
        readonly type: "bool";
        readonly name: "sessionid";
        readonly expand: false;
    };
    readonly "ftp-ssl-control": {
        readonly type: "bool";
        readonly name: "ftp-ssl-control";
    };
    readonly "no-ftp-ssl-control": {
        readonly type: "bool";
        readonly name: "ftp-ssl-control";
        readonly expand: false;
    };
    readonly "ftp-ssl-ccc": {
        readonly type: "bool";
        readonly name: "ftp-ssl-ccc";
    };
    readonly "no-ftp-ssl-ccc": {
        readonly type: "bool";
        readonly name: "ftp-ssl-ccc";
        readonly expand: false;
    };
    readonly "ftp-ssl-ccc-mode": {
        readonly type: "string";
        readonly name: "ftp-ssl-ccc-mode";
    };
    readonly libcurl: {
        readonly type: "string";
        readonly name: "libcurl";
    };
    readonly raw: {
        readonly type: "bool";
        readonly name: "raw";
    };
    readonly "no-raw": {
        readonly type: "bool";
        readonly name: "raw";
        readonly expand: false;
    };
    readonly post301: {
        readonly type: "bool";
        readonly name: "post301";
    };
    readonly "no-post301": {
        readonly type: "bool";
        readonly name: "post301";
        readonly expand: false;
    };
    readonly keepalive: {
        readonly type: "bool";
        readonly name: "keepalive";
    };
    readonly "no-keepalive": {
        readonly type: "bool";
        readonly name: "keepalive";
        readonly expand: false;
    };
    readonly "socks5-hostname": {
        readonly type: "string";
        readonly name: "socks5-hostname";
    };
    readonly "keepalive-time": {
        readonly type: "string";
        readonly name: "keepalive-time";
    };
    readonly post302: {
        readonly type: "bool";
        readonly name: "post302";
    };
    readonly "no-post302": {
        readonly type: "bool";
        readonly name: "post302";
        readonly expand: false;
    };
    readonly noproxy: {
        readonly type: "string";
        readonly name: "noproxy";
    };
    readonly "socks5-gssapi-nec": {
        readonly type: "bool";
        readonly name: "socks5-gssapi-nec";
    };
    readonly "no-socks5-gssapi-nec": {
        readonly type: "bool";
        readonly name: "socks5-gssapi-nec";
        readonly expand: false;
    };
    readonly "proxy1.0": {
        readonly type: "string";
        readonly name: "proxy1.0";
    };
    readonly "tftp-blksize": {
        readonly type: "string";
        readonly name: "tftp-blksize";
    };
    readonly "mail-from": {
        readonly type: "string";
        readonly name: "mail-from";
    };
    readonly "mail-rcpt": {
        readonly type: "string";
        readonly name: "mail-rcpt";
    };
    readonly "ftp-pret": {
        readonly type: "bool";
        readonly name: "ftp-pret";
    };
    readonly "no-ftp-pret": {
        readonly type: "bool";
        readonly name: "ftp-pret";
        readonly expand: false;
    };
    readonly proto: {
        readonly type: "string";
        readonly name: "proto";
    };
    readonly "proto-redir": {
        readonly type: "string";
        readonly name: "proto-redir";
    };
    readonly resolve: {
        readonly type: "string";
        readonly name: "resolve";
    };
    readonly delegation: {
        readonly type: "string";
        readonly name: "delegation";
    };
    readonly "mail-auth": {
        readonly type: "string";
        readonly name: "mail-auth";
    };
    readonly post303: {
        readonly type: "bool";
        readonly name: "post303";
    };
    readonly "no-post303": {
        readonly type: "bool";
        readonly name: "post303";
        readonly expand: false;
    };
    readonly metalink: {
        readonly type: "bool";
        readonly name: "metalink";
    };
    readonly "no-metalink": {
        readonly type: "bool";
        readonly name: "metalink";
        readonly expand: false;
    };
    readonly "sasl-authzid": {
        readonly type: "string";
        readonly name: "sasl-authzid";
    };
    readonly "sasl-ir": {
        readonly type: "bool";
        readonly name: "sasl-ir";
    };
    readonly "no-sasl-ir": {
        readonly type: "bool";
        readonly name: "sasl-ir";
        readonly expand: false;
    };
    readonly "test-event": {
        readonly type: "bool";
        readonly name: "test-event";
    };
    readonly "no-test-event": {
        readonly type: "bool";
        readonly name: "test-event";
        readonly expand: false;
    };
    readonly "unix-socket": {
        readonly type: "string";
        readonly name: "unix-socket";
    };
    readonly "path-as-is": {
        readonly type: "bool";
        readonly name: "path-as-is";
    };
    readonly "no-path-as-is": {
        readonly type: "bool";
        readonly name: "path-as-is";
        readonly expand: false;
    };
    readonly "socks5-gssapi-service": {
        readonly type: "string";
        readonly name: "proxy-service-name";
    };
    readonly "proxy-service-name": {
        readonly type: "string";
        readonly name: "proxy-service-name";
    };
    readonly "service-name": {
        readonly type: "string";
        readonly name: "service-name";
    };
    readonly "proto-default": {
        readonly type: "string";
        readonly name: "proto-default";
    };
    readonly "expect100-timeout": {
        readonly type: "string";
        readonly name: "expect100-timeout";
    };
    readonly "tftp-no-options": {
        readonly type: "bool";
        readonly name: "tftp-no-options";
    };
    readonly "no-tftp-no-options": {
        readonly type: "bool";
        readonly name: "tftp-no-options";
        readonly expand: false;
    };
    readonly "connect-to": {
        readonly type: "string";
        readonly name: "connect-to";
    };
    readonly "abstract-unix-socket": {
        readonly type: "string";
        readonly name: "abstract-unix-socket";
    };
    readonly "tls-max": {
        readonly type: "string";
        readonly name: "tls-max";
    };
    readonly "suppress-connect-headers": {
        readonly type: "bool";
        readonly name: "suppress-connect-headers";
    };
    readonly "no-suppress-connect-headers": {
        readonly type: "bool";
        readonly name: "suppress-connect-headers";
        readonly expand: false;
    };
    readonly "compressed-ssh": {
        readonly type: "bool";
        readonly name: "compressed-ssh";
    };
    readonly "no-compressed-ssh": {
        readonly type: "bool";
        readonly name: "compressed-ssh";
        readonly expand: false;
    };
    readonly "happy-eyeballs-timeout-ms": {
        readonly type: "string";
        readonly name: "happy-eyeballs-timeout-ms";
    };
    readonly "retry-all-errors": {
        readonly type: "bool";
        readonly name: "retry-all-errors";
    };
    readonly "no-retry-all-errors": {
        readonly type: "bool";
        readonly name: "retry-all-errors";
        readonly expand: false;
    };
    readonly "trace-ids": {
        readonly type: "bool";
        readonly name: "trace-ids";
    };
    readonly "no-trace-ids": {
        readonly type: "bool";
        readonly name: "trace-ids";
        readonly expand: false;
    };
    readonly "http1.0": {
        readonly type: "bool";
        readonly name: "http1.0";
    };
    readonly "http1.1": {
        readonly type: "bool";
        readonly name: "http1.1";
    };
    readonly http2: {
        readonly type: "bool";
        readonly name: "http2";
    };
    readonly "http2-prior-knowledge": {
        readonly type: "bool";
        readonly name: "http2-prior-knowledge";
    };
    readonly http3: {
        readonly type: "bool";
        readonly name: "http3";
    };
    readonly "http3-only": {
        readonly type: "bool";
        readonly name: "http3-only";
    };
    readonly "http0.9": {
        readonly type: "bool";
        readonly name: "http0.9";
    };
    readonly "no-http0.9": {
        readonly type: "bool";
        readonly name: "http0.9";
        readonly expand: false;
    };
    readonly "proxy-http2": {
        readonly type: "bool";
        readonly name: "proxy-http2";
    };
    readonly "no-proxy-http2": {
        readonly type: "bool";
        readonly name: "proxy-http2";
        readonly expand: false;
    };
    readonly tlsv1: {
        readonly type: "bool";
        readonly name: "tlsv1";
    };
    readonly "tlsv1.0": {
        readonly type: "bool";
        readonly name: "tlsv1.0";
    };
    readonly "tlsv1.1": {
        readonly type: "bool";
        readonly name: "tlsv1.1";
    };
    readonly "tlsv1.2": {
        readonly type: "bool";
        readonly name: "tlsv1.2";
    };
    readonly "tlsv1.3": {
        readonly type: "bool";
        readonly name: "tlsv1.3";
    };
    readonly "tls13-ciphers": {
        readonly type: "string";
        readonly name: "tls13-ciphers";
    };
    readonly "proxy-tls13-ciphers": {
        readonly type: "string";
        readonly name: "proxy-tls13-ciphers";
    };
    readonly sslv2: {
        readonly type: "bool";
        readonly name: "sslv2";
    };
    readonly sslv3: {
        readonly type: "bool";
        readonly name: "sslv3";
    };
    readonly ipv4: {
        readonly type: "bool";
        readonly name: "ipv4";
    };
    readonly ipv6: {
        readonly type: "bool";
        readonly name: "ipv6";
    };
    readonly append: {
        readonly type: "bool";
        readonly name: "append";
    };
    readonly "no-append": {
        readonly type: "bool";
        readonly name: "append";
        readonly expand: false;
    };
    readonly "user-agent": {
        readonly type: "string";
        readonly name: "user-agent";
    };
    readonly cookie: {
        readonly type: "string";
        readonly name: "cookie";
    };
    readonly "alt-svc": {
        readonly type: "string";
        readonly name: "alt-svc";
    };
    readonly hsts: {
        readonly type: "string";
        readonly name: "hsts";
    };
    readonly "use-ascii": {
        readonly type: "bool";
        readonly name: "use-ascii";
    };
    readonly "no-use-ascii": {
        readonly type: "bool";
        readonly name: "use-ascii";
        readonly expand: false;
    };
    readonly "cookie-jar": {
        readonly type: "string";
        readonly name: "cookie-jar";
    };
    readonly "continue-at": {
        readonly type: "string";
        readonly name: "continue-at";
    };
    readonly data: {
        readonly type: "string";
        readonly name: "data";
    };
    readonly "data-raw": {
        readonly type: "string";
        readonly name: "data-raw";
    };
    readonly "data-ascii": {
        readonly type: "string";
        readonly name: "data-ascii";
    };
    readonly "data-binary": {
        readonly type: "string";
        readonly name: "data-binary";
    };
    readonly "data-urlencode": {
        readonly type: "string";
        readonly name: "data-urlencode";
    };
    readonly json: {
        readonly type: "string";
        readonly name: "json";
    };
    readonly "url-query": {
        readonly type: "string";
        readonly name: "url-query";
    };
    readonly "dump-header": {
        readonly type: "string";
        readonly name: "dump-header";
    };
    readonly referer: {
        readonly type: "string";
        readonly name: "referer";
    };
    readonly cert: {
        readonly type: "string";
        readonly name: "cert";
    };
    readonly cacert: {
        readonly type: "string";
        readonly name: "cacert";
    };
    readonly "cert-type": {
        readonly type: "string";
        readonly name: "cert-type";
    };
    readonly key: {
        readonly type: "string";
        readonly name: "key";
    };
    readonly "key-type": {
        readonly type: "string";
        readonly name: "key-type";
    };
    readonly pass: {
        readonly type: "string";
        readonly name: "pass";
    };
    readonly engine: {
        readonly type: "string";
        readonly name: "engine";
    };
    readonly "ca-native": {
        readonly type: "bool";
        readonly name: "ca-native";
    };
    readonly "no-ca-native": {
        readonly type: "bool";
        readonly name: "ca-native";
        readonly expand: false;
    };
    readonly "proxy-ca-native": {
        readonly type: "bool";
        readonly name: "proxy-ca-native";
    };
    readonly "no-proxy-ca-native": {
        readonly type: "bool";
        readonly name: "proxy-ca-native";
        readonly expand: false;
    };
    readonly capath: {
        readonly type: "string";
        readonly name: "capath";
    };
    readonly pubkey: {
        readonly type: "string";
        readonly name: "pubkey";
    };
    readonly hostpubmd5: {
        readonly type: "string";
        readonly name: "hostpubmd5";
    };
    readonly hostpubsha256: {
        readonly type: "string";
        readonly name: "hostpubsha256";
    };
    readonly crlfile: {
        readonly type: "string";
        readonly name: "crlfile";
    };
    readonly tlsuser: {
        readonly type: "string";
        readonly name: "tlsuser";
    };
    readonly tlspassword: {
        readonly type: "string";
        readonly name: "tlspassword";
    };
    readonly tlsauthtype: {
        readonly type: "string";
        readonly name: "tlsauthtype";
    };
    readonly "ssl-allow-beast": {
        readonly type: "bool";
        readonly name: "ssl-allow-beast";
    };
    readonly "no-ssl-allow-beast": {
        readonly type: "bool";
        readonly name: "ssl-allow-beast";
        readonly expand: false;
    };
    readonly "ssl-auto-client-cert": {
        readonly type: "bool";
        readonly name: "ssl-auto-client-cert";
    };
    readonly "no-ssl-auto-client-cert": {
        readonly type: "bool";
        readonly name: "ssl-auto-client-cert";
        readonly expand: false;
    };
    readonly "proxy-ssl-auto-client-cert": {
        readonly type: "bool";
        readonly name: "proxy-ssl-auto-client-cert";
    };
    readonly "no-proxy-ssl-auto-client-cert": {
        readonly type: "bool";
        readonly name: "proxy-ssl-auto-client-cert";
        readonly expand: false;
    };
    readonly pinnedpubkey: {
        readonly type: "string";
        readonly name: "pinnedpubkey";
    };
    readonly "proxy-pinnedpubkey": {
        readonly type: "string";
        readonly name: "proxy-pinnedpubkey";
    };
    readonly "cert-status": {
        readonly type: "bool";
        readonly name: "cert-status";
    };
    readonly "no-cert-status": {
        readonly type: "bool";
        readonly name: "cert-status";
        readonly expand: false;
    };
    readonly "doh-cert-status": {
        readonly type: "bool";
        readonly name: "doh-cert-status";
    };
    readonly "no-doh-cert-status": {
        readonly type: "bool";
        readonly name: "doh-cert-status";
        readonly expand: false;
    };
    readonly "false-start": {
        readonly type: "bool";
        readonly name: "false-start";
    };
    readonly "no-false-start": {
        readonly type: "bool";
        readonly name: "false-start";
        readonly expand: false;
    };
    readonly "ssl-no-revoke": {
        readonly type: "bool";
        readonly name: "ssl-no-revoke";
    };
    readonly "no-ssl-no-revoke": {
        readonly type: "bool";
        readonly name: "ssl-no-revoke";
        readonly expand: false;
    };
    readonly "ssl-revoke-best-effort": {
        readonly type: "bool";
        readonly name: "ssl-revoke-best-effort";
    };
    readonly "no-ssl-revoke-best-effort": {
        readonly type: "bool";
        readonly name: "ssl-revoke-best-effort";
        readonly expand: false;
    };
    readonly "tcp-fastopen": {
        readonly type: "bool";
        readonly name: "tcp-fastopen";
    };
    readonly "no-tcp-fastopen": {
        readonly type: "bool";
        readonly name: "tcp-fastopen";
        readonly expand: false;
    };
    readonly "proxy-tlsuser": {
        readonly type: "string";
        readonly name: "proxy-tlsuser";
    };
    readonly "proxy-tlspassword": {
        readonly type: "string";
        readonly name: "proxy-tlspassword";
    };
    readonly "proxy-tlsauthtype": {
        readonly type: "string";
        readonly name: "proxy-tlsauthtype";
    };
    readonly "proxy-cert": {
        readonly type: "string";
        readonly name: "proxy-cert";
    };
    readonly "proxy-cert-type": {
        readonly type: "string";
        readonly name: "proxy-cert-type";
    };
    readonly "proxy-key": {
        readonly type: "string";
        readonly name: "proxy-key";
    };
    readonly "proxy-key-type": {
        readonly type: "string";
        readonly name: "proxy-key-type";
    };
    readonly "proxy-pass": {
        readonly type: "string";
        readonly name: "proxy-pass";
    };
    readonly "proxy-ciphers": {
        readonly type: "string";
        readonly name: "proxy-ciphers";
    };
    readonly "proxy-crlfile": {
        readonly type: "string";
        readonly name: "proxy-crlfile";
    };
    readonly "proxy-ssl-allow-beast": {
        readonly type: "bool";
        readonly name: "proxy-ssl-allow-beast";
    };
    readonly "no-proxy-ssl-allow-beast": {
        readonly type: "bool";
        readonly name: "proxy-ssl-allow-beast";
        readonly expand: false;
    };
    readonly "login-options": {
        readonly type: "string";
        readonly name: "login-options";
    };
    readonly "proxy-cacert": {
        readonly type: "string";
        readonly name: "proxy-cacert";
    };
    readonly "proxy-capath": {
        readonly type: "string";
        readonly name: "proxy-capath";
    };
    readonly "proxy-insecure": {
        readonly type: "bool";
        readonly name: "proxy-insecure";
    };
    readonly "no-proxy-insecure": {
        readonly type: "bool";
        readonly name: "proxy-insecure";
        readonly expand: false;
    };
    readonly "proxy-tlsv1": {
        readonly type: "bool";
        readonly name: "proxy-tlsv1";
    };
    readonly "socks5-basic": {
        readonly type: "bool";
        readonly name: "socks5-basic";
    };
    readonly "no-socks5-basic": {
        readonly type: "bool";
        readonly name: "socks5-basic";
        readonly expand: false;
    };
    readonly "socks5-gssapi": {
        readonly type: "bool";
        readonly name: "socks5-gssapi";
    };
    readonly "no-socks5-gssapi": {
        readonly type: "bool";
        readonly name: "socks5-gssapi";
        readonly expand: false;
    };
    readonly "etag-save": {
        readonly type: "string";
        readonly name: "etag-save";
    };
    readonly "etag-compare": {
        readonly type: "string";
        readonly name: "etag-compare";
    };
    readonly curves: {
        readonly type: "string";
        readonly name: "curves";
    };
    readonly fail: {
        readonly type: "bool";
        readonly name: "fail";
    };
    readonly "no-fail": {
        readonly type: "bool";
        readonly name: "fail";
        readonly expand: false;
    };
    readonly "fail-early": {
        readonly type: "bool";
        readonly name: "fail-early";
    };
    readonly "no-fail-early": {
        readonly type: "bool";
        readonly name: "fail-early";
        readonly expand: false;
    };
    readonly "styled-output": {
        readonly type: "bool";
        readonly name: "styled-output";
    };
    readonly "no-styled-output": {
        readonly type: "bool";
        readonly name: "styled-output";
        readonly expand: false;
    };
    readonly "mail-rcpt-allowfails": {
        readonly type: "bool";
        readonly name: "mail-rcpt-allowfails";
    };
    readonly "no-mail-rcpt-allowfails": {
        readonly type: "bool";
        readonly name: "mail-rcpt-allowfails";
        readonly expand: false;
    };
    readonly "fail-with-body": {
        readonly type: "bool";
        readonly name: "fail-with-body";
    };
    readonly "no-fail-with-body": {
        readonly type: "bool";
        readonly name: "fail-with-body";
        readonly expand: false;
    };
    readonly "remove-on-error": {
        readonly type: "bool";
        readonly name: "remove-on-error";
    };
    readonly "no-remove-on-error": {
        readonly type: "bool";
        readonly name: "remove-on-error";
        readonly expand: false;
    };
    readonly form: {
        readonly type: "string";
        readonly name: "form";
    };
    readonly "form-string": {
        readonly type: "string";
        readonly name: "form-string";
    };
    readonly globoff: {
        readonly type: "bool";
        readonly name: "globoff";
    };
    readonly "no-globoff": {
        readonly type: "bool";
        readonly name: "globoff";
        readonly expand: false;
    };
    readonly get: {
        readonly type: "bool";
        readonly name: "get";
    };
    readonly "no-get": {
        readonly type: "bool";
        readonly name: "get";
        readonly expand: false;
    };
    readonly "request-target": {
        readonly type: "string";
        readonly name: "request-target";
    };
    readonly help: {
        readonly type: "bool";
        readonly name: "help";
    };
    readonly "no-help": {
        readonly type: "bool";
        readonly name: "help";
        readonly expand: false;
    };
    readonly header: {
        readonly type: "string";
        readonly name: "header";
    };
    readonly "proxy-header": {
        readonly type: "string";
        readonly name: "proxy-header";
    };
    readonly include: {
        readonly type: "bool";
        readonly name: "include";
    };
    readonly "no-include": {
        readonly type: "bool";
        readonly name: "include";
        readonly expand: false;
    };
    readonly head: {
        readonly type: "bool";
        readonly name: "head";
    };
    readonly "no-head": {
        readonly type: "bool";
        readonly name: "head";
        readonly expand: false;
    };
    readonly "junk-session-cookies": {
        readonly type: "bool";
        readonly name: "junk-session-cookies";
    };
    readonly "no-junk-session-cookies": {
        readonly type: "bool";
        readonly name: "junk-session-cookies";
        readonly expand: false;
    };
    readonly "remote-header-name": {
        readonly type: "bool";
        readonly name: "remote-header-name";
    };
    readonly "no-remote-header-name": {
        readonly type: "bool";
        readonly name: "remote-header-name";
        readonly expand: false;
    };
    readonly insecure: {
        readonly type: "bool";
        readonly name: "insecure";
    };
    readonly "no-insecure": {
        readonly type: "bool";
        readonly name: "insecure";
        readonly expand: false;
    };
    readonly "doh-insecure": {
        readonly type: "bool";
        readonly name: "doh-insecure";
    };
    readonly "no-doh-insecure": {
        readonly type: "bool";
        readonly name: "doh-insecure";
        readonly expand: false;
    };
    readonly config: {
        readonly type: "string";
        readonly name: "config";
    };
    readonly "list-only": {
        readonly type: "bool";
        readonly name: "list-only";
    };
    readonly "no-list-only": {
        readonly type: "bool";
        readonly name: "list-only";
        readonly expand: false;
    };
    readonly location: {
        readonly type: "bool";
        readonly name: "location";
    };
    readonly "no-location": {
        readonly type: "bool";
        readonly name: "location";
        readonly expand: false;
    };
    readonly "location-trusted": {
        readonly type: "bool";
        readonly name: "location-trusted";
    };
    readonly "no-location-trusted": {
        readonly type: "bool";
        readonly name: "location-trusted";
        readonly expand: false;
    };
    readonly "max-time": {
        readonly type: "string";
        readonly name: "max-time";
    };
    readonly manual: {
        readonly type: "bool";
        readonly name: "manual";
    };
    readonly "no-manual": {
        readonly type: "bool";
        readonly name: "manual";
        readonly expand: false;
    };
    readonly netrc: {
        readonly type: "bool";
        readonly name: "netrc";
    };
    readonly "no-netrc": {
        readonly type: "bool";
        readonly name: "netrc";
        readonly expand: false;
    };
    readonly "netrc-optional": {
        readonly type: "bool";
        readonly name: "netrc-optional";
    };
    readonly "no-netrc-optional": {
        readonly type: "bool";
        readonly name: "netrc-optional";
        readonly expand: false;
    };
    readonly "netrc-file": {
        readonly type: "string";
        readonly name: "netrc-file";
    };
    readonly buffer: {
        readonly type: "bool";
        readonly name: "buffer";
    };
    readonly "no-buffer": {
        readonly type: "bool";
        readonly name: "buffer";
        readonly expand: false;
    };
    readonly output: {
        readonly type: "string";
        readonly name: "output";
    };
    readonly "remote-name": {
        readonly type: "bool";
        readonly name: "remote-name";
    };
    readonly "no-remote-name": {
        readonly type: "bool";
        readonly name: "remote-name";
        readonly expand: false;
    };
    readonly "remote-name-all": {
        readonly type: "bool";
        readonly name: "remote-name-all";
    };
    readonly "no-remote-name-all": {
        readonly type: "bool";
        readonly name: "remote-name-all";
        readonly expand: false;
    };
    readonly "output-dir": {
        readonly type: "string";
        readonly name: "output-dir";
    };
    readonly clobber: {
        readonly type: "bool";
        readonly name: "clobber";
    };
    readonly "no-clobber": {
        readonly type: "bool";
        readonly name: "clobber";
        readonly expand: false;
    };
    readonly proxytunnel: {
        readonly type: "bool";
        readonly name: "proxytunnel";
    };
    readonly "no-proxytunnel": {
        readonly type: "bool";
        readonly name: "proxytunnel";
        readonly expand: false;
    };
    readonly "ftp-port": {
        readonly type: "string";
        readonly name: "ftp-port";
    };
    readonly disable: {
        readonly type: "bool";
        readonly name: "disable";
    };
    readonly "no-disable": {
        readonly type: "bool";
        readonly name: "disable";
        readonly expand: false;
    };
    readonly quote: {
        readonly type: "string";
        readonly name: "quote";
    };
    readonly range: {
        readonly type: "string";
        readonly name: "range";
    };
    readonly "remote-time": {
        readonly type: "bool";
        readonly name: "remote-time";
    };
    readonly "no-remote-time": {
        readonly type: "bool";
        readonly name: "remote-time";
        readonly expand: false;
    };
    readonly silent: {
        readonly type: "bool";
        readonly name: "silent";
    };
    readonly "no-silent": {
        readonly type: "bool";
        readonly name: "silent";
        readonly expand: false;
    };
    readonly "show-error": {
        readonly type: "bool";
        readonly name: "show-error";
    };
    readonly "no-show-error": {
        readonly type: "bool";
        readonly name: "show-error";
        readonly expand: false;
    };
    readonly "telnet-option": {
        readonly type: "string";
        readonly name: "telnet-option";
    };
    readonly "upload-file": {
        readonly type: "string";
        readonly name: "upload-file";
    };
    readonly user: {
        readonly type: "string";
        readonly name: "user";
    };
    readonly "proxy-user": {
        readonly type: "string";
        readonly name: "proxy-user";
    };
    readonly verbose: {
        readonly type: "bool";
        readonly name: "verbose";
    };
    readonly "no-verbose": {
        readonly type: "bool";
        readonly name: "verbose";
        readonly expand: false;
    };
    readonly version: {
        readonly type: "bool";
        readonly name: "version";
    };
    readonly "no-version": {
        readonly type: "bool";
        readonly name: "version";
        readonly expand: false;
    };
    readonly "write-out": {
        readonly type: "string";
        readonly name: "write-out";
    };
    readonly proxy: {
        readonly type: "string";
        readonly name: "proxy";
    };
    readonly preproxy: {
        readonly type: "string";
        readonly name: "preproxy";
    };
    readonly request: {
        readonly type: "string";
        readonly name: "request";
    };
    readonly "speed-limit": {
        readonly type: "string";
        readonly name: "speed-limit";
    };
    readonly "speed-time": {
        readonly type: "string";
        readonly name: "speed-time";
    };
    readonly "time-cond": {
        readonly type: "string";
        readonly name: "time-cond";
    };
    readonly parallel: {
        readonly type: "bool";
        readonly name: "parallel";
    };
    readonly "no-parallel": {
        readonly type: "bool";
        readonly name: "parallel";
        readonly expand: false;
    };
    readonly "parallel-max": {
        readonly type: "string";
        readonly name: "parallel-max";
    };
    readonly "parallel-immediate": {
        readonly type: "bool";
        readonly name: "parallel-immediate";
    };
    readonly "no-parallel-immediate": {
        readonly type: "bool";
        readonly name: "parallel-immediate";
        readonly expand: false;
    };
    readonly "progress-bar": {
        readonly type: "bool";
        readonly name: "progress-bar";
    };
    readonly "no-progress-bar": {
        readonly type: "bool";
        readonly name: "progress-bar";
        readonly expand: false;
    };
    readonly "progress-meter": {
        readonly type: "bool";
        readonly name: "progress-meter";
    };
    readonly "no-progress-meter": {
        readonly type: "bool";
        readonly name: "progress-meter";
        readonly expand: false;
    };
    readonly next: {
        readonly type: "bool";
        readonly name: "next";
    };
    readonly port: {
        readonly type: "string";
        readonly name: "port";
        readonly removed: "7.3";
    };
    readonly "ftp-ascii": {
        readonly type: "bool";
        readonly name: "use-ascii";
        readonly removed: "7.10.7";
    };
    readonly "3p-url": {
        readonly type: "string";
        readonly name: "3p-url";
        readonly removed: "7.16.0";
    };
    readonly "3p-user": {
        readonly type: "string";
        readonly name: "3p-user";
        readonly removed: "7.16.0";
    };
    readonly "3p-quote": {
        readonly type: "string";
        readonly name: "3p-quote";
        readonly removed: "7.16.0";
    };
    readonly "http2.0": {
        readonly type: "bool";
        readonly name: "http2";
        readonly removed: "7.36.0";
    };
    readonly "no-http2.0": {
        readonly type: "bool";
        readonly name: "http2";
        readonly removed: "7.36.0";
    };
    readonly "telnet-options": {
        readonly type: "string";
        readonly name: "telnet-option";
        readonly removed: "7.49.0";
    };
    readonly "http-request": {
        readonly type: "string";
        readonly name: "request";
        readonly removed: "7.49.0";
    };
    readonly "capath ": {
        readonly type: "string";
        readonly name: "capath";
        readonly removed: "7.49.0";
    };
    readonly ftpport: {
        readonly type: "string";
        readonly name: "ftp-port";
        readonly removed: "7.49.0";
    };
    readonly environment: {
        readonly type: "bool";
        readonly name: "environment";
        readonly removed: "7.54.1";
    };
    readonly "no-tlsv1": {
        readonly type: "bool";
        readonly name: "tlsv1";
        readonly removed: "7.54.1";
    };
    readonly "no-tlsv1.2": {
        readonly type: "bool";
        readonly name: "tlsv1.2";
        readonly removed: "7.54.1";
    };
    readonly "no-http2-prior-knowledge": {
        readonly type: "bool";
        readonly name: "http2-prior-knowledge";
        readonly removed: "7.54.1";
    };
    readonly "no-ipv6": {
        readonly type: "bool";
        readonly name: "ipv6";
        readonly removed: "7.54.1";
    };
    readonly "no-ipv4": {
        readonly type: "bool";
        readonly name: "ipv4";
        readonly removed: "7.54.1";
    };
    readonly "no-sslv2": {
        readonly type: "bool";
        readonly name: "sslv2";
        readonly removed: "7.54.1";
    };
    readonly "no-tlsv1.0": {
        readonly type: "bool";
        readonly name: "tlsv1.0";
        readonly removed: "7.54.1";
    };
    readonly "no-tlsv1.1": {
        readonly type: "bool";
        readonly name: "tlsv1.1";
        readonly removed: "7.54.1";
    };
    readonly "no-sslv3": {
        readonly type: "bool";
        readonly name: "sslv3";
        readonly removed: "7.54.1";
    };
    readonly "no-http1.0": {
        readonly type: "bool";
        readonly name: "http1.0";
        readonly removed: "7.54.1";
    };
    readonly "no-next": {
        readonly type: "bool";
        readonly name: "next";
        readonly removed: "7.54.1";
    };
    readonly "no-tlsv1.3": {
        readonly type: "bool";
        readonly name: "tlsv1.3";
        readonly removed: "7.54.1";
    };
    readonly "no-environment": {
        readonly type: "bool";
        readonly name: "environment";
        readonly removed: "7.54.1";
    };
    readonly "no-http1.1": {
        readonly type: "bool";
        readonly name: "http1.1";
        readonly removed: "7.54.1";
    };
    readonly "no-proxy-tlsv1": {
        readonly type: "bool";
        readonly name: "proxy-tlsv1";
        readonly removed: "7.54.1";
    };
    readonly "no-http2": {
        readonly type: "bool";
        readonly name: "http2";
        readonly removed: "7.54.1";
    };
};
export declare const curlLongOptsShortened: {
    [key: string]: LongShort | null;
};
export declare const COMMON_SUPPORTED_ARGS: string[];
export declare function toBoolean(opt: string): boolean;
export declare const curlShortOpts: {
    [key: string]: keyof typeof curlLongOpts;
};
export declare const changedShortOpts: ShortOpts;
export type SrcFormParam = {
    value: Word;
    type: FormType;
};
export type SrcDataParam = [DataType, Word];
export interface OperationConfig {
    request?: Word;
    authtype: number;
    proxyauthtype: number;
    json?: boolean;
    url?: Word[];
    "upload-file"?: Word[];
    output?: Word[];
    header?: Word[];
    "proxy-header"?: Word[];
    form?: SrcFormParam[];
    data?: SrcDataParam[];
    "url-query"?: SrcDataParam[];
    "mail-rcpt"?: Word[];
    resolve?: Word[];
    "connect-to"?: Word[];
    cookie?: Word[];
    quote?: Word[];
    "telnet-option"?: Word[];
    httpVersion?: "1.0" | "1.1" | "2" | "2-prior-knowledge" | "3" | "3-only";
    tlsVersion?: "1" | "1.0" | "1.1" | "1.2" | "1.3";
    netrc?: boolean;
    "netrc-optional"?: boolean;
    "netrc-file"?: Word;
    compressed?: boolean;
    head?: boolean;
    get?: boolean;
    ipv4?: boolean;
    ipv6?: boolean;
    ciphers?: Word;
    insecure?: boolean;
    cert?: Word;
    "cert-type"?: Word;
    key?: Word;
    "key-type"?: Word;
    cacert?: Word;
    capath?: Word;
    crlfile?: Word;
    pinnedpubkey?: Word;
    "random-file"?: Word;
    "egd-file"?: Word;
    hsts?: Word[];
    "proto-default"?: Word;
    globoff?: boolean;
    "max-redirs"?: Word;
    location?: boolean;
    "location-trusted"?: boolean;
    proxy?: Word;
    "proxy-user"?: Word;
    noproxy?: Word;
    range?: Word;
    referer?: Word;
    "time-cond"?: Word;
    "user-agent"?: Word;
    user?: Word;
    "aws-sigv4"?: Word;
    delegation?: Word;
    "oauth2-bearer"?: Word;
    "max-time"?: Word;
    "connect-timeout"?: Word;
    "cookie-jar"?: Word;
    "unix-socket"?: Word;
    "3p-quote"?: Word;
    "3p-url"?: Word;
    "3p-user"?: Word;
    "abstract-unix-socket"?: Word;
    alpn?: boolean;
    "alt-svc"?: Word;
    anyauth?: boolean;
    append?: boolean;
    basic?: boolean;
    buffer?: boolean;
    "ca-native"?: boolean;
    "cert-status"?: boolean;
    clobber?: boolean;
    "compressed-ssh"?: boolean;
    "continue-at"?: Word;
    "create-dirs"?: boolean;
    "create-file-mode"?: Word;
    crlf?: boolean;
    curves?: Word;
    "data-ascii"?: Word;
    "data-binary"?: Word;
    "data-raw"?: Word;
    "data-urlencode"?: Word;
    digest?: boolean;
    disable?: boolean;
    "disable-eprt"?: boolean;
    "disable-epsv"?: boolean;
    "disallow-username-in-url"?: boolean;
    "dns-interface"?: Word;
    "dns-ipv4-addr"?: Word;
    "dns-ipv6-addr"?: Word;
    "dns-servers"?: Word;
    "doh-cert-status"?: boolean;
    "doh-insecure"?: boolean;
    "doh-url"?: Word;
    "dump-header"?: Word;
    engine?: Word;
    environment?: boolean;
    eprt?: boolean;
    epsv?: boolean;
    "etag-compare"?: Word;
    "etag-save"?: Word;
    "expect100-timeout"?: Word;
    fail?: boolean;
    "fail-with-body"?: boolean;
    "false-start"?: boolean;
    "form-escape"?: boolean;
    "form-string"?: Word;
    "ftp-account"?: Word;
    "ftp-alternative-to-user"?: Word;
    "ftp-create-dirs"?: boolean;
    "ftp-method"?: Word;
    "ftp-pasv"?: boolean;
    "ftp-port"?: Word;
    "ftp-pret"?: boolean;
    "ftp-skip-pasv-ip"?: boolean;
    "ftp-ssl-ccc"?: boolean;
    "ftp-ssl-ccc-mode"?: Word;
    "ftp-ssl-control"?: boolean;
    "happy-eyeballs-timeout-ms"?: Word;
    "haproxy-clientip"?: Word;
    "haproxy-protocol"?: boolean;
    hostpubmd5?: Word;
    hostpubsha256?: Word;
    "http0.9"?: boolean;
    "http1.0"?: boolean;
    "http1.1"?: boolean;
    "http2-prior-knowledge"?: boolean;
    "ignore-content-length"?: boolean;
    include?: boolean;
    interface?: Word;
    "junk-session-cookies"?: boolean;
    keepalive?: boolean;
    "keepalive-time"?: Word;
    krb?: Word;
    "limit-rate"?: Word;
    "list-only"?: boolean;
    "local-port"?: Word;
    "login-options"?: Word;
    "mail-auth"?: Word;
    "mail-from"?: Word;
    "mail-rcpt-allowfails"?: boolean;
    manual?: boolean;
    "max-filesize"?: Word;
    metalink?: boolean;
    negotiate?: boolean;
    next?: boolean;
    npn?: boolean;
    ntlm?: boolean;
    "ntlm-wb"?: boolean;
    "output-dir"?: Word;
    pass?: Word;
    "path-as-is"?: boolean;
    port?: Word;
    post301?: boolean;
    post302?: boolean;
    post303?: boolean;
    preproxy?: Word;
    proto?: Word;
    "proto-redir"?: Word;
    "proxy-anyauth"?: boolean;
    "proxy-basic"?: boolean;
    "proxy-cacert"?: Word;
    "proxy-capath"?: Word;
    "proxy-cert"?: Word;
    "proxy-cert-type"?: Word;
    "proxy-ciphers"?: Word;
    "proxy-crlfile"?: Word;
    "proxy-digest"?: boolean;
    "proxy-insecure"?: boolean;
    "proxy-key"?: Word;
    "proxy-key-type"?: Word;
    "proxy-negotiate"?: boolean;
    "proxy-ntlm"?: boolean;
    "proxy-pass"?: Word;
    "proxy-pinnedpubkey"?: Word;
    "proxy-service-name"?: Word;
    "proxy-ssl-allow-beast"?: boolean;
    "proxy-ssl-auto-client-cert"?: boolean;
    "proxy-tls13-ciphers"?: Word;
    "proxy-tlsauthtype"?: Word;
    "proxy-tlspassword"?: Word;
    "proxy-tlsuser"?: Word;
    "proxy-tlsv1"?: boolean;
    "proxy1.0"?: Word;
    proxytunnel?: boolean;
    pubkey?: Word;
    rate?: Word;
    raw?: boolean;
    "remote-header-name"?: boolean;
    "remote-name"?: boolean;
    "remote-name-all"?: boolean;
    "remote-time"?: boolean;
    "remove-on-error"?: boolean;
    "request-target"?: Word;
    retry?: Word;
    "retry-all-errors"?: boolean;
    "retry-connrefused"?: boolean;
    "retry-delay"?: Word;
    "retry-max-time"?: Word;
    "sasl-authzid"?: Word;
    "sasl-ir"?: boolean;
    "service-name"?: Word;
    sessionid?: boolean;
    socks4?: Word;
    socks4a?: Word;
    socks5?: Word;
    "socks5-basic"?: boolean;
    "socks5-gssapi"?: boolean;
    "socks5-gssapi-nec"?: boolean;
    "socks5-hostname"?: Word;
    "speed-limit"?: Word;
    "speed-time"?: Word;
    ssl?: boolean;
    "ssl-allow-beast"?: boolean;
    "ssl-auto-client-cert"?: boolean;
    "ssl-no-revoke"?: boolean;
    "ssl-reqd"?: boolean;
    "ssl-revoke-best-effort"?: boolean;
    sslv2?: boolean;
    sslv3?: boolean;
    "suppress-connect-headers"?: boolean;
    "tcp-fastopen"?: boolean;
    "tcp-nodelay"?: boolean;
    "tftp-blksize"?: Word;
    "tftp-no-options"?: boolean;
    "tls-max"?: Word;
    "tls13-ciphers"?: Word;
    tlsauthtype?: Word;
    tlspassword?: Word;
    tlsuser?: Word;
    tlsv1?: boolean;
    "tlsv1.0"?: boolean;
    "tlsv1.1"?: boolean;
    "tlsv1.2"?: boolean;
    "tlsv1.3"?: boolean;
    "tr-encoding"?: boolean;
    "use-ascii"?: boolean;
    version?: boolean;
    wdebug?: boolean;
    "write-out"?: Word;
    xattr?: boolean;
    [key: string]: any;
}
export interface GlobalConfig {
    version?: boolean;
    trace?: Word;
    "trace-ascii"?: Word;
    "trace-time"?: boolean;
    stderr?: Word;
    libcurl?: Word;
    "test-event"?: boolean;
    "progress-bar"?: boolean;
    "progress-meter"?: boolean;
    "fail-early"?: boolean;
    "styled-output"?: boolean;
    help?: boolean;
    config?: Word;
    silent?: boolean;
    "show-error"?: boolean;
    verbose?: boolean;
    parallel?: boolean;
    "parallel-immediate"?: boolean;
    "parallel-max"?: Word;
    configs: OperationConfig[];
    warnings: Warnings;
    language?: string;
    stdin?: boolean;
}
export declare function pushProp<Type>(obj: {
    [key: string]: Type[];
}, prop: string, value: Type): {
    [key: string]: Type[];
};
export declare function parseArgs(args: Word[], longOpts?: LongOpts, shortenedLongOpts?: LongOpts, shortOpts?: ShortOpts, supportedOpts?: Set<string>, warnings?: Warnings): [GlobalConfig, [string, string][]];
