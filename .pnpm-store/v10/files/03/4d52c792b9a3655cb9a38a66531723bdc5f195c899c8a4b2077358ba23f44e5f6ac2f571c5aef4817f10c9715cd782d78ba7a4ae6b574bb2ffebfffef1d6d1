import { CCError, has } from "../utils.js";
import { Word, eq, firstShellToken } from "../shell/Word.js";
import { warnf, underlineNode, type Warnings } from "../Warnings.js";
import {
  CURLAUTH_BASIC,
  CURLAUTH_DIGEST,
  CURLAUTH_NEGOTIATE,
  CURLAUTH_NTLM,
  CURLAUTH_NTLM_WB,
  CURLAUTH_BEARER,
  CURLAUTH_AWS_SIGV4,
  CURLAUTH_ANY,
} from "./auth.js";
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

// prettier-ignore
export const curlLongOpts = {
  // BEGIN EXTRACTED OPTIONS
  "url": { type: "string", name: "url" },
  "dns-ipv4-addr": { type: "string", name: "dns-ipv4-addr" },
  "dns-ipv6-addr": { type: "string", name: "dns-ipv6-addr" },
  "random-file": { type: "string", name: "random-file" },
  "egd-file": { type: "string", name: "egd-file" },
  "oauth2-bearer": { type: "string", name: "oauth2-bearer" },
  "connect-timeout": { type: "string", name: "connect-timeout" },
  "doh-url": { type: "string", name: "doh-url" },
  "ciphers": { type: "string", name: "ciphers" },
  "dns-interface": { type: "string", name: "dns-interface" },
  "disable-epsv": { type: "bool", name: "disable-epsv" },
  "no-disable-epsv": { type: "bool", name: "disable-epsv", expand: false },
  "disallow-username-in-url": { type: "bool", name: "disallow-username-in-url" },
  "no-disallow-username-in-url": { type: "bool", name: "disallow-username-in-url", expand: false },
  "epsv": { type: "bool", name: "epsv" },
  "no-epsv": { type: "bool", name: "epsv", expand: false },
  "dns-servers": { type: "string", name: "dns-servers" },
  "trace": { type: "string", name: "trace" },
  "npn": { type: "bool", name: "npn" },
  "no-npn": { type: "bool", name: "npn", expand: false },
  "trace-ascii": { type: "string", name: "trace-ascii" },
  "alpn": { type: "bool", name: "alpn" },
  "no-alpn": { type: "bool", name: "alpn", expand: false },
  "limit-rate": { type: "string", name: "limit-rate" },
  "rate": { type: "string", name: "rate" },
  "compressed": { type: "bool", name: "compressed" },
  "no-compressed": { type: "bool", name: "compressed", expand: false },
  "tr-encoding": { type: "bool", name: "tr-encoding" },
  "no-tr-encoding": { type: "bool", name: "tr-encoding", expand: false },
  "digest": { type: "bool", name: "digest" },
  "no-digest": { type: "bool", name: "digest", expand: false },
  "negotiate": { type: "bool", name: "negotiate" },
  "no-negotiate": { type: "bool", name: "negotiate", expand: false },
  "ntlm": { type: "bool", name: "ntlm" },
  "no-ntlm": { type: "bool", name: "ntlm", expand: false },
  "ntlm-wb": { type: "bool", name: "ntlm-wb" },
  "no-ntlm-wb": { type: "bool", name: "ntlm-wb", expand: false },
  "basic": { type: "bool", name: "basic" },
  "no-basic": { type: "bool", name: "basic", expand: false },
  "anyauth": { type: "bool", name: "anyauth" },
  "no-anyauth": { type: "bool", name: "anyauth", expand: false },
  "wdebug": { type: "bool", name: "wdebug" },
  "no-wdebug": { type: "bool", name: "wdebug", expand: false },
  "ftp-create-dirs": { type: "bool", name: "ftp-create-dirs" },
  "no-ftp-create-dirs": { type: "bool", name: "ftp-create-dirs", expand: false },
  "create-dirs": { type: "bool", name: "create-dirs" },
  "no-create-dirs": { type: "bool", name: "create-dirs", expand: false },
  "create-file-mode": { type: "string", name: "create-file-mode" },
  "max-redirs": { type: "string", name: "max-redirs" },
  "proxy-ntlm": { type: "bool", name: "proxy-ntlm" },
  "no-proxy-ntlm": { type: "bool", name: "proxy-ntlm", expand: false },
  "crlf": { type: "bool", name: "crlf" },
  "no-crlf": { type: "bool", name: "crlf", expand: false },
  "stderr": { type: "string", name: "stderr" },
  "aws-sigv4": { type: "string", name: "aws-sigv4" },
  "interface": { type: "string", name: "interface" },
  "krb": { type: "string", name: "krb" },
  "krb4": { type: "string", name: "krb" },
  "haproxy-protocol": { type: "bool", name: "haproxy-protocol" },
  "no-haproxy-protocol": { type: "bool", name: "haproxy-protocol", expand: false },
  "haproxy-clientip": { type: "string", name: "haproxy-clientip" },
  "max-filesize": { type: "string", name: "max-filesize" },
  "disable-eprt": { type: "bool", name: "disable-eprt" },
  "no-disable-eprt": { type: "bool", name: "disable-eprt", expand: false },
  "eprt": { type: "bool", name: "eprt" },
  "no-eprt": { type: "bool", name: "eprt", expand: false },
  "xattr": { type: "bool", name: "xattr" },
  "no-xattr": { type: "bool", name: "xattr", expand: false },
  "ftp-ssl": { type: "bool", name: "ssl" },
  "no-ftp-ssl": { type: "bool", name: "ssl", expand: false },
  "ssl": { type: "bool", name: "ssl" },
  "no-ssl": { type: "bool", name: "ssl", expand: false },
  "ftp-pasv": { type: "bool", name: "ftp-pasv" },
  "no-ftp-pasv": { type: "bool", name: "ftp-pasv", expand: false },
  "socks5": { type: "string", name: "socks5" },
  "tcp-nodelay": { type: "bool", name: "tcp-nodelay" },
  "no-tcp-nodelay": { type: "bool", name: "tcp-nodelay", expand: false },
  "proxy-digest": { type: "bool", name: "proxy-digest" },
  "no-proxy-digest": { type: "bool", name: "proxy-digest", expand: false },
  "proxy-basic": { type: "bool", name: "proxy-basic" },
  "no-proxy-basic": { type: "bool", name: "proxy-basic", expand: false },
  "retry": { type: "string", name: "retry" },
  "retry-connrefused": { type: "bool", name: "retry-connrefused" },
  "no-retry-connrefused": { type: "bool", name: "retry-connrefused", expand: false },
  "retry-delay": { type: "string", name: "retry-delay" },
  "retry-max-time": { type: "string", name: "retry-max-time" },
  "proxy-negotiate": { type: "bool", name: "proxy-negotiate" },
  "no-proxy-negotiate": { type: "bool", name: "proxy-negotiate", expand: false },
  "form-escape": { type: "bool", name: "form-escape" },
  "no-form-escape": { type: "bool", name: "form-escape", expand: false },
  "ftp-account": { type: "string", name: "ftp-account" },
  "proxy-anyauth": { type: "bool", name: "proxy-anyauth" },
  "no-proxy-anyauth": { type: "bool", name: "proxy-anyauth", expand: false },
  "trace-time": { type: "bool", name: "trace-time" },
  "no-trace-time": { type: "bool", name: "trace-time", expand: false },
  "ignore-content-length": { type: "bool", name: "ignore-content-length" },
  "no-ignore-content-length": { type: "bool", name: "ignore-content-length", expand: false },
  "ftp-skip-pasv-ip": { type: "bool", name: "ftp-skip-pasv-ip" },
  "no-ftp-skip-pasv-ip": { type: "bool", name: "ftp-skip-pasv-ip", expand: false },
  "ftp-method": { type: "string", name: "ftp-method" },
  "local-port": { type: "string", name: "local-port" },
  "socks4": { type: "string", name: "socks4" },
  "socks4a": { type: "string", name: "socks4a" },
  "ftp-alternative-to-user": { type: "string", name: "ftp-alternative-to-user" },
  "ftp-ssl-reqd": { type: "bool", name: "ssl-reqd" },
  "no-ftp-ssl-reqd": { type: "bool", name: "ssl-reqd", expand: false },
  "ssl-reqd": { type: "bool", name: "ssl-reqd" },
  "no-ssl-reqd": { type: "bool", name: "ssl-reqd", expand: false },
  "sessionid": { type: "bool", name: "sessionid" },
  "no-sessionid": { type: "bool", name: "sessionid", expand: false },
  "ftp-ssl-control": { type: "bool", name: "ftp-ssl-control" },
  "no-ftp-ssl-control": { type: "bool", name: "ftp-ssl-control", expand: false },
  "ftp-ssl-ccc": { type: "bool", name: "ftp-ssl-ccc" },
  "no-ftp-ssl-ccc": { type: "bool", name: "ftp-ssl-ccc", expand: false },
  "ftp-ssl-ccc-mode": { type: "string", name: "ftp-ssl-ccc-mode" },
  "libcurl": { type: "string", name: "libcurl" },
  "raw": { type: "bool", name: "raw" },
  "no-raw": { type: "bool", name: "raw", expand: false },
  "post301": { type: "bool", name: "post301" },
  "no-post301": { type: "bool", name: "post301", expand: false },
  "keepalive": { type: "bool", name: "keepalive" },
  "no-keepalive": { type: "bool", name: "keepalive", expand: false },
  "socks5-hostname": { type: "string", name: "socks5-hostname" },
  "keepalive-time": { type: "string", name: "keepalive-time" },
  "post302": { type: "bool", name: "post302" },
  "no-post302": { type: "bool", name: "post302", expand: false },
  "noproxy": { type: "string", name: "noproxy" },
  "socks5-gssapi-nec": { type: "bool", name: "socks5-gssapi-nec" },
  "no-socks5-gssapi-nec": { type: "bool", name: "socks5-gssapi-nec", expand: false },
  "proxy1.0": { type: "string", name: "proxy1.0" },
  "tftp-blksize": { type: "string", name: "tftp-blksize" },
  "mail-from": { type: "string", name: "mail-from" },
  "mail-rcpt": { type: "string", name: "mail-rcpt" },
  "ftp-pret": { type: "bool", name: "ftp-pret" },
  "no-ftp-pret": { type: "bool", name: "ftp-pret", expand: false },
  "proto": { type: "string", name: "proto" },
  "proto-redir": { type: "string", name: "proto-redir" },
  "resolve": { type: "string", name: "resolve" },
  "delegation": { type: "string", name: "delegation" },
  "mail-auth": { type: "string", name: "mail-auth" },
  "post303": { type: "bool", name: "post303" },
  "no-post303": { type: "bool", name: "post303", expand: false },
  "metalink": { type: "bool", name: "metalink" },
  "no-metalink": { type: "bool", name: "metalink", expand: false },
  "sasl-authzid": { type: "string", name: "sasl-authzid" },
  "sasl-ir": { type: "bool", name: "sasl-ir" },
  "no-sasl-ir": { type: "bool", name: "sasl-ir", expand: false },
  "test-event": { type: "bool", name: "test-event" },
  "no-test-event": { type: "bool", name: "test-event", expand: false },
  "unix-socket": { type: "string", name: "unix-socket" },
  "path-as-is": { type: "bool", name: "path-as-is" },
  "no-path-as-is": { type: "bool", name: "path-as-is", expand: false },
  "socks5-gssapi-service": { type: "string", name: "proxy-service-name" },
  "proxy-service-name": { type: "string", name: "proxy-service-name" },
  "service-name": { type: "string", name: "service-name" },
  "proto-default": { type: "string", name: "proto-default" },
  "expect100-timeout": { type: "string", name: "expect100-timeout" },
  "tftp-no-options": { type: "bool", name: "tftp-no-options" },
  "no-tftp-no-options": { type: "bool", name: "tftp-no-options", expand: false },
  "connect-to": { type: "string", name: "connect-to" },
  "abstract-unix-socket": { type: "string", name: "abstract-unix-socket" },
  "tls-max": { type: "string", name: "tls-max" },
  "suppress-connect-headers": { type: "bool", name: "suppress-connect-headers" },
  "no-suppress-connect-headers": { type: "bool", name: "suppress-connect-headers", expand: false },
  "compressed-ssh": { type: "bool", name: "compressed-ssh" },
  "no-compressed-ssh": { type: "bool", name: "compressed-ssh", expand: false },
  "happy-eyeballs-timeout-ms": { type: "string", name: "happy-eyeballs-timeout-ms" },
  "retry-all-errors": { type: "bool", name: "retry-all-errors" },
  "no-retry-all-errors": { type: "bool", name: "retry-all-errors", expand: false },
  "trace-ids": { type: "bool", name: "trace-ids" },
  "no-trace-ids": { type: "bool", name: "trace-ids", expand: false },
  "http1.0": { type: "bool", name: "http1.0" },
  "http1.1": { type: "bool", name: "http1.1" },
  "http2": { type: "bool", name: "http2" },
  "http2-prior-knowledge": { type: "bool", name: "http2-prior-knowledge" },
  "http3": { type: "bool", name: "http3" },
  "http3-only": { type: "bool", name: "http3-only" },
  "http0.9": { type: "bool", name: "http0.9" },
  "no-http0.9": { type: "bool", name: "http0.9", expand: false },
  "proxy-http2": { type: "bool", name: "proxy-http2" },
  "no-proxy-http2": { type: "bool", name: "proxy-http2", expand: false },
  "tlsv1": { type: "bool", name: "tlsv1" },
  "tlsv1.0": { type: "bool", name: "tlsv1.0" },
  "tlsv1.1": { type: "bool", name: "tlsv1.1" },
  "tlsv1.2": { type: "bool", name: "tlsv1.2" },
  "tlsv1.3": { type: "bool", name: "tlsv1.3" },
  "tls13-ciphers": { type: "string", name: "tls13-ciphers" },
  "proxy-tls13-ciphers": { type: "string", name: "proxy-tls13-ciphers" },
  "sslv2": { type: "bool", name: "sslv2" },
  "sslv3": { type: "bool", name: "sslv3" },
  "ipv4": { type: "bool", name: "ipv4" },
  "ipv6": { type: "bool", name: "ipv6" },
  "append": { type: "bool", name: "append" },
  "no-append": { type: "bool", name: "append", expand: false },
  "user-agent": { type: "string", name: "user-agent" },
  "cookie": { type: "string", name: "cookie" },
  "alt-svc": { type: "string", name: "alt-svc" },
  "hsts": { type: "string", name: "hsts" },
  "use-ascii": { type: "bool", name: "use-ascii" },
  "no-use-ascii": { type: "bool", name: "use-ascii", expand: false },
  "cookie-jar": { type: "string", name: "cookie-jar" },
  "continue-at": { type: "string", name: "continue-at" },
  "data": { type: "string", name: "data" },
  "data-raw": { type: "string", name: "data-raw" },
  "data-ascii": { type: "string", name: "data-ascii" },
  "data-binary": { type: "string", name: "data-binary" },
  "data-urlencode": { type: "string", name: "data-urlencode" },
  "json": { type: "string", name: "json" },
  "url-query": { type: "string", name: "url-query" },
  "dump-header": { type: "string", name: "dump-header" },
  "referer": { type: "string", name: "referer" },
  "cert": { type: "string", name: "cert" },
  "cacert": { type: "string", name: "cacert" },
  "cert-type": { type: "string", name: "cert-type" },
  "key": { type: "string", name: "key" },
  "key-type": { type: "string", name: "key-type" },
  "pass": { type: "string", name: "pass" },
  "engine": { type: "string", name: "engine" },
  "ca-native": { type: "bool", name: "ca-native" },
  "no-ca-native": { type: "bool", name: "ca-native", expand: false },
  "proxy-ca-native": { type: "bool", name: "proxy-ca-native" },
  "no-proxy-ca-native": { type: "bool", name: "proxy-ca-native", expand: false },
  "capath": { type: "string", name: "capath" },
  "pubkey": { type: "string", name: "pubkey" },
  "hostpubmd5": { type: "string", name: "hostpubmd5" },
  "hostpubsha256": { type: "string", name: "hostpubsha256" },
  "crlfile": { type: "string", name: "crlfile" },
  "tlsuser": { type: "string", name: "tlsuser" },
  "tlspassword": { type: "string", name: "tlspassword" },
  "tlsauthtype": { type: "string", name: "tlsauthtype" },
  "ssl-allow-beast": { type: "bool", name: "ssl-allow-beast" },
  "no-ssl-allow-beast": { type: "bool", name: "ssl-allow-beast", expand: false },
  "ssl-auto-client-cert": { type: "bool", name: "ssl-auto-client-cert" },
  "no-ssl-auto-client-cert": { type: "bool", name: "ssl-auto-client-cert", expand: false },
  "proxy-ssl-auto-client-cert": { type: "bool", name: "proxy-ssl-auto-client-cert" },
  "no-proxy-ssl-auto-client-cert": { type: "bool", name: "proxy-ssl-auto-client-cert", expand: false },
  "pinnedpubkey": { type: "string", name: "pinnedpubkey" },
  "proxy-pinnedpubkey": { type: "string", name: "proxy-pinnedpubkey" },
  "cert-status": { type: "bool", name: "cert-status" },
  "no-cert-status": { type: "bool", name: "cert-status", expand: false },
  "doh-cert-status": { type: "bool", name: "doh-cert-status" },
  "no-doh-cert-status": { type: "bool", name: "doh-cert-status", expand: false },
  "false-start": { type: "bool", name: "false-start" },
  "no-false-start": { type: "bool", name: "false-start", expand: false },
  "ssl-no-revoke": { type: "bool", name: "ssl-no-revoke" },
  "no-ssl-no-revoke": { type: "bool", name: "ssl-no-revoke", expand: false },
  "ssl-revoke-best-effort": { type: "bool", name: "ssl-revoke-best-effort" },
  "no-ssl-revoke-best-effort": { type: "bool", name: "ssl-revoke-best-effort", expand: false },
  "tcp-fastopen": { type: "bool", name: "tcp-fastopen" },
  "no-tcp-fastopen": { type: "bool", name: "tcp-fastopen", expand: false },
  "proxy-tlsuser": { type: "string", name: "proxy-tlsuser" },
  "proxy-tlspassword": { type: "string", name: "proxy-tlspassword" },
  "proxy-tlsauthtype": { type: "string", name: "proxy-tlsauthtype" },
  "proxy-cert": { type: "string", name: "proxy-cert" },
  "proxy-cert-type": { type: "string", name: "proxy-cert-type" },
  "proxy-key": { type: "string", name: "proxy-key" },
  "proxy-key-type": { type: "string", name: "proxy-key-type" },
  "proxy-pass": { type: "string", name: "proxy-pass" },
  "proxy-ciphers": { type: "string", name: "proxy-ciphers" },
  "proxy-crlfile": { type: "string", name: "proxy-crlfile" },
  "proxy-ssl-allow-beast": { type: "bool", name: "proxy-ssl-allow-beast" },
  "no-proxy-ssl-allow-beast": { type: "bool", name: "proxy-ssl-allow-beast", expand: false },
  "login-options": { type: "string", name: "login-options" },
  "proxy-cacert": { type: "string", name: "proxy-cacert" },
  "proxy-capath": { type: "string", name: "proxy-capath" },
  "proxy-insecure": { type: "bool", name: "proxy-insecure" },
  "no-proxy-insecure": { type: "bool", name: "proxy-insecure", expand: false },
  "proxy-tlsv1": { type: "bool", name: "proxy-tlsv1" },
  "socks5-basic": { type: "bool", name: "socks5-basic" },
  "no-socks5-basic": { type: "bool", name: "socks5-basic", expand: false },
  "socks5-gssapi": { type: "bool", name: "socks5-gssapi" },
  "no-socks5-gssapi": { type: "bool", name: "socks5-gssapi", expand: false },
  "etag-save": { type: "string", name: "etag-save" },
  "etag-compare": { type: "string", name: "etag-compare" },
  "curves": { type: "string", name: "curves" },
  "fail": { type: "bool", name: "fail" },
  "no-fail": { type: "bool", name: "fail", expand: false },
  "fail-early": { type: "bool", name: "fail-early" },
  "no-fail-early": { type: "bool", name: "fail-early", expand: false },
  "styled-output": { type: "bool", name: "styled-output" },
  "no-styled-output": { type: "bool", name: "styled-output", expand: false },
  "mail-rcpt-allowfails": { type: "bool", name: "mail-rcpt-allowfails" },
  "no-mail-rcpt-allowfails": { type: "bool", name: "mail-rcpt-allowfails", expand: false },
  "fail-with-body": { type: "bool", name: "fail-with-body" },
  "no-fail-with-body": { type: "bool", name: "fail-with-body", expand: false },
  "remove-on-error": { type: "bool", name: "remove-on-error" },
  "no-remove-on-error": { type: "bool", name: "remove-on-error", expand: false },
  "form": { type: "string", name: "form" },
  "form-string": { type: "string", name: "form-string" },
  "globoff": { type: "bool", name: "globoff" },
  "no-globoff": { type: "bool", name: "globoff", expand: false },
  "get": { type: "bool", name: "get" },
  "no-get": { type: "bool", name: "get", expand: false },
  "request-target": { type: "string", name: "request-target" },
  "help": { type: "bool", name: "help" },
  "no-help": { type: "bool", name: "help", expand: false },
  "header": { type: "string", name: "header" },
  "proxy-header": { type: "string", name: "proxy-header" },
  "include": { type: "bool", name: "include" },
  "no-include": { type: "bool", name: "include", expand: false },
  "head": { type: "bool", name: "head" },
  "no-head": { type: "bool", name: "head", expand: false },
  "junk-session-cookies": { type: "bool", name: "junk-session-cookies" },
  "no-junk-session-cookies": { type: "bool", name: "junk-session-cookies", expand: false },
  "remote-header-name": { type: "bool", name: "remote-header-name" },
  "no-remote-header-name": { type: "bool", name: "remote-header-name", expand: false },
  "insecure": { type: "bool", name: "insecure" },
  "no-insecure": { type: "bool", name: "insecure", expand: false },
  "doh-insecure": { type: "bool", name: "doh-insecure" },
  "no-doh-insecure": { type: "bool", name: "doh-insecure", expand: false },
  "config": { type: "string", name: "config" },
  "list-only": { type: "bool", name: "list-only" },
  "no-list-only": { type: "bool", name: "list-only", expand: false },
  "location": { type: "bool", name: "location" },
  "no-location": { type: "bool", name: "location", expand: false },
  "location-trusted": { type: "bool", name: "location-trusted" },
  "no-location-trusted": { type: "bool", name: "location-trusted", expand: false },
  "max-time": { type: "string", name: "max-time" },
  "manual": { type: "bool", name: "manual" },
  "no-manual": { type: "bool", name: "manual", expand: false },
  "netrc": { type: "bool", name: "netrc" },
  "no-netrc": { type: "bool", name: "netrc", expand: false },
  "netrc-optional": { type: "bool", name: "netrc-optional" },
  "no-netrc-optional": { type: "bool", name: "netrc-optional", expand: false },
  "netrc-file": { type: "string", name: "netrc-file" },
  "buffer": { type: "bool", name: "buffer" },
  "no-buffer": { type: "bool", name: "buffer", expand: false },
  "output": { type: "string", name: "output" },
  "remote-name": { type: "bool", name: "remote-name" },
  "no-remote-name": { type: "bool", name: "remote-name", expand: false },
  "remote-name-all": { type: "bool", name: "remote-name-all" },
  "no-remote-name-all": { type: "bool", name: "remote-name-all", expand: false },
  "output-dir": { type: "string", name: "output-dir" },
  "clobber": { type: "bool", name: "clobber" },
  "no-clobber": { type: "bool", name: "clobber", expand: false },
  "proxytunnel": { type: "bool", name: "proxytunnel" },
  "no-proxytunnel": { type: "bool", name: "proxytunnel", expand: false },
  "ftp-port": { type: "string", name: "ftp-port" },
  "disable": { type: "bool", name: "disable" },
  "no-disable": { type: "bool", name: "disable", expand: false },
  "quote": { type: "string", name: "quote" },
  "range": { type: "string", name: "range" },
  "remote-time": { type: "bool", name: "remote-time" },
  "no-remote-time": { type: "bool", name: "remote-time", expand: false },
  "silent": { type: "bool", name: "silent" },
  "no-silent": { type: "bool", name: "silent", expand: false },
  "show-error": { type: "bool", name: "show-error" },
  "no-show-error": { type: "bool", name: "show-error", expand: false },
  "telnet-option": { type: "string", name: "telnet-option" },
  "upload-file": { type: "string", name: "upload-file" },
  "user": { type: "string", name: "user" },
  "proxy-user": { type: "string", name: "proxy-user" },
  "verbose": { type: "bool", name: "verbose" },
  "no-verbose": { type: "bool", name: "verbose", expand: false },
  "version": { type: "bool", name: "version" },
  "no-version": { type: "bool", name: "version", expand: false },
  "write-out": { type: "string", name: "write-out" },
  "proxy": { type: "string", name: "proxy" },
  "preproxy": { type: "string", name: "preproxy" },
  "request": { type: "string", name: "request" },
  "speed-limit": { type: "string", name: "speed-limit" },
  "speed-time": { type: "string", name: "speed-time" },
  "time-cond": { type: "string", name: "time-cond" },
  "parallel": { type: "bool", name: "parallel" },
  "no-parallel": { type: "bool", name: "parallel", expand: false },
  "parallel-max": { type: "string", name: "parallel-max" },
  "parallel-immediate": { type: "bool", name: "parallel-immediate" },
  "no-parallel-immediate": { type: "bool", name: "parallel-immediate", expand: false },
  "progress-bar": { type: "bool", name: "progress-bar" },
  "no-progress-bar": { type: "bool", name: "progress-bar", expand: false },
  "progress-meter": { type: "bool", name: "progress-meter" },
  "no-progress-meter": { type: "bool", name: "progress-meter", expand: false },
  "next": { type: "bool", name: "next" },
  // END EXTRACTED OPTIONS


  // These are options that curl used to have.
  // Those that don't conflict with the current options are supported by curlconverter.
  // TODO: curl's --long-options can be shortened.
  // For example if curl used to only have a single option, "--blah" then
  // "--bla" "--bl" and "--b" all used to be valid options as well. If later
  // "--blaz" was added, suddenly those 3 shortened options are removed (because
  // they are now ambiguous).
  // https://github.com/curlconverter/curlconverter/pull/280#issuecomment-931241328
  port: { type: "string", name: "port", removed: "7.3" },

  // These are now shoretened forms of --upload-file and --continue-at
  //upload: { type: "bool", name: "upload", removed: "7.7" },
  //continue: { type: "bool", name: "continue", removed: "7.9" },

  "ftp-ascii": { type: "bool", name: "use-ascii", removed: "7.10.7" },

  "3p-url": { type: "string", name: "3p-url", removed: "7.16.0" },
  "3p-user": { type: "string", name: "3p-user", removed: "7.16.0" },
  "3p-quote": { type: "string", name: "3p-quote", removed: "7.16.0" },

  "http2.0": { type: "bool", name: "http2", removed: "7.36.0" },
  "no-http2.0": { type: "bool", name: "http2", removed: "7.36.0" },

  "telnet-options": { type: "string", name: "telnet-option", removed: "7.49.0" },
  "http-request": { type: "string", name: "request", removed: "7.49.0" },
  // --socks is now an ambiguous shortening of --socks4, --socks5 and a bunch more
  //socks: { type: "string", name: "socks5", removed: "7.49.0" },
  "capath ": { type: "string", name: "capath", removed: "7.49.0" }, // trailing space
  ftpport: { type: "string", name: "ftp-port", removed: "7.49.0" },

  environment: { type: "bool", name: "environment", removed: "7.54.1" },

  // These never had any effect
  "no-tlsv1": { type: "bool", name: "tlsv1", removed: "7.54.1" },
  "no-tlsv1.2": { type: "bool", name: "tlsv1.2", removed: "7.54.1" },
  "no-http2-prior-knowledge": { type: "bool", name: "http2-prior-knowledge", removed: "7.54.1" },
  "no-ipv6": { type: "bool", name: "ipv6", removed: "7.54.1" },
  "no-ipv4": { type: "bool", name: "ipv4", removed: "7.54.1" },
  "no-sslv2": { type: "bool", name: "sslv2", removed: "7.54.1" },
  "no-tlsv1.0": { type: "bool", name: "tlsv1.0", removed: "7.54.1" },
  "no-tlsv1.1": { type: "bool", name: "tlsv1.1", removed: "7.54.1" },
  "no-sslv3": { type: "bool", name: "sslv3", removed: "7.54.1" },
  "no-http1.0": { type: "bool", name: "http1.0", removed: "7.54.1" },
  "no-next": { type: "bool", name: "next", removed: "7.54.1" },
  "no-tlsv1.3": { type: "bool", name: "tlsv1.3", removed: "7.54.1" },
  "no-environment": { type: "bool", name: "environment", removed: "7.54.1" },
  "no-http1.1": { type: "bool", name: "http1.1", removed: "7.54.1" },
  "no-proxy-tlsv1": { type: "bool", name: "proxy-tlsv1", removed: "7.54.1" },
  "no-http2": { type: "bool", name: "http2", removed: "7.54.1" },
} as const;

