/**
 * WebFetchSecurityManager — encapsulates domain-approval, budget tracking,
 * and state-propagation logic that was previously spread across WebFetchHooks.
 */
import type { BaseMessage } from '@langchain/core/messages';
import { getCurrentTaskInput } from '@langchain/langgraph';

import { WEB_FETCH_MAX_PER_TURN } from '@/constants';

import { isAllowedDomain } from './utils/allowed-domains';
import { isUrlInUserMessages } from './utils/web-fetch.utils';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface WebFetchSecurityManager {
	isHostAllowed(host: string, url: string): boolean;
	approveDomain(domain: string): void;
	approveAllDomains(): void;
	hasBudget(): boolean;
	recordFetch(): void;
	getStateUpdates(): WebFetchSecurityStateUpdates;
}

export interface WebFetchSecurityStateUpdates {
	webFetchCount: number;
	approvedDomains?: string[];
	allDomainsApproved?: boolean;
}

/** Mutable state object backing the closure-based (planner) factory */
export interface MutableWebFetchState {
	approvedDomains: string[];
	allDomainsApproved: boolean;
	webFetchCount: number;
	messages: BaseMessage[];
}

// ---------------------------------------------------------------------------
// Private implementation (closure-based)
// ---------------------------------------------------------------------------

function createSecurityManager(config: {
	approvedDomains: string[];
	allDomainsApproved: boolean;
	webFetchCount: number;
	messages: BaseMessage[];
	maxFetchesPerTurn: number;
}): WebFetchSecurityManager {
	const approvedDomains = [...config.approvedDomains];
	const newlyApprovedDomains: string[] = [];
	let allDomainsApproved = config.allDomainsApproved;
	let webFetchCount = config.webFetchCount;

	return {
		isHostAllowed(host, url) {
			if (allDomainsApproved) return true;
			if (isAllowedDomain(host)) return true;
			if (approvedDomains.includes(host)) return true;
			if (isUrlInUserMessages(url, config.messages)) return true;
			return false;
		},
		approveDomain(domain) {
			if (!approvedDomains.includes(domain)) {
				approvedDomains.push(domain);
				newlyApprovedDomains.push(domain);
			}
		},
		approveAllDomains() {
			allDomainsApproved = true;
		},
		hasBudget() {
			return webFetchCount < config.maxFetchesPerTurn;
		},
		recordFetch() {
			webFetchCount++;
		},
		getStateUpdates() {
			const updates: WebFetchSecurityStateUpdates = { webFetchCount };
			if (newlyApprovedDomains.length > 0) {
				updates.approvedDomains = newlyApprovedDomains;
			}
			if (allDomainsApproved && !config.allDomainsApproved) {
				updates.allDomainsApproved = true;
			}
			return updates;
		},
	};
}

// ---------------------------------------------------------------------------
// LangGraph state shape (read via getCurrentTaskInput)
// ---------------------------------------------------------------------------

interface WebFetchSecurityManagerState {
	approvedDomains?: string[];
	allDomainsApproved?: boolean;
	webFetchCount?: number;
	messages?: BaseMessage[];
}

// ---------------------------------------------------------------------------
// Shared factory core
// ---------------------------------------------------------------------------

interface SecurityManagerFactoryOptions {
	stateProvider: () => {
		approvedDomains: string[];
		allDomainsApproved: boolean;
		webFetchCount: number;
		messages: BaseMessage[];
	};
	writeThrough?: MutableWebFetchState;
}

function createFactory(options: SecurityManagerFactoryOptions): () => WebFetchSecurityManager {
	return () => {
		const state = options.stateProvider();
		const inner = createSecurityManager({ ...state, maxFetchesPerTurn: WEB_FETCH_MAX_PER_TURN });

		if (!options.writeThrough) return inner;

		const target = options.writeThrough;
		return {
			isHostAllowed: (host: string, url: string) => inner.isHostAllowed(host, url),
			hasBudget: () => inner.hasBudget(),
			getStateUpdates: () => inner.getStateUpdates(),
			approveDomain(domain) {
				inner.approveDomain(domain);
				if (!target.approvedDomains.includes(domain)) target.approvedDomains.push(domain);
			},
			approveAllDomains() {
				inner.approveAllDomains();
				target.allDomainsApproved = true;
			},
			recordFetch() {
				inner.recordFetch();
				target.webFetchCount++;
			},
		};
	};
}

// ---------------------------------------------------------------------------
// Public factory: LangGraph subgraph contexts
// ---------------------------------------------------------------------------

/**
 * Factory for LangGraph subgraph contexts where state propagation
 * happens via Command reducers. Reads lazily from getCurrentTaskInput()
 * at each tool invocation.
 */
export function createLangGraphSecurityManagerFactory(): () => WebFetchSecurityManager {
	return createFactory({
		stateProvider: () => {
			const s = getCurrentTaskInput<WebFetchSecurityManagerState>();
			return {
				approvedDomains: s.approvedDomains ?? [],
				allDomainsApproved: s.allDomainsApproved === true,
				webFetchCount: s.webFetchCount ?? 0,
				messages: s.messages ?? [],
			};
		},
	});
}

// ---------------------------------------------------------------------------
// Public factory: caller-owned mutable state
// ---------------------------------------------------------------------------

/**
 * Factory backed by a caller-owned mutable state object.
 * The caller seeds the object before each agent invocation;
 * the factory creates a manager that writes-through to the mutable state.
 */
export function createMutableSecurityManagerFactory(
	mutableState: MutableWebFetchState,
): () => WebFetchSecurityManager {
	return createFactory({
		stateProvider: () => mutableState,
		writeThrough: mutableState,
	});
}
