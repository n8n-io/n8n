import { homedir } from 'node:os';
import * as path from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { type AuthToken, RedoclyOAuthDeviceFlow } from './device-flow';

const SALT = '4618dbc9-8aed-4e27-aaf0-225f4603e5a4';
const CRYPTO_ALGORITHM = 'aes-256-cbc';

export class RedoclyOAuthClient {
  private dir: string;
  private cipher: crypto.Cipher;
  private decipher: crypto.Decipher;

  constructor(private clientName: string, private version: string) {
    this.dir = path.join(homedir(), '.redocly');
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir);
    }

    const homeDirPath = process.env.HOME as string;
    const hash = crypto.createHash('sha256');
    hash.update(`${homeDirPath}${SALT}`);
    const hashHex = hash.digest('hex');

    const key = Buffer.alloc(
      32,
      Buffer.from(hashHex).toString('base64')
    ).toString() as crypto.CipherKey;
    const iv = Buffer.alloc(
      16,
      Buffer.from(process.env.HOME as string).toString('base64')
    ).toString() as crypto.BinaryLike;
    this.cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, key, iv);
    this.decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, key, iv);
  }

  async login(baseUrl: string) {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl, this.clientName, this.version);

    const token = await deviceFlow.run();
    if (!token) {
      throw new Error('Failed to login');
    }
    this.saveToken(token);
  }

  async logout() {
    try {
      this.removeToken();
    } catch (err) {
      // do nothing
    }
  }

  async isAuthorized(baseUrl: string, apiKey?: string) {
    const deviceFlow = new RedoclyOAuthDeviceFlow(baseUrl, this.clientName, this.version);

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
    } catch {
      return false;
    }

    return true;
  }

  private async saveToken(token: AuthToken) {
    try {
      const encrypted =
        this.cipher.update(JSON.stringify(token), 'utf8', 'hex') + this.cipher.final('hex');
      writeFileSync(path.join(this.dir, 'auth.json'), encrypted);
    } catch (error) {
      process.stderr.write('Error saving tokens:', error);
    }
  }

  private async readToken() {
    try {
      const token = readFileSync(path.join(this.dir, 'auth.json'), 'utf8');
      const decrypted = this.decipher.update(token, 'hex', 'utf8') + this.decipher.final('utf8');
      return decrypted ? JSON.parse(decrypted) : null;
    } catch {
      return null;
    }
  }

  private async removeToken() {
    const tokenPath = path.join(this.dir, 'auth.json');
    if (existsSync(tokenPath)) {
      rmSync(tokenPath);
    }
  }
}
