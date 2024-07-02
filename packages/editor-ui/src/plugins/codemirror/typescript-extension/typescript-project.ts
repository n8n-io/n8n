// @TODO: Fix lint exceptions
import type { VirtualTypeScriptEnvironment } from '@typescript/vfs';
import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';

import typescript from 'typescript';
import localForage from 'localforage';
import { fetchTypedefsIndex, fetchTypedefsMap } from '@/api/typedefs';
import { INDEX_TS } from './constants';
import { ApplicationError } from 'n8n-workflow';

// @TODO: Implication - TS adds ~900 kB (minified and gzipped) to bundle size
// @TODO: Implication - We now support types, so erase them before execution

export class TypeScriptProject {
	private readonly vfs = new Map<string, string>();

	private readonly store = localForage;

	private state: 'lazy' | 'mid-init' | 'ready';

	private initPromise?: Promise<void>;

	private virtualEnv?: VirtualTypeScriptEnvironment;

	private readonly indexTs = INDEX_TS;

	constructor(indexTsContent: string) {
		this.vfs.set(this.indexTs, indexTsContent || ' ');
		this.state = 'lazy';
		this.initPromise = undefined;
	}

	private async init() {
		this.state = 'mid-init';

		// @TODO: Prevent creation of `local-forage-detect-blob-support`
		this.store.config({
			driver: this.store.INDEXEDDB,
			name: 'n8n',
			storeName: 'typedefs',
		});

		await this.loadTypedefs();

		this.virtualEnv = createVirtualTypeScriptEnvironment(
			createSystem(this.vfs),
			[this.indexTs],
			typescript,
			{
				target: typescript.ScriptTarget.ESNext,
				noImplicitAny: false,
				// @TODO: Decide on tsconfig
			},
		);

		this.state = 'ready';
	}

	// @TODO: Connect to StateField disposal
	dispose() {
		this.assertVirtualEnv(this.virtualEnv);

		this.virtualEnv.languageService.dispose();

		this.state = 'lazy';
		this.initPromise = undefined;
		this.virtualEnv = undefined;
	}

	async getVirtualEnv() {
		if (this.state === 'lazy') {
			this.initPromise = this.init();
			await this.initPromise;
			// this.assertVirtualEnv(this.virtualEnv); // @TODO: Why does this fail?

			return this.virtualEnv!;
		}

		if (this.state === 'mid-init') {
			await this.initPromise;
			// this.assertVirtualEnv(this.virtualEnv);

			return this.virtualEnv!;
		}

		// this.assertVirtualEnv(this.virtualEnv);
		return this.virtualEnv!;
	}

	private assertVirtualEnv(
		virtualEnv?: VirtualTypeScriptEnvironment,
	): asserts virtualEnv is VirtualTypeScriptEnvironment {
		if (virtualEnv !== undefined) {
			throw new ApplicationError('Expected virtual env to be initialized');
		}
	}

	private async loadTypedefs() {
		const isCacheEmpty = (await this.store.getItem('cache_ready')) !== 'true';

		if (isCacheEmpty) {
			await this.store.clear();

			const typedefs = await fetchTypedefsMap(); // ~3 MB
			const entries = Object.entries(typedefs);

			entries.push(['cache_ready', 'true']);
			entries.forEach(([name, content]) => this.vfs.set('/' + name, content));

			await Promise.all(
				entries.map(async ([name, content]) => await this.store.setItem(name, content)),
			);

			return;
		}

		const filenames = await fetchTypedefsIndex(); // ~2 KB

		const cache = await Promise.all(
			filenames.map(async (f) => await this.store.getItem<string>(f)),
		);

		this.assertCache(cache);

		filenames.forEach((f, i) => this.vfs.set('/' + f, cache[i]));
	}

	assertCache(cache: Array<string | null>): asserts cache is string[] {
		if (cache.some((i) => i === null)) {
			throw new ApplicationError('Some typedefs are missing from cache');
		}
	}

	async getDiagnostics() {
		const { languageService } = await this.getVirtualEnv();

		function isDisplayable(
			d: typescript.Diagnostic,
		): d is typescript.Diagnostic & { start: number; length: number } {
			return d.start !== undefined && d.length !== undefined;
		}

		return [
			...languageService.getSemanticDiagnostics(this.indexTs),
			...languageService.getSyntacticDiagnostics(this.indexTs),
		].filter(isDisplayable);
	}

	async getCompletions(position: number) {
		const { languageService } = await this.getVirtualEnv();

		return languageService.getCompletionsAtPosition(this.indexTs, position, {});
	}

	async getQuickInfo(position: number) {
		const { languageService } = await this.getVirtualEnv();

		return languageService.getQuickInfoAtPosition(this.indexTs, position);
	}
}
