# docker-modem

[Docker](https://www.docker.com/)'s Remote API network layer module.

`docker-modem` will help you interacting with `Docker`, since it already implements all the network strategies needed to support all `Docker`'s Remote API endpoints.

It is the module powering (network wise) [dockerode](https://github.com/apocas/dockerode) and other modules.

## Usage

### Getting started

``` js
var Modem = require('docker-modem');
var modem1 = new Modem({socketPath: '/var/run/docker.sock'});
var modem2 = new Modem(); //defaults to above if env variables are not used
var modem3 = new Modem({host: 'http://192.168.1.10', port: 3000});
var modem4 = new Modem({protocol:'http', host: '127.0.0.1', port: 3000});
var modem5 = new Modem({host: '127.0.0.1', port: 3000}); //defaults to http
```

### SSH

You can connect to the Docker daemon via SSH in two ways:

* Using the built-in SSH agent.
* Implement your own custom agent.

``` js
//built-in SSH agent
var modem1 = new Modem({
  protocol: 'ssh',
  host: 'ssh://127.0.0.1',
  port: 22
});

//custom agent
var customAgent = myOwnSSHAgent({host: 'ssh://127.0.0.1', port: 22});
var modem2 = new Modem({
  agent: customAgent,
});
```

## Tests

 * Tests are implemented using `mocha` and `chai`. Run them with `npm test`.
 * Check [dockerode](https://github.com/apocas/dockerode) tests, which is indirectly co-testing `docker-modem`.

## Sponsors

Amazing entities that [sponsor](https://github.com/sponsors/apocas) my open-source work. Check them out!

[![HTTP Toolkit](https://avatars.githubusercontent.com/u/39777515?s=100)](https://github.com/httptoolkit)

## License

Pedro Dias - [@pedromdias](https://twitter.com/pedromdias)

Licensed under the Apache license, version 2.0 (the "license"); You may not use this file except in compliance with the license. You may obtain a copy of the license at:

http://www.apache.org/licenses/LICENSE-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