// curl lets you not type the full argument as long as it's unambiguous.
// So --sil instead of --silent is okay, --s is not.
export const curlLongOptsShortened: { [key: string]: LongShort | null } = {};
for (const [opt, val] of Object.entries(curlLongOpts)) {
  const expand = "expand" in val ? val.expand : true;
  const removed = "removed" in val ? val.removed : false;
  if (expand && !removed) {
    for (let i = 1; i < opt.length; i++) {
      const shortenedOpt = opt.slice(0, i);
      if (
        !Object.prototype.hasOwnProperty.call(
          curlLongOptsShortened,
          shortenedOpt,
        )
      ) {
        if (!Object.prototype.hasOwnProperty.call(curlLongOpts, shortenedOpt)) {
          curlLongOptsShortened[shortenedOpt] = val;
        }
      } else {
        // If more than one option shortens to this, it's ambiguous
        curlLongOptsShortened[shortenedOpt] = null;
      }
    }
  }
}

// Arguments which are supported by all generators, because they're
// easy to implement or because they're handled by upstream code and
// affect something that's easy to implement.
export const COMMON_SUPPORTED_ARGS: string[] = [
  "url",
  "proto-default",
  // Controls whether or not backslash-escaped [] {} will have the backslash removed.
  "globoff",
  // curl will exit if it finds auth credentials in the URL with this option,
  // we remove it from the URL and emit a warning instead.
  "disallow-username-in-url",

  // Method
  "request",
  "get",
  "head",
  "no-head",

  // Headers
  "header", // TODO: can be a file
  "user-agent",
  "referer",
  "range",
  "time-cond",
  "cookie", // TODO: can be a file
  "oauth2-bearer",

  // Basic Auth
  "user",
  "basic",
  "no-basic",
  // Data
  "data",
  "data-raw",
  "data-ascii",
  "data-binary",
  "data-urlencode",
  "json",
  "url-query",

  // TODO: --compressed is already the default for some runtimes, in
  // which case we might have to only warn that --no-compressed isn't supported.
];

