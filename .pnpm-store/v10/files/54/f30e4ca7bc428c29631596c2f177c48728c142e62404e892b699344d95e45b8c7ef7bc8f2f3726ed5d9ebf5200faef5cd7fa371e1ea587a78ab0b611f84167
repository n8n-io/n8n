# dockerode

Not another Node.js Docker Remote API module.

`dockerode` objectives:

* **streams** - `dockerode` does NOT break any stream, it passes them to you allowing for some stream voodoo.
* **stream demux** - Supports optional [stream demultiplexing](https://github.com/apocas/dockerode#helper-functions).
* **entities** - containers, images and execs are defined entities and not random static methods.
* **run** - `dockerode` allow you to seamless run commands in a container aka `docker run`.
* **tests** - `dockerode` really aims to have a good test set, allowing to follow `Docker` changes easily, quickly and painlessly.
* **feature-rich** - There's a real effort in keeping **All** `Docker` Remote API features implemented and tested.
* **interfaces** - Features **callback** and **promise** based interfaces, making everyone happy :)

## Ecosystem

 * docker-modem [https://github.com/apocas/docker-modem](https://github.com/apocas/docker-modem) - Docker's API network stack
 * dockerode-compose [https://github.com/apocas/dockerode-compose](https://github.com/apocas/dockerode-compose) - docker-compose in Node.js

## Installation

`npm install dockerode`

## Usage

 * Input options are directly passed to Docker. Check [Docker API documentation](https://docs.docker.com/engine/api/latest/) for more details.
 * Return values are unchanged from Docker, official Docker documentation will also apply to them.
 * Check the tests and examples folder for more examples.

### Getting started

To use `dockerode` first you need to instantiate it:

``` js
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var docker1 = new Docker(); //defaults to above if env variables are not used
var docker2 = new Docker({host: 'http://192.168.1.10', port: 3000});
var docker3 = new Docker({protocol:'http', host: '127.0.0.1', port: 3000});
var docker4 = new Docker({host: '127.0.0.1', port: 3000}); //defaults to http

//protocol http vs https is automatically detected
var docker5 = new Docker({
  host: '192.168.1.10',
  port: process.env.DOCKER_PORT || 2375,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem'),
  version: 'v1.25' // required when Docker >= v1.13, https://docs.docker.com/engine/api/version-history/
});

var docker6 = new Docker({
  protocol: 'https', //you can enforce a protocol
  host: '192.168.1.10',
  port: process.env.DOCKER_PORT || 2375,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});

//using a different promise library (default is the native one)
var docker7 = new Docker({
  Promise: require('bluebird')
  //...
});
//...
```

### Manipulating a container:

``` js
// create a container entity. does not query API
var container = docker.getContainer('71501a8ab0f8');

// query API for container info
container.inspect(function (err, data) {
  console.log(data);
});

container.start(function (err, data) {
  console.log(data);
});

container.remove(function (err, data) {
  console.log(data);
});

// promises are supported
var auxContainer;
docker.createContainer({
  Image: 'ubuntu',
  AttachStdin: false,
  AttachStdout: true,
  AttachStderr: true,
  Tty: true,
  Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
  OpenStdin: false,
  StdinOnce: false
}).then(function(container) {
  auxContainer = container;
  return auxContainer.start();
}).then(function(data) {
  return auxContainer.resize({
    h: process.stdout.rows,
    w: process.stdout.columns
  });
}).then(function(data) {
  return auxContainer.stop();
}).then(function(data) {
  return auxContainer.remove();
}).then(function(data) {
  console.log('container removed');
}).catch(function(err) {
  console.log(err);
});
```

You may also specify default options for each container's operations, which will always be used for the specified container and operation.

``` js
container.defaultOptions.start.Binds = ["/tmp:/tmp:rw"];
```

### Stopping all containers on a host

``` js
docker.listContainers(function (err, containers) {
  containers.forEach(function (containerInfo) {
    docker.getContainer(containerInfo.Id).stop(cb);
  });
});
```

### Building an Image
Context: provides the path to the Dockerfile. Additionaly files that are involved in the build *must* be explicitly mentioned in src array, since they are sent to a temp env to build. Example: file for COPY command are extracted from that temporary environment.  

``` js
docker.buildImage('archive.tar', {t: imageName}, function (err, response){
  //...
});

docker.buildImage({
  context: __dirname,
  src: ['Dockerfile', 'file1', 'file2']
}, {t: imageName}, function (err, response) {
  //...
});
```

`buildImage` returns a Promise of NodeJS stream. In case you want to find out when the build has finished, you must follow the progress of the build with the `modem` instance in dockerode:

``` js
let dockerode = new Dockerode();
let stream = await dockerode.buildImage(...);
await new Promise((resolve, reject) => {
  dockerode.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
});
// Build has finished
```


### Creating a container:

``` js
docker.createContainer({Image: 'ubuntu', Cmd: ['/bin/bash'], name: 'ubuntu-test'}, function (err, container) {
  container.start(function (err, data) {
    //...
  });
});
//...
```

### Streams goodness:

``` js
//tty:true
docker.createContainer({ /*...*/ Tty: true /*...*/ }, function(err, container) {

  /* ... */

  container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
    stream.pipe(process.stdout);
  });

  /* ... */
});

//tty:false
docker.createContainer({ /*...*/ Tty: false /*...*/ }, function(err, container) {

  /* ... */

  container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
    //dockerode may demultiplex attach streams for you :)
    container.modem.demuxStream(stream, process.stdout, process.stderr);
  });

  /* ... */
});

docker.createImage({fromImage: 'ubuntu'}, function (err, stream) {
  stream.pipe(process.stdout);
});

//...
```

There is also support for [HTTP connection hijacking](https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerAttach),
which allows for cleaner interactions with commands that work with stdin and stdout separately.

```js
docker.createContainer({Tty: false, /*... other options */}, function(err, container) {
  container.start(function(err) {
    container.exec({Cmd: ['shasum', '-'], AttachStdin: true, AttachStdout: true}, function(err, exec) {
      exec.start({hijack: true, stdin: true}, function(err, stream) {
        // shasum can't finish until after its stdin has been closed, telling it that it has
        // read all the bytes it needs to sum. Without a socket upgrade, there is no way to
        // close the write-side of the stream without also closing the read-side!
        fs.createReadStream('node-v5.1.0.tgz', 'binary').pipe(stream);

        // Fortunately, we have a regular TCP socket now, so when the readstream finishes and closes our
        // stream, it is still open for reading and we will still get our results :-)
        docker.modem.demuxStream(stream, process.stdout, process.stderr);
      });
    });
  });
});
```

### Equivalent of `docker run` in `dockerode`:

* `image` - container image
* `cmd` - command to be executed
* `stream` - stream(s) which will be used for execution output.
* `create_options` - (optional) Options used for container creation. Refer to the [DockerEngine ContainerCreate documentation](https://docs.docker.com/engine/api/v1.37/#operation/ContainerCreate) for the possible values
* `start_options` - (optional) Options used for container start. Refer to the [DockerEngine ContainerStart documentation](https://docs.docker.com/engine/api/v1.37/#operation/ContainerStart) for the possible values
* `callback` - callback called when execution ends (optional, promise will be returned if not used).

``` js
//callback
docker.run('ubuntu', ['bash', '-c', 'uname -a'], process.stdout, function (err, data, container) {
  console.log(data.StatusCode);
});

//promise
docker.run(testImage, ['bash', '-c', 'uname -a'], process.stdout).then(function(data) {
  var output = data[0];
  var container = data[1];
  console.log(output.StatusCode);
  return container.remove();
}).then(function(data) {
  console.log('container removed');
}).catch(function(err) {
  console.log(err);
});
```

or, if you want to split stdout and stderr (you must to pass `Tty:false` as an option for this to work)

``` js
docker.run('ubuntu', ['bash', '-c', 'uname -a'], [process.stdout, process.stderr], {Tty:false}, function (err, data, container) {
  console.log(data.StatusCode);
});
```

If you provide a callback, `run` will return an EventEmitter supporting the following events: container, stream, data.
If a callback isn't provided a promise will be returned.

``` js
docker.run('ubuntu', ['bash', '-c', 'uname -a'], [process.stdout, process.stderr], {Tty:false}, function (err, data, container) {
  //...
}).on('container', function (container) {
  //...
});
```

And here is one more complex example using auto-remove and Docker network.

``` js
docker.run('some-python-image', ['python', 'main.py', arg], process.stdout, {name: 'my-python-container', HostConfig: { AutoRemove: true, NetworkMode: 'my_network'}}, function(err, data, container) {
  // Do stuff
});
```

### Equivalent of `docker pull` in `dockerode`:

* `repoTag` - container image name (optionally with tag)
  `myrepo/myname:withtag`
* `options` - extra options passed to create image.
* `callback` - callback called when execution ends.

``` js
docker.pull('myrepo/myname:tag', function (err, stream) {
  // streaming output from pull...
});
```

#### Pull from private repos

`docker-modem` already base64 encodes the necessary auth object for you.

``` js
var auth = {
  username: 'username',
  password: 'password',
  auth: '',
  email: 'your@email.email',
  serveraddress: 'https://index.docker.io/v1'
};

docker.pull('tag', {'authconfig': auth}, function (err, stream) {
  //...
});
```

If you already have a base64 encoded auth object, you can use it directly:

```js
var auth = { key: 'yJ1J2ZXJhZGRyZXNzIjoitZSI6Im4OCIsImF1dGgiOiIiLCJlbWFpbCI6ImZvbGllLmFkcmc2VybmF0iLCJzZX5jb2aHR0cHM6Ly9pbmRleC5kb2NrZXIuaW8vdZvbGllYSIsInBhc3N3b3JkIjoiRGVjZW1icmUjEvIn0=' }
```


## Helper functions

* `followProgress` - allows to fire a callback only in the end of a stream based process. (build, pull, ...)

``` js
//followProgress(stream, onFinished, [onProgress])
docker.pull(repoTag, function(err, stream) {
  //...
  docker.modem.followProgress(stream, onFinished, onProgress);

  function onFinished(err, output) {
    //output is an array with output json parsed objects
    //...
  }
  function onProgress(event) {
    //...
  }
});
```

* `demuxStream` - demux stdout and stderr

``` js
//demuxStream(stream, stdout, stderr)
container.attach({
  stream: true,
  stdout: true,
  stderr: true
}, function handler(err, stream) {
  //...
  container.modem.demuxStream(stream, process.stdout, process.stderr);
  //...
});
```

## Sponsors

Amazing entities that [sponsor](https://github.com/sponsors/apocas) my open-source work. Check them out!

[![HTTP Toolkit](https://avatars.githubusercontent.com/u/39777515?s=100)](https://github.com/httptoolkit)
[![OOMOL - Oomol AI Studio](https://avatars.githubusercontent.com/u/146153906?s=100)](https://oomol.com)

## Documentation

### Docker

- docker.createContainer(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerCreate)
- docker.createImage([auth], options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageCreate)
- docker.loadImage(file, options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageLoad)
- docker.importImage(file, options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageCreate)
- docker.buildImage(file, options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageBuild)
- docker.checkAuth(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemAuth)
- docker.getContainer(id) - Returns a Container object.
- docker.getImage(name) - Returns an Image object.
- docker.getVolume(name) - Returns a Volume object.
- docker.getPlugin(name) - Returns a Plugin object.
- docker.getService(id) - Returns a Service object.
- docker.getTask(id) - Returns a Task object.
- docker.getNode(id) - Returns a Node object.
- docker.getNetwork(id) - Returns a Network object.
- docker.getSecret(id) - Returns a Secret object.
- docker.getConfig(id) - Returns a Config object.
- docker.getExec(id) - Returns a Exec object.
- docker.listContainers(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerList)
- docker.listImages(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageList)
- docker.listServices(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceList)
- docker.listNodes(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NodeList)
- docker.listTasks(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/TaskList)
- docker.listSecrets(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SecretList)
- docker.listConfigs(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ConfigList)
- docker.listPlugins(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginList)
- docker.listVolumes(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/VolumeList)
- docker.listNetworks(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkList)
- docker.createSecret(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SecretCreate)
- docker.createConfig(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ConfigCreate)
- docker.createPlugin(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginCreate)
- docker.createVolume(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/VolumeCreate)
- docker.createService(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceCreate)
- docker.createNetwork(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkCreate)
- docker.pruneImages(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImagePrune)
- docker.pruneBuilder() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/BuildPrune)
- docker.pruneContainers(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerPrune)
- docker.pruneVolumes(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/VolumePrune)
- docker.pruneNetworks(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkPrune)
- docker.searchImages(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageSearch)
- docker.info() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemInfo)
- docker.version() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemVersion)
- docker.ping() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemPing)
- docker.df() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemDataUsage)
- docker.getEvents(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SystemEvents)
- docker.swarmInit(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SwarmInit)
- docker.swarmJoin(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SwarmJoin)
- docker.swarmLeave(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SwarmLeave)
- docker.swarmUpdate(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SwarmUpdate)
- docker.swarmInspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SwarmInspect)
- docker.pull(repoTag, options, callback, auth) - Like Docker's CLI pull
- docker.pullAll(repoTag, options, callback, auth) - Like Docker's CLI pull with "-a"
- docker.run(image, cmd, stream, createOptions, startOptions) - Like Docker's CLI run


### Container

- container.inspect(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerInspect)
- container.rename(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerRename)
- container.update(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerUpdate)
- container.top(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerTop)
- container.changes() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerChanges)
- container.export() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerExport)
- container.start(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerStart)
- container.stop(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerStop)
- container.pause(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerPause)
- container.unpause(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerUnpause)
- container.exec(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerExec)
- container.commit(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageCommit)
- container.restart(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerRestart)
- container.kill(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerKill)
- container.resize(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerResize)
- container.attach(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerAttach)
- container.wait(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerWait)
- container.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerDelete)
- container.getArchive(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerArchive)
- container.infoArchive(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerArchiveInfo)
- container.putArchive(file, options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PutContainerArchive)
- container.logs(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerLogs)
- container.stats(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ContainerStats)

### Exec

- exec.start(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ExecStart)
- exec.resize(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ExecResize)
- exec.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ExecInspect)

