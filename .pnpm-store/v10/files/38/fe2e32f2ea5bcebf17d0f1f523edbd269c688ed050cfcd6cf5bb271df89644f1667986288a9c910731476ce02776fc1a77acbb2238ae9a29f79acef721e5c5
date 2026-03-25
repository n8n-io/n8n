"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedMySqlContainer = exports.MySqlContainer = void 0;
const testcontainers_1 = require("testcontainers");
const MYSQL_PORT = 3306;
class MySqlContainer extends testcontainers_1.GenericContainer {
    database = "test";
    username = "test";
    userPassword = "test";
    rootPassword = "test";
    constructor(image) {
        super(image);
        this.withExposedPorts(MYSQL_PORT).withStartupTimeout(120_000);
    }
    withDatabase(database) {
        this.database = database;
        return this;
    }
    withUsername(username) {
        this.username = username;
        return this;
    }
    withRootPassword(rootPassword) {
        this.rootPassword = rootPassword;
        return this;
    }
    withUserPassword(userPassword) {
        this.userPassword = userPassword;
        return this;
    }
    async start() {
        this.withEnvironment({
            MYSQL_DATABASE: this.database,
            MYSQL_ROOT_PASSWORD: this.rootPassword,
            MYSQL_USER: this.username,
            MYSQL_PASSWORD: this.userPassword,
        });
        return new StartedMySqlContainer(await super.start(), this.database, this.username, this.userPassword, this.rootPassword);
    }
}
exports.MySqlContainer = MySqlContainer;
class StartedMySqlContainer extends testcontainers_1.AbstractStartedContainer {
    database;
    username;
    userPassword;
    rootPassword;
    constructor(startedTestContainer, database, username, userPassword, rootPassword) {
        super(startedTestContainer);
        this.database = database;
        this.username = username;
        this.userPassword = userPassword;
        this.rootPassword = rootPassword;
    }
    getPort() {
        return this.startedTestContainer.getMappedPort(MYSQL_PORT);
    }
    getDatabase() {
        return this.database;
    }
    getUsername() {
        return this.username;
    }
    getUserPassword() {
        return this.userPassword;
    }
    getRootPassword() {
        return this.rootPassword;
    }
    getConnectionUri(isRoot = false) {
        const url = new URL("", "mysql://");
        url.hostname = this.getHost();
        url.port = this.getPort().toString();
        url.pathname = this.getDatabase();
        url.username = isRoot ? "root" : this.getUsername();
        url.password = isRoot ? this.getRootPassword() : this.getUserPassword();
        return url.toString();
    }
    async executeQuery(query, additionalFlags = [], isRoot = false) {
        const result = await this.startedTestContainer.exec([
            "mysql",
            "-h",
            "127.0.0.1",
            "-u",
            isRoot ? "root" : this.username,
            `-p${isRoot ? this.getRootPassword() : this.getUserPassword()}`,
            "-e",
            `${query};`,
            ...additionalFlags,
        ]);
        if (result.exitCode !== 0) {
            throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${query}`);
        }
        return result.output;
    }
}
exports.StartedMySqlContainer = StartedMySqlContainer;
//# sourceMappingURL=mysql-container.js.map