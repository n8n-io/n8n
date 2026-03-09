import { HumanMessage } from '@langchain/core/messages';

import { WEB_FETCH_MAX_PER_TURN } from '@/constants';
import type { MutableWebFetchState } from '@/tools/utils/web-fetch-security';
import {
	createLangGraphSecurityManagerFactory,
	createMutableSecurityManagerFactory,
} from '@/tools/utils/web-fetch-security';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetCurrentTaskInput = jest.fn();
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: (...args: unknown[]) => mockGetCurrentTaskInput(...args) as unknown,
}));

const mockIsAllowedDomain = jest.fn();
jest.mock('@/tools/utils/allowed-domains', () => ({
	isAllowedDomain: (...args: unknown[]) => mockIsAllowedDomain(...args) as boolean,
}));

beforeEach(() => {
	jest.resetAllMocks();
	mockIsAllowedDomain.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// createSecurityManager (tested via factories)
// ---------------------------------------------------------------------------

describe('WebFetchSecurityManager', () => {
	describe('isHostAllowed', () => {
		it('should allow host when allDomainsApproved is true', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: true,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('unknown.com', 'https://unknown.com/page')).toBe(true);
		});

		it('should allow host on the allowed-domain list', () => {
			mockIsAllowedDomain.mockReturnValue(true);

			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('docs.example.com', 'https://docs.example.com')).toBe(true);
			expect(mockIsAllowedDomain).toHaveBeenCalledWith('docs.example.com');
		});

		it('should allow host in approvedDomains', () => {
			const state: MutableWebFetchState = {
				approvedDomains: ['example.com'],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('example.com', 'https://example.com/page')).toBe(true);
		});

		it('should allow URL found in user messages', () => {
			const messages = [new HumanMessage('Check https://user-sent.com/page')];
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages,
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('user-sent.com', 'https://user-sent.com/page')).toBe(true);
		});

		it('should reject host that matches none of the criteria', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('evil.com', 'https://evil.com/page')).toBe(false);
		});
	});

	describe('approveDomain', () => {
		it('should make a domain allowed on subsequent checks', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('new.com', 'https://new.com')).toBe(false);
			manager.approveDomain('new.com');
			expect(manager.isHostAllowed('new.com', 'https://new.com')).toBe(true);
		});

		it('should be idempotent (no duplicate entries)', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			manager.approveDomain('dup.com');
			manager.approveDomain('dup.com');

			const updates = manager.getStateUpdates();
			expect(updates.approvedDomains).toEqual(['dup.com']);
		});
	});

	describe('approveAllDomains', () => {
		it('should make all hosts allowed', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.isHostAllowed('any.com', 'https://any.com')).toBe(false);
			manager.approveAllDomains();
			expect(manager.isHostAllowed('any.com', 'https://any.com')).toBe(true);
		});
	});

	describe('hasBudget / recordFetch', () => {
		it('should have budget when under the limit', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.hasBudget()).toBe(true);
		});

		it('should exhaust budget after max fetches', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			for (let i = 0; i < WEB_FETCH_MAX_PER_TURN; i++) {
				expect(manager.hasBudget()).toBe(true);
				manager.recordFetch();
			}
			expect(manager.hasBudget()).toBe(false);
		});

		it('should start without budget when count already at limit', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: WEB_FETCH_MAX_PER_TURN,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.hasBudget()).toBe(false);
		});
	});

	describe('getStateUpdates', () => {
		it('should return empty object when nothing changed', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.getStateUpdates()).toEqual({});
		});

		it('should include newly approved domains', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			manager.approveDomain('a.com');
			manager.approveDomain('b.com');
			manager.recordFetch();

			expect(manager.getStateUpdates()).toEqual({
				approvedDomains: ['a.com', 'b.com'],
			});
		});

		it('should include allDomainsApproved when newly set', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: false,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			manager.approveAllDomains();

			expect(manager.getStateUpdates()).toEqual({
				allDomainsApproved: true,
			});
		});

		it('should NOT include allDomainsApproved if it was already true', () => {
			const state: MutableWebFetchState = {
				approvedDomains: [],
				allDomainsApproved: true,
				webFetchCount: 0,
				messages: [],
			};
			const manager = createMutableSecurityManagerFactory(state)();

			expect(manager.getStateUpdates().allDomainsApproved).toBeUndefined();
		});
	});
});

// ---------------------------------------------------------------------------
// createMutableSecurityManagerFactory — write-through behaviour
// ---------------------------------------------------------------------------

describe('createMutableSecurityManagerFactory', () => {
	it('should write-through approveDomain to mutable state', () => {
		const state: MutableWebFetchState = {
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages: [],
		};
		const manager = createMutableSecurityManagerFactory(state)();

		manager.approveDomain('wt.com');

		expect(state.approvedDomains).toContain('wt.com');
	});

	it('should write-through approveAllDomains to mutable state', () => {
		const state: MutableWebFetchState = {
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages: [],
		};
		const manager = createMutableSecurityManagerFactory(state)();

		manager.approveAllDomains();

		expect(state.allDomainsApproved).toBe(true);
	});

	it('should write-through recordFetch to mutable state', () => {
		const state: MutableWebFetchState = {
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages: [],
		};
		const manager = createMutableSecurityManagerFactory(state)();

		manager.recordFetch();
		manager.recordFetch();

		expect(state.webFetchCount).toBe(2);
	});

	it('should read messages from mutable state for provenance checks', () => {
		const messages = [new HumanMessage('Visit https://site.com')];
		const state: MutableWebFetchState = {
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages,
		};
		const manager = createMutableSecurityManagerFactory(state)();

		expect(manager.isHostAllowed('site.com', 'https://site.com')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// createLangGraphSecurityManagerFactory
// ---------------------------------------------------------------------------

describe('createLangGraphSecurityManagerFactory', () => {
	it('should read state lazily from getCurrentTaskInput on each call', () => {
		mockGetCurrentTaskInput.mockReturnValue({
			approvedDomains: ['lazy.com'],
			allDomainsApproved: false,
			webFetchCount: 1,
			messages: [],
		});

		const factory = createLangGraphSecurityManagerFactory();
		const manager = factory();

		expect(mockGetCurrentTaskInput).toHaveBeenCalledTimes(1);
		expect(manager.isHostAllowed('lazy.com', 'https://lazy.com')).toBe(true);
	});

	it('should default missing state fields', () => {
		mockGetCurrentTaskInput.mockReturnValue({});

		const factory = createLangGraphSecurityManagerFactory();
		const manager = factory();

		expect(manager.hasBudget()).toBe(true);
		expect(manager.isHostAllowed('any.com', 'https://any.com')).toBe(false);
	});

	it('should NOT write-through (pure read-only snapshot)', () => {
		const stateObj = {
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages: [],
		};
		mockGetCurrentTaskInput.mockReturnValue(stateObj);

		const factory = createLangGraphSecurityManagerFactory();
		const manager = factory();

		manager.approveDomain('new.com');
		manager.recordFetch();

		// Original state object should be untouched
		expect(stateObj.approvedDomains).toEqual([]);
		expect(stateObj.webFetchCount).toBe(0);
	});

	it('should pass messages for URL provenance checks', () => {
		const messages = [new HumanMessage('https://user-url.com')];
		mockGetCurrentTaskInput.mockReturnValue({
			approvedDomains: [],
			allDomainsApproved: false,
			webFetchCount: 0,
			messages,
		});

		const factory = createLangGraphSecurityManagerFactory();
		const manager = factory();

		expect(manager.isHostAllowed('user-url.com', 'https://user-url.com')).toBe(true);
	});
});
