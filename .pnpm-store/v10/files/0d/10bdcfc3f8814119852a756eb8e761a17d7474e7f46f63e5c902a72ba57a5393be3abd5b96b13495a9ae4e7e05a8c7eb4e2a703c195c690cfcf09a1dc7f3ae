# requirejs-config-file [![Build Status](https://travis-ci.org/webforge-labs/requirejs-config-file.svg?branch=master)](https://travis-ci.org/webforge-labs/requirejs-config-file)

[![NPM](https://nodei.co/npm/requirejs-config-file.png?downloads=true)](https://www.npmjs.org/package/requirejs-config-file)

A small api to read and write your requirejs config file


## installation

```
npm install requirejs-config-file
```

## usage

### require the constructor
```js
var ConfigFile = require('requirejs-config-file').ConfigFile;
```

### read
```js
// Read: reading the config
var configFile = new ConfigFile('path/to/some/requirejs-config.js'));

var config = configFile.read();

console.log(config); // is an object with the found config
```

### modify (read and write)
```js
// Modify: reading and writing the config
var configFile = new ConfigFile('path/to/some/requirejs-config.js'));

var config = configFile.read();

config.baseUrl = '/new';

configFile.write();
```

### create
```js
// CreateExample: creating a new config file
var configFile = new ConfigFile('path/to/new-config.js'));

configFile.createIfNotExists();

configFile.write();
```

### create or modify
```js
// CreateAndModifyExample: reading and writing a maybe not existing config file
var configFile = new ConfigFile('path/to/new-config.js'));

configFile.createIfNotExists();

configFile.read();

config.baseUrl = '/new';

configFile.write();
```
