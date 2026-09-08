import { EventEmitter } from 'events';
import { mock } from 'vitest-mock-extended';
import { EmailReadImapV2 } from '../../v2/EmailReadImapV2.node';
let capturedOnMail;
let capturedSearchCriteria = [];
const mockConnection = Object.assign(new EventEmitter(), {
    openBox: vi.fn().mockResolvedValue({}),
    closeBox: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    getPartData: vi.fn(),
    addFlags: vi.fn().mockResolvedValue(undefined),
});
vi.mock('@n8n/imap', () => ({
    connect: vi.fn().mockImplementation(async (config) => {
        capturedOnMail = config.onMail;
        return mockConnection;
    }),
}));
vi.mock('../../v2/utils', () => ({
    getNewEmails: vi.fn().mockImplementation(async function (opts) {
        // Record the searchCriteria for assertion
        capturedSearchCriteria.push([...opts.searchCriteria]);
        // Simulate processing: update lastMessageUid so subsequent onMail calls
        // take the UID push path (line 398-411 in EmailReadImapV2.node.ts)
        const staticData = this.getWorkflowStaticData('node');
        staticData.lastMessageUid = (staticData.lastMessageUid ?? 0) + 1;
    }),
}));
describe('searchCriteria leak on repeated onMail calls', () => {
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
        capturedOnMail = undefined;
        capturedSearchCriteria = [];
        Object.keys(staticData).forEach((key) => delete staticData[key]);
        triggerFunctions.getCredentials.calledWith('imap').mockResolvedValue(credentials);
        triggerFunctions.getNode.mockReturnValue(mock({ typeVersion: 2.1 }));
        triggerFunctions.getNodeParameter.mockImplementation(((param) => {
            const values = {
                mailbox: 'INBOX',
                postProcessAction: 'nothing',
                options: { trackLastMessageId: true },
            };
            return values[param];
        }));
        triggerFunctions.getWorkflowStaticData.calledWith('node').mockReturnValue(staticData);
        triggerFunctions.logger.debug = vi.fn();
        triggerFunctions.logger.error = vi.fn();
    });
    afterEach(() => vi.clearAllMocks());
    it('should not accumulate UID entries in searchCriteria across onMail calls', async () => {
        const node = new EmailReadImapV2(baseDescription);
        await node.trigger.call(triggerFunctions);
        expect(capturedOnMail).toBeDefined();
        // Simulate the first onMail — lastMessageUid is undefined,
        // so it takes the SINCE path, not the UID push path
        await capturedOnMail(1);
        expect(capturedSearchCriteria).toHaveLength(1);
        // After first call, the mock sets lastMessageUid = 1
        // Now fire onMail 10 more times
        for (let i = 0; i < 10; i++) {
            await capturedOnMail(1);
        }
        expect(capturedSearchCriteria).toHaveLength(11);
        // Each onMail call should pass a fresh searchCriteria with at most
        // 2 entries: UNSEEN + one UID filter for the current lastMessageUid.
        // UID entries must NOT accumulate across calls.
        const lastCriteria = capturedSearchCriteria[capturedSearchCriteria.length - 1];
        const uidEntries = lastCriteria.filter((c) => Array.isArray(c) && c[0] === 'UID');
        // Before the fix the UID Entries would accumulate (length > 1) and then lead to a slow memory leak
        expect(uidEntries).toHaveLength(1);
    });
});
//# sourceMappingURL=searchCriteriaLeak.test.js.map