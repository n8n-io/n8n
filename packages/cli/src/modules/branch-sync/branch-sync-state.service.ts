import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import type { ConflictPolicy, ScopeRole } from './engine/types';

const SETTINGS_PREFIX = 'branch-sync.scope.';

export interface ProposalState {
	branch: string;
	/** Fork point vs the target branch; advanced on refresh (D004/D005). */
	masterFork: string;
	/** Last live⇄feature sync point; advanced on update-from-live (D004). */
	liveFork: string;
	/** The resource paths this proposal proposes — restricts update-from-live. */
	paths: string[];
}

export interface ScopeState {
	/** `instance` or `project:<projectId>`. */
	scopeKey: string;
	repoUrl: string;
	branch: string;
	role: ScopeRole;
	editable: boolean;
	policy: ConflictPolicy;
	/** Last successfully synced commit; empty-tree sha until the first sync (D008). */
	baseCommit: string;
	proposals: Record<string, ProposalState>;
}

export function projectIdOfScope(scopeKey: string): string | null {
	return scopeKey.startsWith('project:') ? scopeKey.slice('project:'.length) : null;
}

@Service()
export class BranchSyncStateService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async get(scopeKey: string): Promise<ScopeState | null> {
		const row = await this.settingsRepository.findByKey(SETTINGS_PREFIX + scopeKey);
		return row ? jsonParse<ScopeState>(row.value) : null;
	}

	async list(): Promise<ScopeState[]> {
		const rows = await this.settingsRepository.findByKeyPrefix(SETTINGS_PREFIX);
		return rows.map((row) => jsonParse<ScopeState>(row.value));
	}

	async save(state: ScopeState): Promise<void> {
		await this.settingsRepository.upsertByKey(
			SETTINGS_PREFIX + state.scopeKey,
			JSON.stringify(state),
			false,
			{},
		);
	}
}
