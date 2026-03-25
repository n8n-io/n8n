# limiter #

[![Build Status](https://travis-ci.org/jhurliman/node-rate-limiter.png)](https://travis-ci.org/jhurliman/node-rate-limiter)
[![NPM Downloads](https://img.shields.io/npm/dm/limiter.svg?style=flat)](https://www.npmjs.com/package/limiter)

Provides a generic rate limiter for node.js. Useful for API clients, web 
crawling, or other tasks that need to be throttled. Two classes are exposed, 
RateLimiter and TokenBucket. TokenBucket provides a lower level interface to 
rate limiting with a configurable burst rate and drip rate. RateLimiter sits 
on top of the token bucket and adds a restriction on the maximum number of 
tokens that can be removed each interval to comply with common API 
restrictions like "150 requests per hour maximum".

## Installation ##

Use NPM to install:

    npm install limiter

## Usage ##

A simple example allowing 150 requests per hour:

```javascript
var RateLimiter = require('limiter').RateLimiter;
// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
var limiter = new RateLimiter(150, 'hour');

// Throttle requests
limiter.removeTokens(1, function(err, remainingRequests) {
  // err will only be set if we request more than the maximum number of
  // requests we set in the constructor
  
  // remainingRequests tells us how many additional requests could be sent
  // right this moment
  
  callMyRequestSendingFunction(...);
});
```

Another example allowing one message to be sent every 250ms:

```javascript
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 250);

limiter.removeTokens(1, function() {
  callMyMessageSendingFunction(...);
});
```

The default behaviour is to wait for the duration of the rate limiting
that’s currently in effect before the callback is fired, but if you 
pass in ```true``` as the third parameter, the callback will be fired 
immediately with remainingRequests set to -1:

```javascript
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(150, 'hour', true);  // fire CB immediately

// Immediately send 429 header to client when rate limiting is in effect
limiter.removeTokens(1, function(err, remainingRequests) {
  if (remainingRequests < 1) {
    response.writeHead(429, {'Content-Type': 'text/plain;charset=UTF-8'});
    response.end('429 Too Many Requests - your IP is being rate limited');
  } else {
    callMyMessageSendingFunction(...);
  }
});
```

A synchronous method, tryRemoveTokens(), is available in both RateLimiter and TokenBucket. This will return immediately with a boolean value indicating if the token removal was successful.
```javascript
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(10, 'second');

if (limiter.tryRemoveTokens(5))
  console.log('Tokens removed');
else
  console.log('No tokens removed');
```

To get the number of remaining tokens **outside** the `removeTokens`-callback
simply use the `getTokensRemaining`-method.
```javascript
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 250);

// returns 1 since we did not remove a token and our number of tokens per interval is 1
limiter.getTokensRemaining();
```

Using the token bucket directly to throttle at the byte level:

```javascript
var BURST_RATE = 1024 * 1024 * 150; // 150KB/sec burst rate
var FILL_RATE = 1024 * 1024 * 50; // 50KB/sec sustained rate
var TokenBucket = require('limiter').TokenBucket;
// We could also pass a parent token bucket in as the last parameter to
// create a hierarchical token bucket
var bucket = new TokenBucket(BURST_RATE, FILL_RATE, 'second', null);

bucket.removeTokens(myData.byteLength, function() {
  sendMyData(myData);
});
```

## Additional Notes ##

Both the token bucket and rate limiter should be used with a message queue or 
some way of preventing multiple simultaneous calls to removeTokens(). 
Otherwise, earlier messages may get held up for long periods of time if more 
recent messages are continually draining the token bucket. This can lead to 
out of order messages or the appearance of "lost" messages under heavy load.

## License ##

(The MIT License)

Copyright (c) 2013 John Hurliman. &lt;jhurliman@jhurliman.org&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
