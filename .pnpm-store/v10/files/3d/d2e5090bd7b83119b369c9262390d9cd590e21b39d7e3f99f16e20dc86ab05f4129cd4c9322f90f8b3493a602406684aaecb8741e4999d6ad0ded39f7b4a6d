aws4
----

[![Build Status](https://api.travis-ci.org/mhart/aws4.png?branch=master)](https://travis-ci.org/github/mhart/aws4)

A small utility to sign vanilla Node.js http(s) request options using Amazon's
[AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html).

If you want to sign and send AWS requests in a modern browser, or an environment like [Cloudflare Workers](https://developers.cloudflare.com/workers/), then check out [aws4fetch](https://github.com/mhart/aws4fetch) – otherwise you can also bundle this library for use [in older browsers](./browser).

The only AWS service that *doesn't* support v4 as of 2020-05-22 is
[SimpleDB](https://docs.aws.amazon.com/AmazonSimpleDB/latest/DeveloperGuide/SDB_API.html)
(it only supports [AWS Signature Version 2](https://github.com/mhart/aws2)).

It also provides defaults for a number of core AWS headers and
request parameters, making it very easy to query AWS services, or
build out a fully-featured AWS library.

Example
-------

```javascript
var https = require('https')
var aws4  = require('aws4')

// to illustrate usage, we'll create a utility function to request and pipe to stdout
function request(opts) { https.request(opts, function(res) { res.pipe(process.stdout) }).end(opts.body || '') }

// aws4 will sign an options object as you'd pass to http.request, with an AWS service and region
var opts = { host: 'my-bucket.s3.us-west-1.amazonaws.com', path: '/my-object', service: 's3', region: 'us-west-1' }

// aws4.sign() will sign and modify these options, ready to pass to http.request
aws4.sign(opts, { accessKeyId: '', secretAccessKey: '' })

// or it can get credentials from process.env.AWS_ACCESS_KEY_ID, etc
aws4.sign(opts)

// for most AWS services, aws4 can figure out the service and region if you pass a host
opts = { host: 'my-bucket.s3.us-west-1.amazonaws.com', path: '/my-object' }

// usually it will add/modify request headers, but you can also sign the query:
opts = { host: 'my-bucket.s3.amazonaws.com', path: '/?X-Amz-Expires=12345', signQuery: true }

// and for services with simple hosts, aws4 can infer the host from service and region:
opts = { service: 'sqs', region: 'us-east-1', path: '/?Action=ListQueues' }

// and if you're using us-east-1, it's the default:
opts = { service: 'sqs', path: '/?Action=ListQueues' }

aws4.sign(opts)
console.log(opts)
/*
{
  host: 'sqs.us-east-1.amazonaws.com',
  path: '/?Action=ListQueues',
  headers: {
    Host: 'sqs.us-east-1.amazonaws.com',
    'X-Amz-Date': '20121226T061030Z',
    Authorization: 'AWS4-HMAC-SHA256 Credential=ABCDEF/20121226/us-east-1/sqs/aws4_request, ...'
  }
}
*/

// we can now use this to query AWS
request(opts)
/*
<?xml version="1.0"?>
<ListQueuesResponse xmlns="https://queue.amazonaws.com/doc/2012-11-05/">
...
*/

// aws4 can infer the HTTP method if a body is passed in
// method will be POST and Content-Type: 'application/x-www-form-urlencoded; charset=utf-8'
request(aws4.sign({ service: 'iam', body: 'Action=ListGroups&Version=2010-05-08' }))
/*
<ListGroupsResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
...
*/

// you can specify any custom option or header as per usual
request(aws4.sign({
  service: 'dynamodb',
  region: 'ap-southeast-2',
  method: 'POST',
  path: '/',
  headers: {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'DynamoDB_20120810.ListTables'
  },
  body: '{}'
}))
/*
{"TableNames":[]}
...
*/

// The raw RequestSigner can be used to generate CodeCommit Git passwords
var signer = new aws4.RequestSigner({
  service: 'codecommit',
  host: 'git-codecommit.us-east-1.amazonaws.com',
  method: 'GIT',
  path: '/v1/repos/MyAwesomeRepo',
})
var password = signer.getDateTime() + 'Z' + signer.signature()

// see example.js for examples with other services
```

API
---

### aws4.sign(requestOptions, [credentials])

Calculates and populates any necessary AWS headers and/or request
options on `requestOptions`. Returns `requestOptions` as a convenience for chaining.

`requestOptions` is an object holding the same options that the Node.js
[http.request](https://nodejs.org/docs/latest/api/http.html#http_http_request_options_callback)
function takes.

The following properties of `requestOptions` are used in the signing or
populated if they don't already exist:

- `hostname` or `host` (will try to be determined from `service` and `region` if not given)
- `method` (will use `'GET'` if not given or `'POST'` if there is a `body`)
- `path` (will use `'/'` if not given)
- `body` (will use `''` if not given)
- `service` (will try to be calculated from `hostname` or `host` if not given)
- `region` (will try to be calculated from `hostname` or `host` or use `'us-east-1'` if not given)
- `signQuery` (to sign the query instead of adding an `Authorization` header, defaults to false)
- `headers['Host']` (will use `hostname` or `host` or be calculated if not given)
- `headers['Content-Type']` (will use `'application/x-www-form-urlencoded; charset=utf-8'`
  if not given and there is a `body`)
- `headers['Date']` (used to calculate the signature date if given, otherwise `new Date` is used)

Your AWS credentials (which can be found in your
[AWS console](https://portal.aws.amazon.com/gp/aws/securityCredentials))
can be specified in one of two ways:

- As the second argument, like this:

```javascript
aws4.sign(requestOptions, {
  secretAccessKey: "<your-secret-access-key>",
  accessKeyId: "<your-access-key-id>",
  sessionToken: "<your-session-token>"
})
```

- From `process.env`, such as this:

```
export AWS_ACCESS_KEY_ID="<your-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-secret-access-key>"
export AWS_SESSION_TOKEN="<your-session-token>"
```

(will also use `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` if available)

The `sessionToken` property and `AWS_SESSION_TOKEN` environment variable are optional for signing
with [IAM STS temporary credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

Installation
------------

With [npm](https://www.npmjs.com/) do:

```
npm install aws4
```

Can also be used [in the browser](./browser).

Thanks
------

Thanks to [@jed](https://github.com/jed) for his
[dynamo-client](https://github.com/jed/dynamo-client) lib where I first
committed and subsequently extracted this code.

Also thanks to the
[official Node.js AWS SDK](https://github.com/aws/aws-sdk-js) for giving
me a start on implementing the v4 signature.
