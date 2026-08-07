import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { SimpleGit } from 'simple-git';

import type { ScopeState } from '../branch-sync-state.service';

export interface ScopeRepo {
	git: SimpleGit;
	dir: string;
}

/**
 * One persistent clone per tracked scope, under `~/.n8n/branch-sync/<scopeKey>`.
 * Deliberately separate from source-control's single `~/.n8n/git` working dir
 * (and its global mutex): each scope needs its own base/head/live workspace.
 */
@Service()
export class ScopeRepoService {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	dirFor(scopeKey: string): string {
		return path.join(this.instanceSettings.n8nFolder, 'branch-sync', scopeKey.replaceAll(':', '-'));
	}

	async getRepo(state: ScopeState): Promise<ScopeRepo> {
		const { simpleGit } = await import('simple-git');
		const dir = this.dirFor(state.scopeKey);
		if (!existsSync(path.join(dir, '.git'))) {
			await mkdir(dir, { recursive: true });
			await simpleGit().clone(state.repoUrl, dir);
			const git = simpleGit(dir);
			await git.addConfig('user.name', 'n8n-branch-sync');
			await git.addConfig('user.email', 'branch-sync@n8n.local');
			return { git, dir };
		}
		return { git: simpleGit(dir), dir };
	}
}