export function toBoolean(opt: string): boolean {
  if (opt.startsWith("no-disable-")) {
    return true;
  }
  if (opt.startsWith("disable-") || opt.startsWith("no-")) {
    return false;
  }
  return true;
}

// prettier-ignore
export const curlShortOpts: {
  [key: string]: keyof typeof curlLongOpts
} = {
  // BEGIN EXTRACTED SHORT OPTIONS
  "0": "http1.0",
  "1": "tlsv1",
  "2": "sslv2",
  "3": "sslv3",
  "4": "ipv4",
  "6": "ipv6",
  "a": "append",
  "A": "user-agent",
  "b": "cookie",
  "B": "use-ascii",
  "c": "cookie-jar",
  "C": "continue-at",
  "d": "data",
  "D": "dump-header",
  "e": "referer",
  "E": "cert",
  "f": "fail",
  "F": "form",
  "g": "globoff",
  "G": "get",
  "h": "help",
  "H": "header",
  "i": "include",
  "I": "head",
  "j": "junk-session-cookies",
  "J": "remote-header-name",
  "k": "insecure",
  "K": "config",
  "l": "list-only",
  "L": "location",
  "m": "max-time",
  "M": "manual",
  "n": "netrc",
  "N": "no-buffer",
  "o": "output",
  "O": "remote-name",
  "p": "proxytunnel",
  "P": "ftp-port",
  "q": "disable",
  "Q": "quote",
  "r": "range",
  "R": "remote-time",
  "s": "silent",
  "S": "show-error",
  "t": "telnet-option",
  "T": "upload-file",
  "u": "user",
  "U": "proxy-user",
  "v": "verbose",
  "V": "version",
  "w": "write-out",
  "x": "proxy",
  "X": "request",
  "Y": "speed-limit",
  "y": "speed-time",
  "z": "time-cond",
  "Z": "parallel",
  "#": "progress-bar",
  ":": "next",
  // END EXTRACTED SHORT OPTIONS
} as const;

