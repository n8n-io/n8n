"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedPostgreSqlContainer = exports.PostgreSqlContainer = void 0;
const testcontainers_1 = require("testcontainers");
const POSTGRES_PORT = 5432;
const POSTGRES_SSL_PATH = "/tmp/testcontainers-node/postgres";
const POSTGRES_SSL_CA_CERT_PATH = `${POSTGRES_SSL_PATH}/ca_cert.pem`;
const POSTGRES_SSL_CERT_PATH = `${POSTGRES_SSL_PATH}/server.crt`;
const POSTGRES_SSL_KEY_PATH = `${POSTGRES_SSL_PATH}/server.key`;
const POSTGRES_SSL_ENTRYPOINT_PATH = "/usr/local/bin/docker-entrypoint-ssl.sh";
const POSTGRES_SSL_ENTRYPOINT_CONTENT = `#!/bin/sh
set -eu

puid="$(id -u postgres)"
pgid="$(id -g postgres)"

if [ -z "$puid" ] || [ -z "$pgid" ]; then
  echo "Unable to determine postgres uid/gid for SSL key material ownership"
  exit 1
fi

for file in "${POSTGRES_SSL_CA_CERT_PATH}" "${POSTGRES_SSL_CERT_PATH}" "${POSTGRES_SSL_KEY_PATH}"; do
  if [ -f "$file" ]; then
    chown "$puid:$pgid" "$file"
    chmod 600 "$file"
  fi
done

exec /usr/local/bin/docker-entrypoint.sh "$@"
`;
class PostgreSqlContainer extends testcontainers_1.GenericContainer {
    database = "test";
    username = "test";
    password = "test";
    sslConfig;
    constructor(image) {
        super(image);
        this.withExposedPorts(POSTGRES_PORT);
        this.withWaitStrategy(testcontainers_1.Wait.forAll([testcontainers_1.Wait.forHealthCheck(), testcontainers_1.Wait.forListeningPorts()]));
        this.withStartupTimeout(120_000);
    }
    withDatabase(database) {
        this.database = database;
        return this;
    }
    withUsername(username) {
        this.username = username;
        return this;
    }
    withPassword(password) {
        this.password = password;
        return this;
    }
    withSSL(certFile, keyFile, caCertFile) {
        if (!certFile)
            throw new Error("SSL certificate file should not be empty.");
        if (!keyFile)
            throw new Error("SSL key file should not be empty.");
        if (caCertFile !== undefined && !caCertFile)
            throw new Error("SSL CA certificate file should not be empty.");
        const filesToCopy = [
            { source: certFile, target: POSTGRES_SSL_CERT_PATH, mode: 0o600 },
            { source: keyFile, target: POSTGRES_SSL_KEY_PATH, mode: 0o600 },
        ];
        if (caCertFile) {
            filesToCopy.push({ source: caCertFile, target: POSTGRES_SSL_CA_CERT_PATH, mode: 0o600 });
        }
        this.sslConfig = {
            caCertPath: caCertFile ? POSTGRES_SSL_CA_CERT_PATH : undefined,
        };
        this.withCopyFilesToContainer(filesToCopy)
            .withCopyContentToContainer([
            {
                content: POSTGRES_SSL_ENTRYPOINT_CONTENT,
                target: POSTGRES_SSL_ENTRYPOINT_PATH,
                mode: 0o700,
            },
        ])
            .withEntrypoint(["sh", POSTGRES_SSL_ENTRYPOINT_PATH]);
        return this;
    }
    withSSLCert(caCertFile, certFile, keyFile) {
        if (!caCertFile)
            throw new Error("SSL CA certificate file should not be empty.");
        return this.withSSL(certFile, keyFile, caCertFile);
    }
    async start() {
        this.withEnvironment({
            POSTGRES_DB: this.database,
            POSTGRES_USER: this.username,
            POSTGRES_PASSWORD: this.password,
        });
        if (this.sslConfig) {
            const command = this.createOpts.Cmd;
            if (!command || command[0] === "postgres") {
                this.withCommand([
                    ...(command ?? ["postgres"]),
                    "-c",
                    "ssl=on",
                    "-c",
                    `ssl_cert_file=${POSTGRES_SSL_CERT_PATH}`,
                    "-c",
                    `ssl_key_file=${POSTGRES_SSL_KEY_PATH}`,
                    ...(this.sslConfig.caCertPath ? ["-c", `ssl_ca_file=${this.sslConfig.caCertPath}`] : []),
                ]);
            }
        }
        if (!this.healthCheck) {
            this.withHealthCheck({
                test: [
                    "CMD-SHELL",
                    `PGPASSWORD=${this.password} pg_isready --host localhost --username ${this.username} --dbname ${this.database}`,
                ],
                interval: 250,
                timeout: 1000,
                retries: 1000,
            });
        }
        return new StartedPostgreSqlContainer(await super.start(), this.database, this.username, this.password);
    }
}
exports.PostgreSqlContainer = PostgreSqlContainer;
class StartedPostgreSqlContainer extends testcontainers_1.AbstractStartedContainer {
    database;
    username;
    password;
    snapshotName = "migrated_template";
    constructor(startedTestContainer, database, username, password) {
        super(startedTestContainer);
        this.database = database;
        this.username = username;
        this.password = password;
    }
    getPort() {
        return super.getMappedPort(POSTGRES_PORT);
    }
    getDatabase() {
        return this.database;
    }
    getUsername() {
        return this.username;
    }
    getPassword() {
        return this.password;
    }
    /**
     * @returns A connection URI in the form of `postgres[ql]://[username[:password]@][host[:port],]/database`
     */
    getConnectionUri() {
        const url = new URL("", "postgres://");
        url.hostname = this.getHost();
        url.port = this.getPort().toString();
        url.pathname = this.getDatabase();
        url.username = this.getUsername();
        url.password = this.getPassword();
        return url.toString();
    }
    /**
     * Sets the name to be used for database snapshots.
     * This name will be used as the default for snapshot() and restore() methods.
     *
     * @param snapshotName The name to use for snapshots (default is "migrated_template" if this method is not called)
     * @returns this (for method chaining)
     */
    withSnapshotName(snapshotName) {
        this.snapshotName = snapshotName;
        return this;
    }
    /**
     * Takes a snapshot of the current state of the database as a template, which can then be restored using
     * the restore method.
     *
     * @param snapshotName Name for the snapshot, defaults to the value set by withSnapshotName() or "migrated_template" if not specified
     * @returns Promise resolving when snapshot is complete
     * @throws Error if attempting to snapshot the postgres system database or if using the same name as the database
     */
    async snapshot(snapshotName = this.snapshotName) {
        this.snapshotSanityCheck(snapshotName);
        // Execute the commands to create the snapshot, in order
        await this.execCommandsSQL([
            // Update pg_database to remove the template flag, then drop the database if it exists.
            // This is needed because dropping a template database will fail.
            `UPDATE pg_database SET datistemplate = FALSE WHERE datname = '${snapshotName}'`,
            `DROP DATABASE IF EXISTS "${snapshotName}"`,
            // Create a copy of the database to another database to use as a template now that it was fully migrated
            `CREATE DATABASE "${snapshotName}" WITH TEMPLATE "${this.getDatabase()}" OWNER "${this.getUsername()}"`,
            // Snapshot the template database so we can restore it onto our original database going forward
            `ALTER DATABASE "${snapshotName}" WITH is_template = TRUE`,
        ]);
    }
    /**
     * Restores the database to a specific snapshot.
     *
     * @param snapshotName Name of the snapshot to restore from, defaults to the value set by withSnapshotName() or "migrated_template" if not specified
     * @returns Promise resolving when restore is complete
     * @throws Error if attempting to restore the postgres system database or if using the same name as the database
     */
    async restoreSnapshot(snapshotName = this.snapshotName) {
        this.snapshotSanityCheck(snapshotName);
        // Execute the commands to restore the snapshot, in order
        await this.execCommandsSQL([
            // Drop the entire database by connecting to the postgres global database
            `DROP DATABASE "${this.getDatabase()}" WITH (FORCE)`,
            // Then restore the previous snapshot
            `CREATE DATABASE "${this.getDatabase()}" WITH TEMPLATE "${snapshotName}" OWNER "${this.getUsername()}"`,
        ]);
    }
    /**
     * Executes a series of SQL commands against the Postgres database
     *
     * @param commands Array of SQL commands to execute in sequence
     * @throws Error if any command fails to execute with details of the failure
     */
    async execCommandsSQL(commands) {
        for (const command of commands) {
            try {
                const result = await this.exec([
                    "psql",
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-U",
                    this.getUsername(),
                    "-d",
                    "postgres",
                    "-c",
                    command,
                ]);
                if (result.exitCode !== 0) {
                    throw new Error(`Command failed with exit code ${result.exitCode}: ${result.output}`);
                }
            }
            catch (error) {
                console.error(`Failed to execute command: ${command}`, error);
                throw error;
            }
        }
    }
    /**
     * Checks if the snapshot name is valid and if the database is not the postgres system database
     * @param snapshotName The name of the snapshot to check
     */
    snapshotSanityCheck(snapshotName) {
        if (this.getDatabase() === "postgres") {
            throw new Error("Snapshot feature is not supported when using the postgres system database");
        }
        if (this.getDatabase() === snapshotName) {
            throw new Error("Snapshot name cannot be the same as the database name");
        }
    }
}
exports.StartedPostgreSqlContainer = StartedPostgreSqlContainer;
