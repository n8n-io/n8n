# n8n - Workflow Automation

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-logo.png)

n8n is a free node based "Open Source" (with Commons Clause)
Workflow Automation Tool. It can be self-hosted, easily extended, and
so also used with internal tools.

<a href="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png"><img src="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png" width="550" alt="n8n.io - Screenshot"></a>


## Contents

- [Demo](#demo)
- [Available integrations](#available-integrations)
- [Documentation](#documentation)
- [Start n8n in Docker](#start-n8n-in-docker)
- [Start with tunnel](#start-with-tunnel)
- [Securing n8n](#securing-n8n)
- [Persist data](#persist-data)
- [Passing Sensitive Data via File](#passing-sensitive-data-via-file)
- [What does n8n mean and how do you pronounce it](#what-does-n8n-mean-and-how-do-you-pronounce-it)
- [Support](#support)
- [Upgrading](#upgrading)
- [License](#license)


## Demo

[:tv: A short demo (< 3 min)](https://www.youtube.com/watch?v=3w7xIMKLVAg)
which shows how to create a simple workflow which automatically sends a new
Slack notification every time a Github repository received or lost a star.


## Available integrations

n8n has 50+ different nodes to automate workflows. The list can be found on: [https://n8n.io/nodes](https://n8n.io/nodes)


## Documentation

The official n8n documentation can be found under: [https://docs.n8n.io](https://docs.n8n.io)

Additional information and example workflows on the n8n.io website: [https://n8n.io](https://n8n.io)


## Start n8n in Docker

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n
```

You can then access n8n by opening:
[http://localhost:5678](http://localhost:5678)


## Start with tunnel

> **WARNING**: This is only meant for local development and testing. Should not be used in production!

To be able to use webhooks which all triggers of external services like Github
rely on n8n has to be reachable from the web. To make that easy n8n has a
special tunnel service (uses this code: [https://github.com/localtunnel/localtunnel](https://github.com/localtunnel/localtunnel)) which redirects requests from our servers to your local
n8n instance.

To use it simply start n8n with `--tunnel`

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n \
  n8n start --tunnel
```


## Securing n8n

By default n8n can be accessed by everybody. This is OK if you have it only running
locally but if you deploy it on a server which is accessible from the web you have
to make sure that n8n is protected!
Right now we have very basic protection via basic-auth in place. It can be activated
by setting the following environment variables:

```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=<USER>
N8N_BASIC_AUTH_PASSWORD=<PASSWORD>
```


## Persist data

The workflow data gets by default saved in an SQLite database in the user
folder (`/root/.n8n`). That folder also additionally contains the
settings like webhook URL and encryption key.

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n
```

### Start with other Database

By default n8n uses SQLite to save credentials, past executions and workflows.
n8n however also supports MongoDB and PostgresDB. To use them simply a few
environment variables have to be set.

It is important to still persist the data in the `/root/.n8` folder. The reason
is that it contains n8n user data. That is the name of the webhook
(in case) the n8n tunnel gets used and even more important the encryption key
for the credentials. If none gets found n8n creates automatically one on
startup. In case credentials are already saved with a different encryption key
it can not be used anymore as encrypting it is not possible anymore.


#### Use with MongoDB

> **WARNING**: Use Postgres if possible! Mongo has problems with saving large
> amounts of data in a document and causes also other problems. So support will
> may be dropped in the future.

Replace the following placeholders with the actual data:
 - MONGO_DATABASE
 - MONGO_HOST
 - MONGO_PORT
 - MONGO_USER
 - MONGO_PASSWORD

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
	-e DB_TYPE=mongodb \
	-e DB_MONGODB_CONNECTION_URL="mongodb://<MONGO_USER>:<MONGO_PASSWORD>@<MONGO_SERVER>:<MONGO_PORT>/<MONGO_DATABASE>" \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n \
  n8n start
```

A full working setup with docker-compose can be found [here](https://github.com/n8n-io/n8n/blob/master/docker/compose/withMongo/README.md)


#### Use with PostgresDB

Replace the following placeholders with the actual data:
 - POSTGRES_DATABASE
 - POSTGRES_HOST
 - POSTGRES_PASSWORD
 - POSTGRES_PORT
 - POSTGRES_USER

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
	-e DB_TYPE=postgresdb \
	-e DB_POSTGRESDB_DATABASE=<POSTGRES_DATABASE> \
	-e DB_POSTGRESDB_HOST=<POSTGRES_HOST> \
	-e DB_POSTGRESDB_PORT=<POSTGRES_PORT> \
	-e DB_POSTGRESDB_USER=<POSTGRES_USER> \
	-e DB_POSTGRESDB_PASSWORD=<POSTGRES_PASSWORD> \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n \
  n8n start
```

A full working setup with docker-compose can be found [here](https://github.com/n8n-io/n8n/blob/master/docker/compose/withPostgres/README.md)


## Passing Sensitive Data via File

To avoid passing sensitive information via environment variables "_FILE" may be
appended to some environment variables. It will then load the data from a file
with the given name. That makes it possible to load data easily from
Docker- and Kubernetes-Secrets.

The following environment variables support file input:
 - DB_MONGODB_CONNECTION_URL_FILE
 - DB_POSTGRESDB_DATABASE_FILE
 - DB_POSTGRESDB_HOST_FILE
 - DB_POSTGRESDB_PASSWORD_FILE
 - DB_POSTGRESDB_PORT_FILE
 - DB_POSTGRESDB_USER_FILE
 - N8N_BASIC_AUTH_PASSWORD_FILE
 - N8N_BASIC_AUTH_USER_FILE


## Build Docker-Image

```
docker build --build-arg N8N_VERSION=<VERSION> -t n8nio/n8n:<VERSION> .

# For example:
docker build --build-arg N8N_VERSION=0.18.1 -t n8nio/n8n:0.18.1 .
```


## What does n8n mean and how do you pronounce it

**Short answer:** It means "nodemation"

**Long answer:** I get that question quite often (more often than I expected)
so I decided it is probably best to answer it here. While looking for a
good name for the project with a free domain I realized very quickly that all the
good ones I could think of were already taken. So, in the end, I chose
nodemation. "node-" in the sense that it uses a Node-View and that it uses
Node.js and "-mation" for "automation" which is what the project is supposed to help with.
However, I did not like how long the name was and I could not imagine writing
something that long every time in the CLI. That is when I then ended up on
"n8n". Sure does not work perfectly but does neither for Kubernetes (k8s) and
did not hear anybody complain there. So I guess it should be ok.



## Support

If you have problems or questions go to our forum, we will then try to help you asap:

[https://community.n8n.io](https://community.n8n.io)



## Upgrading

Before you upgrade to the latest version make sure to check here if there are any breaking changes which concern you:
[Breaking Changes](https://github.com/n8n-io/n8n/blob/master/packages/cli/BREAKING-CHANGES.md)



## License

n8n is licensed under [**Apache 2.0 with Commons Clause**](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)

Additional information about license can be found in the [FAQ](https://docs.n8n.io/#/faq?id=license)