export const changedShortOpts: ShortOpts = {
  p: "used to be short for --port <port> (a since-deleted flag) until curl 7.3",
  // TODO: some of these might be renamed options
  t: "used to be short for --upload (a since-deleted boolean flag) until curl 7.7",
  c: "used to be short for --continue (a since-deleted boolean flag) until curl 7.9",
  // TODO: did -@ actually work?
  "@": "used to be short for --create-dirs until curl 7.10.7",
  Z: "used to be short for --max-redirs <num> until curl 7.10.7",
  9: "used to be short for --crlf until curl 7.10.8",
  8: "used to be short for --stderr <file> until curl 7.10.8",
  7: "used to be short for --interface <name> until curl 7.10.8",
  6: "used to be short for --krb <level> (which itself used to be --krb4 <level>) until curl 7.10.8",
  // TODO: did these short options ever actually work?
  5: "used to be another way to specify the url until curl 7.10.8",
  "*": "used to be another way to specify the url until curl 7.49.0",
  "~": "used to be short for --xattr until curl 7.49.0",
} as const;

export type SrcFormParam = { value: Word; type: FormType };
export type SrcDataParam = [DataType, Word];

// The keys should be named the same as the curl options that
// set them because they appear in error messages.
export interface OperationConfig {
  request?: Word; // the HTTP method

