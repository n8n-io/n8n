"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedoclyOAuthClient = void 0;
const node_os_1 = require("node:os");
const path = require("node:path");
const node_fs_1 = require("node:fs");
const crypto = require("node:crypto");
const node_buffer_1 = require("node:buffer");
const device_flow_1 = require("./device-flow");
const SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';
class RedoclyOAuthClient {
    constructor(clientName, version) {
        this.clientName = clientName;
        this.version = version;
        this.dir = path.join((0, node_os_1.homedir)(), '.redocly');
        if (!(0, node_fs_1.existsSync)(this.dir)) {
            (0, node_fs_1.mkdirSync)(this.dir);
        }
        const homeDirPath = process.env.HOME;
        const hash = crypto.createHash('sha256');
        hash.update(`${homeDirPath}${SALT}`);
        const hashHex = hash.digest('hex');
        const key = node_buffer_1.Buffer.alloc(32, node_buffer_1.Buffer.from(hashHex).toString('base64')).toString();
        const iv = node_buffer_1.Buffer.alloc(16, node_buffer_1.Buffer.from(process.env.HOME).toString('base64')).toString();
        this.cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, key, iv);
        this.decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, key, iv);
    }
    async login(baseUrl) {
        const deviceFlow = new device_flow_1.RedoclyOAuthDeviceFlow(baseUrl, this.clientName, this.version);
        const token = await deviceFlow.run();
        if (!token) {
            throw new Error('Failed to login');
        }
        this.saveToken(token);
    }
    async logout() {
        try {
            this.removeToken();
        }
        catch (err) {
            // do nothing
        }
    }
    async isAuthorized(baseUrl, apiKey) {
        const deviceFlow = new device_flow_1.RedoclyOAuthDeviceFlow(baseUrl, this.clientName, this.version);
        if (apiKey) {
            return await deviceFlow.verifyApiKey(apiKey);
        }
        const token = await this.readToken();
        if (!token) {
            return false;
        }
        const isValidAccessToken = await deviceFlow.verifyToken(token.access_token);
        if (isValidAccessToken) {
            return true;
        }
        try {
            const newToken = await deviceFlow.refreshToken(token.refresh_token);
            await this.saveToken(newToken);
        }
        catch {
            return false;
        }
        return true;
    }
    async saveToken(token) {
        try {
            const encrypted = this.cipher.update(JSON.stringify(token), 'utf8', 'hex') + this.cipher.final('hex');
            (0, node_fs_1.writeFileSync)(path.join(this.dir, 'auth.json'), encrypted);
        }
        catch (error) {
            process.stderr.write('Error saving tokens:', error);
        }
    }
    async readToken() {
        try {
            const token = (0, node_fs_1.readFileSync)(path.join(this.dir, 'auth.json'), 'utf8');
            const decrypted = this.decipher.update(token, 'hex', 'utf8') + this.decipher.final('utf8');
            return decrypted ? JSON.parse(decrypted) : null;
        }
        catch {
            return null;
        }
    }
    async removeToken() {
        const tokenPath = path.join(this.dir, 'auth.json');
        if ((0, node_fs_1.existsSync)(tokenPath)) {
            (0, node_fs_1.rmSync)(tokenPath);
        }
    }
}
exports.RedoclyOAuthClient = RedoclyOAuthClient;
