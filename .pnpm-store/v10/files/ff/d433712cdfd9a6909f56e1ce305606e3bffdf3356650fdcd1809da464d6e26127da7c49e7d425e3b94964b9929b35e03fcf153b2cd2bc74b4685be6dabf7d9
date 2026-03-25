# mockserver-client-node 

> Communicate with a [MockServer](http://mock-server.com/) from any node or grunt build

[![Build status](https://badge.buildkite.com/368c3b69e959f29725d8ab582f8d75dedddceee196d39b6d28.svg?style=square&theme=slack)](https://buildkite.com/mockserver/mockserver-client-node) [![Dependency Status](https://david-dm.org/mock-server/mockserver-client-node.png)](https://david-dm.org/mock-server/mockserver-client-node) [![devDependency Status](https://david-dm.org/mock-server/mockserver-client-node/dev-status.png)](https://david-dm.org/mock-server/mockserver-client-node#info=devDependencies)

[![NPM](https://nodei.co/npm/mockserver-client.png?downloads=true&stars=true)](https://nodei.co/npm/mockserver-client/) 

# Community

* Backlog:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://trello.com/b/dsfTCP46/mockserver" target="_blank"><img height="20px" src="http://mock-server.com/images/trello_badge-md.png" alt="Trello Backlog"></a>
* Freature Requests:&nbsp;&nbsp;<a href="https://github.com/mock-server/mockserver/issues"><img height="20px" src="http://mock-server.com/images/GitHub_Logo-md.png" alt="Github Issues"></a>
* Issues / Bugs:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/mock-server/mockserver/issues"><img height="20px" src="http://mock-server.com/images/GitHub_Logo-md.png" alt="Github Issues"></a>
* Chat:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://join-mock-server-slack.herokuapp.com" target="_blank"><img height="20px" src="http://mock-server.com/images/slack-logo-slim-md.png" alt="Join Slack"></a>

## Getting Started

[MockServer](http://mock-server.com/) allows you to mock any system you integrate with via HTTP or HTTPS (i.e. (REST) services, web sites, etc). Please note that it is a third party project that needs java.

This npm module allows any grunt or node project to easily communicate with a running [MockServer](http://mock-server.com/) instance.

As an addition to this module for communicating with a running MockServer there is a second project that can be used to start and stop a MockServer called [mockserver-node](https://www.npmjs.org/package/mockserver-node).

The MockServer client can be created as follows:

```js
var mockServer = require('mockserver-client'),
    mockServerClient = mockServer.mockServerClient // MockServer and proxy client
```
**Note:** this assumes you have an instance of MockServer running on port 1080.
For more information on how to do so check [mockserver-node](https://www.npmjs.org/package/mockserver-node).

## Setup Expectation

A simple expectation can be set up as follows:

```js
mockServerClient("localhost", 1080)
    .mockSimpleResponse('/somePath', { name: 'value' }, 203)
    .then(
        function(result) {
            // do something next
        }, 
        function(error) {
            // handle error
        }
    );
```

A more complex expectation can be set up like this:

```js
mockServerClient("localhost", 1080)
    .mockAnyResponse(
        {
            'httpRequest': {
                'method': 'POST',
                'path': '/somePath',
                'queryStringParameters': [
                    {
                        'name': 'test',
                        'values': [ 'true' ]
                    }
                ],
                'body': {
                    'type': "STRING",
                    'value': 'someBody'
                }
            },
            'httpResponse': {
                'statusCode': 200,
                'body': JSON.stringify({ name: 'value' }),
                'delay': {
                    'timeUnit': 'MILLISECONDS',
                    'value': 250
                }
            },
            'times': {
                'remainingTimes': 1,
                'unlimited': false
            }
        }
    )
    .then(
        function(result) {
            // do something next
        }, 
        function(error) {
            // handle error
        }
    );
```

For the full documentation see [MockServer - Creating Expectations](https://mock-server.com/mock_server/creating_expectations.html).

## Verify Requests

It is also possible to verify that request were made:

```js
mockServerClient("localhost", 1080)
    .verify(
        {
            'method': 'POST',
            'path': '/somePath',
            'body': 'someBody'
        }, 
        1, true
    )
    .then(
        function() {
            // do something next
        }, 
        function(failure) {
            // handle verification failure
        }
    );
```
It is furthermore possible to verify that sequences of requests were made in a specific order:

```js
mockServerClient("localhost", 1080)
    .verifySequence(
        {
            'method': 'POST',
            'path': '/somePathOne',
            'body': 'someBody'
        },
        {
            'method': 'GET',
            'path': '/somePathTwo'
        },
        {
            'method': 'GET',
            'path': '/somePathThree'
        }
    )
    .then(
        function() {
            // do something next
        }, 
        function(failure) {
            // handle verification failure
        }
    );
```

For the full documentation see [MockServer - Verifying Requests](https://mock-server.com/mock_server/verification.html).

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Changelog

All notable and significant changes are detailed in the [MockServer changelog](https://github.com/mock-server/mockserver/blob/master/changelog.md) 

---

Task submitted by [James D Bloom](http://blog.jamesdbloom.com)

[![Analytics](https://ga-beacon.appspot.com/UA-32687194-4/mockserver-client-node/README.md)](https://github.com/igrigorik/ga-beacon)