  // Not the same name as the curl options that set it
  authtype: number;
  proxyauthtype: number;

  json?: boolean;

  // canBeList
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
  // "abstract-unix-socket"?: Word;

  // This needs to be updated any time a new argument is added
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

  // TODO: --npn not supported warning
  // TODO: --metalink disabled warning

  // TODO: remove any.
  // This is difficult because we have curl's arguments but also a couple
  // curlconverter-specific arguments that are handled by the same code.
  [key: string]: any;
}
// type Satisfies<T, U extends T> = void;
// type AssertSubsetKeys = Satisfies<
//   keyof typeof curlLongOpts | "authtype" | "proxyauthtype",
//   keyof OperationConfig
// >;

// These options can be specified more than once, they
// are always returned as a list.
// For all other options, if you specify it more than once
// curl will use the last one.
const canBeList = new Set<keyof OperationConfig>([
  "connect-to",
  "cookie",
  "data",
  "form",
  "header",
  "hsts",
  "mail-rcpt",
  "output",
  "proxy-header",
  "quote",
  "resolve",
  "telnet-option",
  "upload-file",
  "url-query",
  "url",
]);

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
  help?: boolean; // TODO: might use the next word, then curl exits immediately
  config?: Word; // TODO: is it really global?
  silent?: boolean;
  "show-error"?: boolean;
  verbose?: boolean;
  parallel?: boolean;
  "parallel-immediate"?: boolean;
  "parallel-max"?: Word;

  configs: OperationConfig[];
  warnings: Warnings;

  // These are specific to the curlconverter cli
  language?: string;
  stdin?: boolean;
}

