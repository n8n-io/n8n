"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedoclyClient = exports.TOKEN_FILENAME = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const registry_api_1 = require("./registry-api");
const env_1 = require("../env");
const utils_1 = require("../utils");
const logger_1 = require("../logger");
const domains_1 = require("./domains");
exports.TOKEN_FILENAME = '.redocly-config.json';
class RedoclyClient {
    constructor(region) {
        this.accessTokens = {};
        this.region = this.loadRegion(region);
        this.loadTokens();
        this.domain = region ? domains_1.DOMAINS[region] : env_1.env.REDOCLY_DOMAIN || domains_1.DOMAINS[domains_1.DEFAULT_REGION];
        (0, domains_1.setRedoclyDomain)(this.domain);
        this.registryApi = new registry_api_1.RegistryApi(this.accessTokens, this.region);
    }
    loadRegion(region) {
        if (region && !domains_1.DOMAINS[region]) {
            throw new Error(`Invalid argument: region in config file.\nGiven: ${logger_1.colorize.green(region)}, choices: "us", "eu".`);
        }
        if ((0, domains_1.getRedoclyDomain)()) {
            return (domains_1.AVAILABLE_REGIONS.find((region) => domains_1.DOMAINS[region] === (0, domains_1.getRedoclyDomain)()) || domains_1.DEFAULT_REGION);
        }
        return region || domains_1.DEFAULT_REGION;
    }
    getRegion() {
        return this.region;
    }
    hasTokens() {
        return (0, utils_1.isNotEmptyObject)(this.accessTokens);
    }
    // <backward compatibility: old versions of portal>
    hasToken() {
        return !!this.accessTokens[this.region];
    }
    async getAuthorizationHeader() {
        return this.accessTokens[this.region];
    }
    // </backward compatibility: portal>
    setAccessTokens(accessTokens) {
        this.accessTokens = accessTokens;
    }
    loadTokens() {
        const credentialsPath = (0, path_1.resolve)((0, os_1.homedir)(), exports.TOKEN_FILENAME);
        const credentials = this.readCredentialsFile(credentialsPath);
        if ((0, utils_1.isNotEmptyObject)(credentials)) {
            this.setAccessTokens({
                ...credentials,
                ...(credentials.token &&
                    !credentials[this.region] && {
                    [this.region]: credentials.token,
                }),
            });
        }
        if (env_1.env.REDOCLY_AUTHORIZATION) {
            this.setAccessTokens({
                ...this.accessTokens,
                [this.region]: env_1.env.REDOCLY_AUTHORIZATION,
            });
        }
    }
    getAllTokens() {
        return Object.entries(this.accessTokens)
            .filter(([region]) => domains_1.AVAILABLE_REGIONS.includes(region))
            .map(([region, token]) => ({ region, token }));
    }
    async getValidTokens() {
        const allTokens = this.getAllTokens();
        const verifiedTokens = await Promise.allSettled(allTokens.map(({ token }) => this.verifyToken(token)));
        return allTokens
            .filter((_, index) => verifiedTokens[index].status === 'fulfilled')
            .map(({ token, region }) => ({ token, region, valid: true }));
    }
    async getTokens() {
        return this.hasTokens() ? await this.getValidTokens() : [];
    }
    async isAuthorizedWithRedoclyByRegion() {
        if (!this.hasTokens()) {
            return false;
        }
        const accessToken = this.accessTokens[this.region];
        if (!accessToken) {
            return false;
        }
        try {
            await this.verifyToken(accessToken);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async isAuthorizedWithRedocly() {
        return this.hasTokens() && (0, utils_1.isNotEmptyArray)(await this.getValidTokens());
    }
    readCredentialsFile(credentialsPath) {
        return (0, fs_1.existsSync)(credentialsPath) ? JSON.parse((0, fs_1.readFileSync)(credentialsPath, 'utf-8')) : {};
    }
    async verifyToken(accessToken, verbose = false) {
        return this.registryApi.authStatus(accessToken, verbose);
    }
    async login(accessToken, verbose = false) {
        const credentialsPath = (0, path_1.resolve)((0, os_1.homedir)(), exports.TOKEN_FILENAME);
        try {
            await this.verifyToken(accessToken, verbose);
        }
        catch (err) {
            throw new Error('Authorization failed. Please check if you entered a valid API key.');
        }
        const credentials = {
            ...this.readCredentialsFile(credentialsPath),
            [this.region]: accessToken,
            token: accessToken, // FIXME: backward compatibility, remove on 1.0.0
        };
        this.accessTokens = credentials;
        this.registryApi.setAccessTokens(credentials);
        (0, fs_1.writeFileSync)(credentialsPath, JSON.stringify(credentials, null, 2));
    }
    logout() {
        const credentialsPath = (0, path_1.resolve)((0, os_1.homedir)(), exports.TOKEN_FILENAME);
        if ((0, fs_1.existsSync)(credentialsPath)) {
            (0, fs_1.unlinkSync)(credentialsPath);
        }
    }
}
exports.RedoclyClient = RedoclyClient;
