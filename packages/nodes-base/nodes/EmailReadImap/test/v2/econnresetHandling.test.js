import { EventEmitter } from 'events';
import { mock } from 'vitest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import { EmailReadImapV2 } from '../../v2/EmailReadImapV2.node';
const mockConnection = Object.assign(new EventEmitter(), {
    openBox: vi.fn().mockResolvedValue({}),
    closeBox: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    getPartData: vi.fn(),
    addFlags: vi.fn().mockResolvedValue(undefined),
});
vi.mock('@n8n/imap', () => ({
    connect: vi.fn().mockImplementation(async () => mockConnection),
}));
vi.mock('../../v2/utils', () => ({
    getNewEmails: vi.fn().mockResolvedValue(undefined),
}));
describe('ECONNRESET error handling', () => {
    const staticData = {};
    const triggerFunctions = mock({
        helpers: {
            createDeferredPromise: vi.fn().mockImplementation(() => {
                let resolve;
                let reject;
                const promise = new Promise((res, rej) => {
                    resolve = res;
                    reject = rej;
                });
                return { promise, resolve: resolve, reject: reject };
            }),
        },
    });
    const credentials = {
        host: 'imap.test.com',
        port: 993,
        user: 'user',
        password: 'password',
        secure: false,
        allowUnauthorizedCerts: false,
    };
    const baseDescription = {
        displayName: 'EmailReadImapV2',
        name: 'emailReadImapV2',
        icon: 'file:removeDuplicates.svg',
        group: ['transform'],
        description: 'Test',
    };
    beforeEach(() => {
        mockConnection.removeAllListeners();
        Object.keys(staticData).forEach((key) => delete staticData[key]);
        triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
        triggerFunctions.getNode.mockReturnValue(mock({ typeVersion: 2.1 }));
        triggerFunctions.getNodeParameter.mockImplementation(((param) => {
            const values = {
                mailbox: 'INBOX',
                postProcessAction: 'nothing',
                options: {},
            };
            return values[param];
        }));
        triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
        triggerFunctions.logger.debug = vi.fn();
        triggerFunctions.logger.error = vi.fn();
        triggerFunctions.emitError = vi.fn();
    });
    afterEach(() => vi.clearAllMocks());
    it('should call emitError when ECONNRESET error is received', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        // Simulate ECONNRESET from node-imap
        const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
        mockConnection.emit('error', error);
        expect(triggerFunctions.emitError).toHaveBeenCalledWith(error);
    });
    it('should call emitError on unexpected close (when not reconnecting or shutting down)', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        // Simulate unexpected close without prior error
        mockConnection.emit('close', false);
        expect(triggerFunctions.emitError).toHaveBeenCalledWith(expect.objectContaining({ message: 'IMAP connection closed unexpectedly' }));
    });
    it('should emit a NodeOperationError with an actionable description on unexpected close', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        mockConnection.emit('close', false);
        const emittedError = triggerFunctions.emitError.mock
            .calls[0][0];
        expect(emittedError).toBeInstanceOf(NodeOperationError);
        expect(emittedError.description).toContain('Force Reconnect');
    });
    it('should call emitError only once when ECONNRESET is followed by close', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        // node-imap fires 'error' then 'close' on ECONNRESET
        const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
        mockConnection.emit('error', error);
        mockConnection.emit('close', true);
        // emitError should only be called once — the close handler should
        // not double-fire when the error handler already reported the failure
        expect(triggerFunctions.emitError).toHaveBeenCalledTimes(1);
    });
    it('should remove listeners from connection after close', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        // Listeners were registered during establishConnection
        expect(mockConnection.listenerCount('close')).toBeGreaterThanOrEqual(1);
        expect(mockConnection.listenerCount('error')).toBeGreaterThanOrEqual(1);
        // Simulate ECONNRESET + close
        const error = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
        mockConnection.emit('error', error);
        mockConnection.emit('close', true);
        // Listeners should be cleaned up after the connection dies
        expect(mockConnection.listenerCount('close')).toBe(0);
        expect(mockConnection.listenerCount('error')).toBe(0);
    });
});
//# sourceMappingURL=econnresetHandling.test.js.map