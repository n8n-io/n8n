# n8n with PostgreSQL and Worker

Starts n8n with PostgreSQL as database, and the Worker as a separate container.


## Start

To start n8n simply start docker-compose by executing the following
command in the current folder.


**IMPORTANT:** But before you do that change the default users and passwords in the [`.env`](.env) file!

```
docker-compose up -d
```

To stop it execute:

```
docker-compose stop
```

## Configuration

The default name of the database, user and password for PostgreSQL can be changed in the [`.env`](.env) file in the current directory.
