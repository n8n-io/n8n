# Contributing to n8n

Great that you are here and you want to contribute to n8n


## Code of Conduct

This project and everyone participating in it are governed by the Code of
Conduct which can be found in the file [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to jan@n8n.io.


## Directory Structure

n8n is split up in different modules which are all in a single mono repository.

The most important directories:

 - [/docker/image](/docker/image) - Dockerfiles to create n8n containers
 - [/docker/compose](/docker/compose) - Examples Docker Setups
 - [/packages](/packages) - The different n8n modules
 - [/packages/cli](/packages/cli) - CLI code to run front- & backend
 - [/packages/core](/packages/core) - Core code which handles workflow
                                      execution, active webhooks and
                                      workflows
 - [/packages/editor-ui](/packages/editor-ui) - Vue frontend workflow editor
 - [/packages/node-dev](/packages/node-dev) - Simple CLI to create new n8n-nodes
 - [/packages/nodes-base](/packages/nodes-base) - Base n8n nodes
 - [/packages/worflow](/packages/worflow) - Workflow code with interfaces which
                                            get used by front- & backend


## Development Setup

If you want to change or extend n8n you have to make sure that all needed
dependencies are installed and the packages get linked correctly. Here a short guide on how that can be done:


### Requirements


#### Build Tools

The packages which n8n uses depend on a few build tools:

Linux:
```
apt-get install -y build-essential python
```

Windows:
```
npm install -g windows-build-tools
```

#### lerna

n8n is split up in different modules which are all in a single mono repository.
To facilitate those modules management, [lerna](https://lerna.js.org) gets
used. It automatically sets up file-links between modules which depend on each
other.

So for the setup to work correctly lerna has to be installed globally like this:

```
npm install -g lerna
```


### Actual n8n setup

Now that everything n8n requires to run is installed the actual n8n code can be
checked out and set up:

1. Clone the repository
	```
	git clone https://github.com/n8n-io/n8n.git
	```

1. Go into repository folder
	```
	cd n8n
	```

1. Install all dependencies of all modules and link them together:
	```
	lerna bootstrap --hoist
	```

1. Build all the code:
	```
	npm run build
	```



### Start

To start n8n execute:

```
npm run start
```


## Development Cycle

While iterating on n8n modules code, you can run `npm run dev`. It will then
automatically build your code, restart the backend and refresh the frontend
(editor-ui) on every change you make.

1. Start n8n in development mode:
	```
	npm run dev
	```
1. hack, hack, hack
1. Check if everything still runs in production mode
	```
	npm run build
	npm run start
	```
1. Create tests
1. Run all tests
	```
	npm run test
	```
1. Commit code and create pull request


### Test suite

The tests can be started via:
```
npm run test
```

If that gets executed in one of the package folders it will only run the tests
of this package. If it gets executed in the n8n-root folder it will run all
tests of all packages.
