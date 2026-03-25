# agentkeepalive

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![Node.js CI](https://github.com/node-modules/agentkeepalive/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/agentkeepalive/actions/workflows/nodejs.yml)
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/agentkeepalive.svg?style=flat
[npm-url]: https://npmjs.org/package/agentkeepalive
[snyk-image]: https://snyk.io/test/npm/agentkeepalive/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/agentkeepalive
[download-image]: https://img.shields.io/npm/dm/agentkeepalive.svg?style=flat-square
[download-url]: https://npmjs.org/package/agentkeepalive

The enhancement features `keep alive` `http.Agent`. Support `http` and `https`.

## What's different from original `http.Agent`?

- `keepAlive=true` by default
- Disable Nagle's algorithm: `socket.setNoDelay(true)`
- Add free socket timeout: avoid long time inactivity socket leak in the free-sockets queue.
- Add active socket timeout: avoid long time inactivity socket leak in the active-sockets queue.
- TTL for active socket.

## Node.js version required

Support Node.js >= `8.0.0`

## Install

```bash
$ npm install agentkeepalive --save
```

## new Agent([options])

* `options` {Object} Set of configurable options to set on the agent.
  Can have the following fields:
  * `keepAlive` {Boolean} Keep sockets around in a pool to be used by
    other requests in the future. Default = `true`.
  * `keepAliveMsecs` {Number} When using the keepAlive option, specifies the initial delay
    for TCP Keep-Alive packets. Ignored when the keepAlive option is false or undefined. Defaults to 1000.
    Default = `1000`.  Only relevant if `keepAlive` is set to `true`.
  * `freeSocketTimeout`: {Number} Sets the free socket to timeout
    after `freeSocketTimeout` milliseconds of inactivity on the free socket.
    The default [server-side timeout](https://nodejs.org/api/http.html#serverkeepalivetimeout) is 5000 milliseconds, to [avoid ECONNRESET exceptions](https://medium.com/ssense-tech/reduce-networking-errors-in-nodejs-23b4eb9f2d83), we set the default value to `4000` milliseconds.
    Only relevant if `keepAlive` is set to `true`.
  * `timeout`: {Number} Sets the working socket to timeout
    after `timeout` milliseconds of inactivity on the working socket.
    Default is `freeSocketTimeout * 2` so long as that value is greater than or equal to 8 seconds, otherwise the default is 8 seconds.
  * `maxSockets` {Number} Maximum number of sockets to allow per
    host. Default = `Infinity`.
  * `maxFreeSockets` {Number} Maximum number of sockets (per host) to leave open
    in a free state. Only relevant if `keepAlive` is set to `true`.
    Default = `256`.
  * `socketActiveTTL` {Number} Sets the socket active time to live, even if it's in use.
    If not set, the behaviour keeps the same (the socket will be released only when free)
    Default = `null`.

## Usage

```js
const http = require('http');
const HttpAgent = require('agentkeepalive').HttpAgent;

const keepaliveAgent = new HttpAgent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});

const options = {
  host: 'cnodejs.org',
  port: 80,
  path: '/',
  method: 'GET',
  agent: keepaliveAgent,
};

const req = http.request(options, res => {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
  });
});
req.on('error', e => {
  console.log('problem with request: ' + e.message);
});
req.end();

setTimeout(() => {
  if (keepaliveAgent.statusChanged) {
    console.log('[%s] agent status changed: %j', Date(), keepaliveAgent.getCurrentStatus());
  }
}, 2000);

```

### `getter agent.statusChanged`

counters have change or not after last checkpoint.

### `agent.getCurrentStatus()`

`agent.getCurrentStatus()` will return a object to show the status of this agent:

```js
{
  createSocketCount: 10,
  closeSocketCount: 5,
  timeoutSocketCount: 0,
  requestCount: 5,
  freeSockets: { 'localhost:57479:': 3 },
  sockets: { 'localhost:57479:': 5 },
  requests: {}
}
```

### Support `https`

```js
const https = require('https');
const HttpsAgent = require('agentkeepalive').HttpsAgent;

const keepaliveAgent = new HttpsAgent();
// https://www.google.com/search?q=nodejs&sugexp=chrome,mod=12&sourceid=chrome&ie=UTF-8
const options = {
  host: 'www.google.com',
  port: 443,
  path: '/search?q=nodejs&sugexp=chrome,mod=12&sourceid=chrome&ie=UTF-8',
  method: 'GET',
  agent: keepaliveAgent,
};

const req = https.request(options, res => {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', chunk => {
    console.log('BODY: ' + chunk);
  });
});

req.on('error', e => {
  console.log('problem with request: ' + e.message);
});
req.end();

setTimeout(() => {
  console.log('agent status: %j', keepaliveAgent.getCurrentStatus());
}, 2000);
```

### Support `req.reusedSocket`

This agent implements the `req.reusedSocket` to determine whether a request is send through a reused socket.

When server closes connection at unfortunate time ([keep-alive race](https://code-examples.net/en/q/28a8069)), the http client will throw a `ECONNRESET` error. Under this circumstance, `req.reusedSocket` is useful when we want to retry the request automatically.

```js
const http = require('http');
const HttpAgent = require('agentkeepalive').HttpAgent;
const agent = new HttpAgent();

const req = http
  .get('http://localhost:3000', { agent }, (res) => {
    // ...
  })
  .on('error', (err) => {
    if (req.reusedSocket && err.code === 'ECONNRESET') {
      // retry the request or anything else...
    }
  })
```

This behavior is consistent with Node.js core. But through `agentkeepalive`, you can use this feature in older Node.js version.

## [Benchmark](https://github.com/node-modules/agentkeepalive/tree/master/benchmark)

run the benchmark:

```bash
cd benchmark
sh start.sh
```

Intel(R) Core(TM)2 Duo CPU     P8600  @ 2.40GHz

node@v0.8.9

50 maxSockets, 60 concurrent, 1000 requests per concurrent, 5ms delay

Keep alive agent (30 seconds):

```js
Transactions:          60000 hits
Availability:         100.00 %
Elapsed time:          29.70 secs
Data transferred:        14.88 MB
Response time:            0.03 secs
Transaction rate:      2020.20 trans/sec
Throughput:           0.50 MB/sec
Concurrency:           59.84
Successful transactions:       60000
Failed transactions:             0
Longest transaction:          0.15
Shortest transaction:         0.01
```

Normal agent:

```js
Transactions:          60000 hits
Availability:         100.00 %
Elapsed time:          46.53 secs
Data transferred:        14.88 MB
Response time:            0.05 secs
Transaction rate:      1289.49 trans/sec
Throughput:           0.32 MB/sec
Concurrency:           59.81
Successful transactions:       60000
Failed transactions:             0
Longest transaction:          0.45
Shortest transaction:         0.00
```

Socket created:

```bash
[proxy.js:120000] keepalive, 50 created, 60000 requestFinished, 1200 req/socket, 0 requests, 0 sockets, 0 unusedSockets, 50 timeout
{" <10ms":662," <15ms":17825," <20ms":20552," <30ms":17646," <40ms":2315," <50ms":567," <100ms":377," <150ms":56," <200ms":0," >=200ms+":0}
----------------------------------------------------------------
[proxy.js:120000] normal   , 53866 created, 84260 requestFinished, 1.56 req/socket, 0 requests, 0 sockets
{" <10ms":75," <15ms":1112," <20ms":10947," <30ms":32130," <40ms":8228," <50ms":3002," <100ms":4274," <150ms":181," <200ms":18," >=200ms+":33}
```

## License

[MIT](LICENSE)

<!-- GITCONTRIBUTOR_START -->

## Contributors

|[<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/>|[<img src="https://avatars.githubusercontent.com/u/985607?v=4" width="100px;"/><br/><sub><b>dead-horse</b></sub>](https://github.com/dead-horse)<br/>|[<img src="https://avatars.githubusercontent.com/u/5557458?v=4" width="100px;"/><br/><sub><b>AndrewLeedham</b></sub>](https://github.com/AndrewLeedham)<br/>|[<img src="https://avatars.githubusercontent.com/u/5243774?v=4" width="100px;"/><br/><sub><b>ngot</b></sub>](https://github.com/ngot)<br/>|[<img src="https://avatars.githubusercontent.com/u/25919630?v=4" width="100px;"/><br/><sub><b>wrynearson</b></sub>](https://github.com/wrynearson)<br/>|[<img src="https://avatars.githubusercontent.com/u/26738844?v=4" width="100px;"/><br/><sub><b>aaronArinder</b></sub>](https://github.com/aaronArinder)<br/>|
| :---: | :---: | :---: | :---: | :---: | :---: |
|[<img src="https://avatars.githubusercontent.com/u/10976983?v=4" width="100px;"/><br/><sub><b>alexpenev-s</b></sub>](https://github.com/alexpenev-s)<br/>|[<img src="https://avatars.githubusercontent.com/u/959726?v=4" width="100px;"/><br/><sub><b>blemoine</b></sub>](https://github.com/blemoine)<br/>|[<img src="https://avatars.githubusercontent.com/u/398027?v=4" width="100px;"/><br/><sub><b>bdehamer</b></sub>](https://github.com/bdehamer)<br/>|[<img src="https://avatars.githubusercontent.com/u/4985201?v=4" width="100px;"/><br/><sub><b>DylanPiercey</b></sub>](https://github.com/DylanPiercey)<br/>|[<img src="https://avatars.githubusercontent.com/u/3770250?v=4" width="100px;"/><br/><sub><b>cixel</b></sub>](https://github.com/cixel)<br/>|[<img src="https://avatars.githubusercontent.com/u/2883231?v=4" width="100px;"/><br/><sub><b>HerringtonDarkholme</b></sub>](https://github.com/HerringtonDarkholme)<br/>|
|[<img src="https://avatars.githubusercontent.com/u/1433247?v=4" width="100px;"/><br/><sub><b>denghongcai</b></sub>](https://github.com/denghongcai)<br/>|[<img src="https://avatars.githubusercontent.com/u/1847934?v=4" width="100px;"/><br/><sub><b>kibertoad</b></sub>](https://github.com/kibertoad)<br/>|[<img src="https://avatars.githubusercontent.com/u/5236150?v=4" width="100px;"/><br/><sub><b>pangorgo</b></sub>](https://github.com/pangorgo)<br/>|[<img src="https://avatars.githubusercontent.com/u/588898?v=4" width="100px;"/><br/><sub><b>mattiash</b></sub>](https://github.com/mattiash)<br/>|[<img src="https://avatars.githubusercontent.com/u/182440?v=4" width="100px;"/><br/><sub><b>nabeelbukhari</b></sub>](https://github.com/nabeelbukhari)<br/>|[<img src="https://avatars.githubusercontent.com/u/1411117?v=4" width="100px;"/><br/><sub><b>pmalouin</b></sub>](https://github.com/pmalouin)<br/>|
[<img src="https://avatars.githubusercontent.com/u/1404810?v=4" width="100px;"/><br/><sub><b>SimenB</b></sub>](https://github.com/SimenB)<br/>|[<img src="https://avatars.githubusercontent.com/u/2630384?v=4" width="100px;"/><br/><sub><b>vinaybedre</b></sub>](https://github.com/vinaybedre)<br/>|[<img src="https://avatars.githubusercontent.com/u/10933333?v=4" width="100px;"/><br/><sub><b>starkwang</b></sub>](https://github.com/starkwang)<br/>|[<img src="https://avatars.githubusercontent.com/u/6897780?v=4" width="100px;"/><br/><sub><b>killagu</b></sub>](https://github.com/killagu)<br/>|[<img src="https://avatars.githubusercontent.com/u/15345331?v=4" width="100px;"/><br/><sub><b>tony-gutierrez</b></sub>](https://github.com/tony-gutierrez)<br/>|[<img src="https://avatars.githubusercontent.com/u/5856440?v=4" width="100px;"/><br/><sub><b>whxaxes</b></sub>](https://github.com/whxaxes)<br/>

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Sat Aug 05 2023 02:36:31 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