function checkSupported(
  global_: GlobalConfig,
  lookup: string,
  longArg: LongShort,
  supportedOpts?: Set<string>,
) {
  if (supportedOpts && !supportedOpts.has(longArg.name)) {
    // TODO: better message. include generator name?
    warnf(global_, [
      longArg.name,
      lookup +
        " is not a supported option" +
        (longArg.removed ? ", it was removed in curl " + longArg.removed : ""),
    ]);
  }
}

export function pushProp<Type>(
  obj: { [key: string]: Type[] },
  prop: string,
  value: Type,
) {
  if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
    obj[prop] = [];
  }
  obj[prop].push(value);
  return obj;
}

function pushArgValue(
  global_: GlobalConfig,
  config: OperationConfig,
  argName: string,
  value: Word,
) {
  // Note: cli.ts assumes that the property names on OperationConfig
  // are the same as the passed in argument in an error message, so
  // if you do something like
  // echo curl example.com | curlconverter - --data-raw foo
  // The error message will say
  // "if you pass --stdin or -, you can't also pass --data"
  // instead of "--data-raw".
  switch (argName) {
    case "data":
    case "data-ascii":
      return pushProp(config, "data", ["data", value]);
    case "data-binary":
      return pushProp(config, "data", [
        // Unless it's a file, --data-binary works the same as --data
        value.startsWith("@") ? "binary" : "data",
        value,
      ]);
    case "data-raw":
      return pushProp(config, "data", [
        // Unless it's a file, --data-raw works the same as --data
        value.startsWith("@") ? "raw" : "data",
        value,
      ]);
    case "data-urlencode":
      return pushProp(config, "data", ["urlencode", value]);
    case "json":
      config.json = true;
      return pushProp(config, "data", ["json", value]);
    case "url-query":
      if (value.startsWith("+")) {
        return pushProp(config, "url-query", ["raw", value.slice(1)]);
      }
      return pushProp(config, "url-query", ["urlencode", value]);

    case "form":
      return pushProp(config, "form", { value, type: "form" });
    case "form-string":
      return pushProp(config, "form", { value, type: "string" });

    case "aws-sigv4":
      config.authtype |= CURLAUTH_AWS_SIGV4;
      break;
    case "oauth2-bearer":
      config.authtype |= CURLAUTH_BEARER;
      break;

    case "unix-socket":
    case "abstract-unix-socket":
      // Ignore distinction
      // TODO: this makes the error message wrong
      // TODO: what's the difference?
      pushProp(config, "unix-socket", value);
      break;

    case "trace":
    case "trace-ascii":
    case "stderr":
    case "libcurl":
    case "config":
    case "parallel-max":
      global_[argName] = value;
      break;

    case "language": // --language is a curlconverter specific option
      global_[argName] = value.toString();
      return;
  }

  return pushProp(config, argName, value);
}

