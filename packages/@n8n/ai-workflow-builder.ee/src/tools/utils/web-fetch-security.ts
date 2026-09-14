/**
 * WebFetchSecurityManager — encapsulates domain-approval, budget tracking,
 * and state-propagation logic for the WebFetchTool
 */
import type { BaseMessage } from '@langchain/core/messages';
import { getCurrentTaskInput } from '@langchain/langgraph';

import { WEB_FETCH_MAX_PER_TURN } from '@/constants';

import { isAllowedDomain } from './allowed-domains';
import { isUrlInUserMessages } from './web-fetch.utils';

export interface WebFetchSecurityManager {
	isHostAllowed(host: string, url: string): boolean;
	approveDomain(domain: string): void;
	approveAllDomains(): void;
	hasBudget(): boolean;
	recordFetch(): void;
	getStateUpdates(): WebFetchSecurityStateUpdates;
}

export interface WebFetchSecurityStateUpdates {
	approvedDomains?: string[];
	allDomainsApproved?: boolean;
}

/** Mutable state object backing the closure-based factory */
export interface MutableWebFetchState {
	approvedDomains: string[];
	allDomainsApproved: boolean;
	webFetchCount: number;
	messages: BaseMessage[];
}

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
			const updates: WebFetchSecurityStateUpdates = {};
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

/**
 * Core factory function for creating WebFetchSecurityManagers.
 */
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
