"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedRedisContainer = exports.RedisContainer = void 0;
const path_1 = __importDefault(require("path"));
const testcontainers_1 = require("testcontainers");
const REDIS_PORT = 6379;
class RedisContainer extends testcontainers_1.GenericContainer {
    importFilePath = "/tmp/import.redis";
    password = "";
    persistenceVolume = "";
    initialImportScriptFile = "";
    constructor(image) {
        super(image);
        this.withExposedPorts(REDIS_PORT)
            .withStartupTimeout(120_000)
            .withWaitStrategy(testcontainers_1.Wait.forLogMessage("Ready to accept connections"));
    }
    withPassword(password) {
        this.password = password;
        return this;
    }
    withPersistence(sourcePath) {
        this.persistenceVolume = sourcePath;
        return this;
    }
    /* Expect data to be in redis import script format, see https://developer.redis.com/explore/import/*/
    withInitialData(importScriptFile) {
        this.initialImportScriptFile = importScriptFile;
        return this;
    }
    async containerStarted(container) {
        if (this.initialImportScriptFile) {
            await this.importInitialData(container);
        }
    }
    async start() {
        const redisArgs = [
            ...(this.password ? [`--requirepass ${this.password}`] : []),
            ...(this.persistenceVolume ? ["--save 1 1 ", "--appendonly yes"] : []),
        ];
        if (this.imageName.image.includes("redis-stack")) {
            this.withEnvironment({
                REDIS_ARGS: redisArgs.join(" "),
            }).withEntrypoint(["/entrypoint.sh"]);
        }
        else {
            this.withCommand(["redis-server", ...redisArgs]);
        }
        if (this.persistenceVolume) {
            this.withBindMounts([{ mode: "rw", source: this.persistenceVolume, target: "/data" }]);
        }
        if (this.initialImportScriptFile) {
            this.withCopyFilesToContainer([
                {
                    mode: 666,
                    source: this.initialImportScriptFile,
                    target: this.importFilePath,
                },
                {
                    mode: 777,
                    source: path_1.default.join(__dirname, "import.sh"),
                    target: "/tmp/import.sh",
                },
            ]);
        }
        const startedRedisContainer = new StartedRedisContainer(await super.start(), this.password);
        if (this.initialImportScriptFile)
            await this.importInitialData(startedRedisContainer);
        return startedRedisContainer;
    }
    async importInitialData(container) {
        const re = await container.exec(`/tmp/import.sh ${this.password}`);
        if (re.exitCode != 0 || re.output.includes("ERR"))
            throw Error(`Could not import initial data from ${this.initialImportScriptFile}: ${re.output}`);
    }
}
exports.RedisContainer = RedisContainer;
class StartedRedisContainer extends testcontainers_1.AbstractStartedContainer {
    password;
    constructor(startedTestContainer, password) {
        super(startedTestContainer);
        this.password = password;
    }
    getPort() {
        return this.getMappedPort(REDIS_PORT);
    }
    getPassword() {
        return this.password ? this.password.toString() : "";
    }
    getConnectionUrl() {
        const url = new URL("", "redis://");
        url.hostname = this.getHost();
        url.port = this.getPort().toString();
        url.password = this.getPassword();
        return url.toString();
    }
    async executeCliCmd(cmd, additionalFlags = []) {
        const result = await this.startedTestContainer.exec([
            "redis-cli",
            ...(this.password != "" ? [`-a ${this.password}`] : []),
            `${cmd}`,
            ...additionalFlags,
        ]);
        if (result.exitCode !== 0) {
            throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
        }
        return result.output;
    }
}
exports.StartedRedisContainer = StartedRedisContainer;
//# sourceMappingURL=redis-container.js.map