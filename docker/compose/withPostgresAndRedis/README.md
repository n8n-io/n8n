# n8n in queue mode with PostgreSQL and Redis

Starts n8n with PostgreSQL as database  
+  
a queue worker  
+  
a webhook worker


## Start

To start n8n with PostgreSQL simply start docker-compose by executing the following
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

Also you will need to set up a reverse proxy or configure the urls with alternate ports somehow.
i use traefik