### Image

- image.inspect(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.48/#tag/Image/operation/ImageInspect)
- image.history() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageHistory)
- image.push(options, callback, auth) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImagePush)
- image.tag(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageTag)
- image.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageDelete)
- image.get() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ImageGet)

### Network

- network.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkInspect)
- network.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkDelete)
- network.connect(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkConnect)
- network.disconnect(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NetworkDisconnect)

### Node

- node.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NodeInspect)
- node.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NodeDelete)
- node.update(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/NodeUpdate)

### Plugin

- plugin.privileges() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/GetPluginPrivileges)
- plugin.pull(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginPull)
- plugin.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginInspect)
- plugin.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginDelete)
- plugin.enable(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginEnable)
- plugin.disable(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginDisable)
- plugin.update([auth], options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginUpgrade)
- plugin.push(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginPush)
- plugin.configure(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/PluginSet)

### Secret

- secret.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SecretInspect)
- secret.remove() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SecretDelete)
- secret.update(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/SecretUpdate)

### Service

- service.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceInspect)
- service.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceDelete)
- service.update(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceUpdate)
- service.logs(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/ServiceLogs)

### Task

- task.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/TaskInspect)
- task.logs(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/Session)

### Volume

- volume.inspect() - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/VolumeInspect)
- volume.remove(options) - [Docker API Endpoint](https://docs.docker.com/engine/api/v1.37/#operation/VolumeDelete)


## Tests

 * `docker pull ubuntu:latest` to prepare your system for the tests.
 * Tests are implemented using `mocha` and `chai`. Run them with `npm test`.

## Examples

Check the examples folder for more specific use cases examples.

## License

Pedro Dias - [@pedromdias](https://twitter.com/pedromdias)

Licensed under the Apache license, version 2.0 (the "license"); You may not use this file except in compliance with the license. You may obtain a copy of the license at:

    http://www.apache.org/licenses/LICENSE-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
