# fast-uri

<div align="center">

[![NPM version](https://img.shields.io/npm/v/fast-uri.svg?style=flat)](https://www.npmjs.com/package/fast-uri)
[![CI](https://github.com/fastify/fast-uri/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/fast-uri/actions/workflows/ci.yml)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

</div>

Dependency-free RFC 3986 URI toolbox.

## Usage

## Options

All of the above functions can accept an additional options argument that is an object that can contain one or more of the following properties:

*	`scheme` (string)
	Indicates the scheme that the URI should be treated as, overriding the URI's normal scheme parsing behavior.

*	`reference` (string)
	If set to `"suffix"`, it indicates that the URI is in the suffix format and the parser will use the option's `scheme` property to determine the URI's scheme.

*	`tolerant` (boolean, false)
	If set to `true`, the parser will relax URI resolving rules.

*	`absolutePath` (boolean, false)
	If set to `true`, the serializer will not resolve a relative `path` component.

*	`unicodeSupport` (boolean, false)
	If set to `true`, the parser will unescape non-ASCII characters in the parsed output as per [RFC 3987](http://www.ietf.org/rfc/rfc3987.txt).

*	`domainHost` (boolean, false)
	If set to `true`, the library will treat the `host` component as a domain name, and convert IDNs (International Domain Names) as per [RFC 5891](http://www.ietf.org/rfc/rfc5891.txt).

### Parse

```js
const uri = require('fast-uri')
uri.parse('uri://user:pass@example.com:123/one/two.three?q1=a1&q2=a2#body')
// Output
{
  scheme: "uri",
  userinfo: "user:pass",
  host: "example.com",
  port: 123,
  path: "/one/two.three",
  query: "q1=a1&q2=a2",
  fragment: "body"
}
```

### Serialize

```js
const uri = require('fast-uri')
uri.serialize({scheme: "http", host: "example.com", fragment: "footer"})
// Output
"http://example.com/#footer"

```

### Resolve

```js
const uri = require('fast-uri')
uri.resolve("uri://a/b/c/d?q", "../../g")
// Output
"uri://a/g"
```

### Equal

```js
const uri = require('fast-uri')
uri.equal("example://a/b/c/%7Bfoo%7D", "eXAMPLE://a/./b/../b/%63/%7bfoo%7d")
// Output
true
```

## Scheme supports

fast-uri supports inserting custom [scheme](http://en.wikipedia.org/wiki/URI_scheme)-dependent processing rules. Currently, fast-uri has built-in support for the following schemes:

*	http \[[RFC 2616](http://www.ietf.org/rfc/rfc2616.txt)\]
*	https \[[RFC 2818](http://www.ietf.org/rfc/rfc2818.txt)\]
*	ws \[[RFC 6455](http://www.ietf.org/rfc/rfc6455.txt)\]
*	wss \[[RFC 6455](http://www.ietf.org/rfc/rfc6455.txt)\]
*	urn \[[RFC 2141](http://www.ietf.org/rfc/rfc2141.txt)\]
*	urn:uuid \[[RFC 4122](http://www.ietf.org/rfc/rfc4122.txt)\]


## Benchmarks

```
fast-uri benchmark
┌─────────┬──────────────────────────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                                │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼──────────────────────────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'fast-uri: parse domain'                 │ '951.31 ± 0.75%' │ '875.00 ± 11.00' │ '1122538 ± 0.01%'      │ '1142857 ± 14550'      │ 1051187 │
│ 1       │ 'fast-uri: parse IPv4'                   │ '443.44 ± 0.22%' │ '406.00 ± 3.00'  │ '2422762 ± 0.01%'      │ '2463054 ± 18335'      │ 2255105 │
│ 2       │ 'fast-uri: parse IPv6'                   │ '1241.6 ± 1.74%' │ '1131.0 ± 30.00' │ '875177 ± 0.02%'       │ '884173 ± 24092'       │ 805399  │
│ 3       │ 'fast-uri: parse URN'                    │ '689.19 ± 4.29%' │ '618.00 ± 9.00'  │ '1598373 ± 0.01%'      │ '1618123 ± 23913'      │ 1450972 │
│ 4       │ 'fast-uri: parse URN uuid'               │ '1025.4 ± 2.02%' │ '921.00 ± 19.00' │ '1072419 ± 0.02%'      │ '1085776 ± 22871'      │ 975236  │
│ 5       │ 'fast-uri: serialize uri'                │ '1028.5 ± 0.53%' │ '933.00 ± 43.00' │ '1063310 ± 0.02%'      │ '1071811 ± 50523'      │ 972249  │
│ 6       │ 'fast-uri: serialize long uri with dots' │ '1805.1 ± 0.52%' │ '1627.0 ± 17.00' │ '602620 ± 0.02%'       │ '614628 ± 6490'        │ 553997  │
│ 7       │ 'fast-uri: serialize IPv6'               │ '2569.4 ± 2.69%' │ '2302.0 ± 21.00' │ '426080 ± 0.03%'       │ '434405 ± 3999'        │ 389194  │
│ 8       │ 'fast-uri: serialize ws'                 │ '979.39 ± 0.43%' │ '882.00 ± 8.00'  │ '1111665 ± 0.02%'      │ '1133787 ± 10378'      │ 1021045 │
│ 9       │ 'fast-uri: resolve'                      │ '2208.2 ± 1.08%' │ '1980.0 ± 24.00' │ '495001 ± 0.03%'       │ '505051 ± 6049'        │ 452848  │
└─────────┴──────────────────────────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘
uri-js benchmark
┌─────────┬───────────────────────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                             │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼───────────────────────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'urijs: parse domain'                 │ '3618.3 ± 0.43%' │ '3314.0 ± 33.00' │ '294875 ± 0.04%'       │ '301750 ± 2975'        │ 276375  │
│ 1       │ 'urijs: parse IPv4'                   │ '4024.1 ± 0.41%' │ '3751.0 ± 25.00' │ '261981 ± 0.04%'       │ '266596 ± 1789'        │ 248506  │
│ 2       │ 'urijs: parse IPv6'                   │ '5417.2 ± 0.46%' │ '4968.0 ± 43.00' │ '196023 ± 0.05%'       │ '201288 ± 1727'        │ 184598  │
│ 3       │ 'urijs: parse URN'                    │ '1324.2 ± 0.23%' │ '1229.0 ± 17.00' │ '801535 ± 0.02%'       │ '813670 ± 11413'       │ 755185  │
│ 4       │ 'urijs: parse URN uuid'               │ '1822.0 ± 3.08%' │ '1655.0 ± 15.00' │ '594433 ± 0.02%'       │ '604230 ± 5427'        │ 548843  │
│ 5       │ 'urijs: serialize uri'                │ '4196.8 ± 0.36%' │ '3908.0 ± 27.00' │ '251146 ± 0.04%'       │ '255885 ± 1756'        │ 238276  │
│ 6       │ 'urijs: serialize long uri with dots' │ '8331.0 ± 1.30%' │ '7658.0 ± 72.00' │ '126440 ± 0.07%'       │ '130582 ± 1239'        │ 120034  │
│ 7       │ 'urijs: serialize IPv6'               │ '5685.5 ± 0.30%' │ '5366.0 ± 33.00' │ '182632 ± 0.05%'       │ '186359 ± 1153'        │ 175886  │
│ 8       │ 'urijs: serialize ws'                 │ '4159.3 ± 0.20%' │ '3899.0 ± 28.00' │ '250459 ± 0.04%'       │ '256476 ± 1855'        │ 240423  │
│ 9       │ 'urijs: resolve'                      │ '6729.9 ± 0.39%' │ '6261.0 ± 37.00' │ '156361 ± 0.06%'       │ '159719 ± 949'         │ 148591  │
└─────────┴───────────────────────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘
WHATWG URL benchmark
┌─────────┬────────────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                  │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼────────────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'WHATWG URL: parse domain' │ '475.22 ± 0.20%' │ '444.00 ± 5.00'  │ '2217599 ± 0.01%'      │ '2252252 ± 25652'      │ 2104289 │
│ 1       │ 'WHATWG URL: parse URN'    │ '384.78 ± 0.85%' │ '350.00 ± 5.00'  │ '2809071 ± 0.01%'      │ '2857143 ± 41408'      │ 2598885 │
└─────────┴────────────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘
```

## TODO

- [ ] Support MailTo
- [ ] Be 100% iso compatible with uri-js

## License

Licensed under [BSD-3-Clause](./LICENSE).