// Might create a new config
function setArgValue(
  global_: GlobalConfig,
  config: OperationConfig,
  argName: string,
  toggle: boolean,
): OperationConfig {
  switch (argName) {
    case "digest":
      if (toggle) {
        config.authtype |= CURLAUTH_DIGEST;
      } else {
        config.authtype &= ~CURLAUTH_DIGEST;
      }
      break;
    case "proxy-digest":
      if (toggle) {
        config.proxyauthtype |= CURLAUTH_DIGEST;
      } else {
        config.proxyauthtype &= ~CURLAUTH_DIGEST;
      }
      break;
    case "negotiate":
      if (toggle) {
        config.authtype |= CURLAUTH_NEGOTIATE;
      } else {
        config.authtype &= ~CURLAUTH_NEGOTIATE;
      }
      break;
    case "proxy-negotiate":
      if (toggle) {
        config.proxyauthtype |= CURLAUTH_NEGOTIATE;
      } else {
        config.proxyauthtype &= ~CURLAUTH_NEGOTIATE;
      }
      break;
    case "ntlm":
      if (toggle) {
        config.authtype |= CURLAUTH_NTLM;
      } else {
        config.authtype &= ~CURLAUTH_NTLM;
      }
      break;
    case "proxy-ntlm":
      if (toggle) {
        config.proxyauthtype |= CURLAUTH_NTLM;
      } else {
        config.proxyauthtype &= ~CURLAUTH_NTLM;
      }
      break;
    case "ntlm-wb":
      if (toggle) {
        config.authtype |= CURLAUTH_NTLM_WB;
      } else {
        config.authtype &= ~CURLAUTH_NTLM_WB;
      }
      break;
    case "basic":
      if (toggle) {
        config.authtype |= CURLAUTH_BASIC;
      } else {
        config.authtype &= ~CURLAUTH_BASIC;
      }
      break;
    case "proxy-basic":
      if (toggle) {
        config.proxyauthtype |= CURLAUTH_BASIC;
      } else {
        config.proxyauthtype &= ~CURLAUTH_BASIC;
      }
      break;
    case "anyauth":
      if (toggle) {
        config.authtype = CURLAUTH_ANY;
      }
      break;
    case "proxy-anyauth":
      if (toggle) {
        config.proxyauthtype = CURLAUTH_ANY;
      }
      break;
    case "location":
      config["location"] = toggle;
      break;
    case "location-trusted":
      config["location"] = toggle;
      config["location-trusted"] = toggle;
      break;
    case "http1.0":
      config.httpVersion = "1.0";
      break;
    case "http1.1":
      config.httpVersion = "1.1";
      break;
    case "http2":
      config.httpVersion = "2";
      break;
    case "http2-prior-knowledge":
      config.httpVersion = "2-prior-knowledge";
      break;
    case "http3":
      config.httpVersion = "3";
      break;
    case "http3-only":
      config.httpVersion = "3-only";
      break;
    case "tlsv1":
      config.tlsVersion = "1";
      break;
    case "tlsv1.0":
      config.tlsVersion = "1.0";
      break;
    case "tlsv1.1":
      config.tlsVersion = "1.1";
      break;
    case "tlsv1.2":
      config.tlsVersion = "1.2";
      break;
    case "tlsv1.3":
      config.tlsVersion = "1.3";
      break;
    case "verbose":
    case "version":
    case "trace-time":
    case "test-event":
    case "progress-bar":
    case "progress-meter":
    case "fail-early":
    case "styled-output":
    case "help":
    case "silent":
    case "show-error":
    case "parallel":
    case "parallel-immediate":
    case "stdin": // --stdin or - is a curlconverter specific option
      global_[argName] = toggle;
      break;
    case "next":
      // curl ignores --next if the last url node doesn't have a url
      if (
        toggle &&
        config.url &&
        config.url.length > 0 &&
        config.url.length >= (config["upload-file"] || []).length &&
        config.url.length >= (config.output || []).length
      ) {
        config = { authtype: CURLAUTH_BASIC, proxyauthtype: CURLAUTH_BASIC };
        global_.configs.push(config);
      }
      break;
    default:
      config[argName] = toggle;
  }
  return config;
}

