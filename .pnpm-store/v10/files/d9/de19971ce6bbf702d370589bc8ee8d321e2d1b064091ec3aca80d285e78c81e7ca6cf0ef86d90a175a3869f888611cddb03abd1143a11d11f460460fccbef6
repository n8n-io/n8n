"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oauth_client_1 = require("../oauth-client");
const device_flow_1 = require("../device-flow");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
jest.mock('node:fs');
jest.mock('node:os');
jest.mock('../device-flow');
describe('RedoclyOAuthClient', () => {
    const mockClientName = 'test-client';
    const mockVersion = '1.0.0';
    const mockBaseUrl = 'https://test.redocly.com';
    const mockHomeDir = '/mock/home/dir';
    const mockRedoclyDir = path.join(mockHomeDir, '.redocly');
    let client;
    beforeEach(() => {
        jest.resetAllMocks();
        os.homedir.mockReturnValue(mockHomeDir);
        process.env.HOME = mockHomeDir;
        client = new oauth_client_1.RedoclyOAuthClient(mockClientName, mockVersion);
    });
    describe('login', () => {
        it('successfully logs in and saves token', async () => {
            const mockToken = { access_token: 'test-token' };
            const mockDeviceFlow = {
                run: jest.fn().mockResolvedValue(mockToken),
            };
            device_flow_1.RedoclyOAuthDeviceFlow.mockImplementation(() => mockDeviceFlow);
            await client.login(mockBaseUrl);
            expect(mockDeviceFlow.run).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
        it('throws error when login fails', async () => {
            const mockDeviceFlow = {
                run: jest.fn().mockResolvedValue(null),
            };
            device_flow_1.RedoclyOAuthDeviceFlow.mockImplementation(() => mockDeviceFlow);
            await expect(client.login(mockBaseUrl)).rejects.toThrow('Failed to login');
        });
    });
    describe('logout', () => {
        it('removes token file if it exists', async () => {
            fs.existsSync.mockReturnValue(true);
            await client.logout();
            expect(fs.rmSync).toHaveBeenCalledWith(path.join(mockRedoclyDir, 'auth.json'));
        });
        it('silently fails if token file does not exist', async () => {
            fs.existsSync.mockReturnValue(false);
            await expect(client.logout()).resolves.not.toThrow();
            expect(fs.rmSync).not.toHaveBeenCalled();
        });
    });
    describe('isAuthorized', () => {
        it('verifies API key if provided', async () => {
            const mockDeviceFlow = {
                verifyApiKey: jest.fn().mockResolvedValue(true),
            };
            device_flow_1.RedoclyOAuthDeviceFlow.mockImplementation(() => mockDeviceFlow);
            const result = await client.isAuthorized(mockBaseUrl, 'test-api-key');
            expect(result).toBe(true);
            expect(mockDeviceFlow.verifyApiKey).toHaveBeenCalledWith('test-api-key');
        });
        it('verifies access token if no API key provided', async () => {
            const mockToken = { access_token: 'test-token' };
            const mockDeviceFlow = {
                verifyToken: jest.fn().mockResolvedValue(true),
            };
            device_flow_1.RedoclyOAuthDeviceFlow.mockImplementation(() => mockDeviceFlow);
            fs.readFileSync.mockReturnValue(client['cipher'].update(JSON.stringify(mockToken), 'utf8', 'hex') +
                client['cipher'].final('hex'));
            const result = await client.isAuthorized(mockBaseUrl);
            expect(result).toBe(true);
            expect(mockDeviceFlow.verifyToken).toHaveBeenCalledWith('test-token');
        });
        it('returns false if token refresh fails', async () => {
            const mockToken = {
                access_token: 'old-token',
                refresh_token: 'refresh-token',
            };
            const mockDeviceFlow = {
                verifyToken: jest.fn().mockResolvedValue(false),
                refreshToken: jest.fn().mockRejectedValue(new Error('Refresh failed')),
            };
            device_flow_1.RedoclyOAuthDeviceFlow.mockImplementation(() => mockDeviceFlow);
            fs.readFileSync.mockReturnValue(client['cipher'].update(JSON.stringify(mockToken), 'utf8', 'hex') +
                client['cipher'].final('hex'));
            const result = await client.isAuthorized(mockBaseUrl);
            expect(result).toBe(false);
        });
    });
});
