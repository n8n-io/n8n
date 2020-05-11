# Sensitive Data via File

To avoid passing sensitive information via environment variables, "_FILE" may be
appended to some environment variables. It will then load the data from a file
with the given name. That makes it possible to load data easily from
Docker and Kubernetes secrets.

The following environment variables support file input:

 - DB_MONGODB_CONNECTION_URL_FILE
 - DB_POSTGRESDB_DATABASE_FILE
 - DB_POSTGRESDB_HOST_FILE
 - DB_POSTGRESDB_PASSWORD_FILE
 - DB_POSTGRESDB_PORT_FILE
 - DB_POSTGRESDB_USER_FILE
 - DB_POSTGRESDB_SCHEMA_FILE
 - N8N_BASIC_AUTH_PASSWORD_FILE
 - N8N_BASIC_AUTH_USER_FILE