export function parseArgs(
  args: Word[],
  longOpts: LongOpts = curlLongOpts,
  shortenedLongOpts: LongOpts = curlLongOptsShortened,
  shortOpts: ShortOpts = curlShortOpts,
  supportedOpts?: Set<string>,
  warnings: Warnings = [],
): [GlobalConfig, [string, string][]] {
  let config: OperationConfig = {
    authtype: CURLAUTH_BASIC,
    proxyauthtype: CURLAUTH_BASIC,
  };
  const global_: GlobalConfig = { configs: [config], warnings };
  const seen: [string, string][] = [];

  for (let i = 1, stillflags = true; i < args.length; i++) {
    const arg: Word = args[i];
    if (stillflags && arg.startsWith("-")) {
      if (eq(arg, "--")) {
        /* This indicates the end of the flags and thus enables the
           following (URL) argument to start with -. */
        stillflags = false;
      } else if (arg.startsWith("--")) {
        const shellToken = firstShellToken(arg);
        if (shellToken) {
          // TODO: if there's any text after the "--" or after the variable
          // we could narrow it down.
          throw new CCError(
            "this " +
              shellToken.type +
              " could " +
              (shellToken.type === "command" ? "return" : "be") +
              " anything\n" +
              underlineNode(shellToken.syntaxNode),
          );
        }
        const argStr = arg.toString();

        const lookup = argStr.slice(2);
        let longArg = shortenedLongOpts[lookup];
        if (typeof longArg === "undefined") {
          longArg = longOpts[lookup];
        }

        if (longArg === null) {
          throw new CCError("option " + argStr + ": is ambiguous");
        }
        if (typeof longArg === "undefined") {
          // TODO: extract a list of deleted arguments to check here
          throw new CCError("option " + argStr + ": is unknown");
        }

        if (longArg.type === "string") {
          i++;
          if (i >= args.length) {
            throw new CCError("option " + argStr + ": requires parameter");
          }
          pushArgValue(global_, config, longArg.name, args[i]);
        } else {
          config = setArgValue(
            global_,
            config,
            longArg.name,
            toBoolean(argStr.slice(2)),
          ); // TODO: all shortened args work correctly?
        }

        checkSupported(global_, argStr, longArg, supportedOpts);
        seen.push([longArg.name, argStr]);
      } else {
        // Short option. These can look like
        // -X POST    -> {request: 'POST'}
        // or
        // -XPOST     -> {request: 'POST'}
        // or multiple options
        // -ABCX POST -> {A: true, B: true, C: true, request: 'POST'}
        // or multiple options and a value for the last one
        // -ABCXPOST  -> {A: true, B: true, C: true, request: 'POST'}

        // "-" passed to curl as an argument raises an error,
        // curlconverter's command line uses it to read from stdin
        if (arg.length === 1) {
          if (Object.prototype.hasOwnProperty.call(shortOpts, "")) {
            const shortFor: string = shortOpts[""];
            const longArg = longOpts[shortFor];
            if (longArg === null) {
              throw new CCError("option -: is unknown");
            }
            config = setArgValue(
              global_,
              config,
              longArg.name,
              toBoolean(shortFor),
            );
            seen.push([longArg.name, "-"]);
          } else {
            throw new CCError("option -: is unknown");
          }
        }

        for (let j = 1; j < arg.length; j++) {
          const jthChar = arg.get(j);
          if (typeof jthChar !== "string") {
            // A bash variable in the middle of a short option
            throw new CCError(
              "this " +
                jthChar.type +
                " could " +
                (jthChar.type === "command" ? "return" : "be") +
                " anything\n" +
                underlineNode(jthChar.syntaxNode),
            );
          }
          if (!has(shortOpts, jthChar)) {
            if (has(changedShortOpts, jthChar)) {
              throw new CCError(
                "option " + arg + ": " + changedShortOpts[jthChar],
              );
            }
            // TODO: there are a few deleted short options we could report
            throw new CCError("option " + arg + ": is unknown");
          }
          const lookup = jthChar;
          const shortFor = shortOpts[lookup];
          const longArg = longOpts[shortFor];
          if (longArg === null) {
            // This could happen if curlShortOpts points to a renamed option or has a typo
            throw new CCError("ambiguous short option -" + jthChar);
          }
          if (longArg.type === "string") {
            let val;
            if (j + 1 < arg.length) {
              // treat -XPOST as -X POST
              val = arg.slice(j + 1);
              j = arg.length;
            } else if (i + 1 < args.length) {
              i++;
              val = args[i];
            } else {
              throw new CCError(
                "option " + arg.toString() + ": requires parameter",
              );
            }
            pushArgValue(global_, config, longArg.name, val);
          } else {
            // Use shortFor because -N is short for --no-buffer
            // and we want to end up with {buffer: false}
            config = setArgValue(
              global_,
              config,
              longArg.name,
              toBoolean(shortFor),
            );
          }
          if (lookup) {
            checkSupported(global_, "-" + lookup, longArg, supportedOpts);
            seen.push([longArg.name, "-" + lookup]);
          }
        }
      }
    } else {
      if (
        typeof arg !== "string" &&
        arg.tokens.length &&
        typeof arg.tokens[0] !== "string"
      ) {
        const isOrBeginsWith = arg.tokens.length === 1 ? "is" : "begins with";
        warnings.push([
          "ambiguous argument",
          "argument " +
            isOrBeginsWith +
            " a " +
            arg.tokens[0].type +
            ", assuming it's a URL\n" +
            underlineNode(arg.tokens[0].syntaxNode),
        ]);
      }
      pushArgValue(global_, config, "url", arg);
      seen.push(["url", "--url"]);
    }
  }

  for (const cfg of global_.configs) {
    for (const [arg, values] of Object.entries(cfg)) {
      if (Array.isArray(values) && !canBeList.has(arg)) {
        cfg[arg] = values[values.length - 1];
      }
    }
  }
  return [global_, seen];
}
