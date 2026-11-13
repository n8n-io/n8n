/**
 * Community and custom nodes: the node and credential types that an n8n
 * instance loads besides `n8n-nodes-base` and `@n8n/n8n-nodes-langchain`.
 *
 * The host loads them with n8n-core's own loaders, as n8n's CLI does
 * (`LoadNodesAndCredentials`):
 * - installed community packages: each package in `<nodes dir>/node_modules`
 *   (`n8n-nodes-*` and `@scope/n8n-nodes-*`) with a `PackageDirectoryLoader`.
 *   A node type is `<package name>.<node name>`;
 * - custom folders: each folder with a `CustomDirectoryLoader` (`*.node.js`,
 *   `*.credentials.js` and linked packages). A node type is `CUSTOM.<node name>`.
 *
 * The folders: `WF_FALLBACK_NODES_DIR` and `WF_FALLBACK_CUSTOM_EXTENSIONS`
 * (folders separated by `;`), which n8n sets to the folders of the instance.
 * Without them, the folders of n8n's defaults: `<N8N_USER_FOLDER>/.n8n/nodes`,
 * `<N8N_USER_FOLDER>/.n8n/custom` and `N8N_CUSTOM_EXTENSIONS`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import Module from 'node:module';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

import { CustomDirectoryLoader, PackageDirectoryLoader } from 'n8n-core';
import type { DirectoryLoader } from 'n8n-core';
import type { ICredentialType, INodeType, IVersionedNodeType } from 'n8n-workflow';

import { isJsonObject } from './protocol';

export interface ExtensionFolders {
	/** The `node_modules` folder of the installed community packages. */
	packages: string;
	/** Custom extension folders. */
	custom: string[];
}

/** The folders that n8n loads extensions from, for this environment. */
export function extensionFolders(env: NodeJS.ProcessEnv = process.env): ExtensionFolders {
	const n8nFolder = join(env.N8N_USER_FOLDER ?? homedir(), '.n8n');
	const nodesDir = env.WF_FALLBACK_NODES_DIR ?? join(n8nFolder, 'nodes');
	const custom =
		env.WF_FALLBACK_CUSTOM_EXTENSIONS !== undefined
			? env.WF_FALLBACK_CUSTOM_EXTENSIONS.split(';')
			: [join(n8nFolder, 'custom'), ...(env.N8N_CUSTOM_EXTENSIONS?.split(';') ?? [])];
	return { packages: join(nodesDir, 'node_modules'), custom: custom.filter((d) => d !== '') };
}

/** The package folders in `node_modules`, as `scanDirectoryForPackages` of n8n-core finds them. */
function packageFolders(nodeModules: string): string[] {
	if (!existsSync(nodeModules)) return [];
	const out: string[] = [];
	for (const entry of readdirSync(nodeModules, { withFileTypes: true })) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (/\.backup-\d+$/.test(entry.name)) continue;
		if (entry.name.startsWith('@')) {
			const scope = join(nodeModules, entry.name);
			for (const inner of readdirSync(scope)) {
				if (inner.startsWith('n8n-nodes-')) out.push(join(scope, inner));
			}
		} else if (entry.name.startsWith('n8n-nodes-')) {
			out.push(join(nodeModules, entry.name));
		}
	}
	return out.filter((dir) => {
		try {
			const pkg: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
			return isJsonObject(pkg) && isJsonObject(pkg.n8n);
		} catch {
			return false;
		}
	});
}

/**
 * Lets the code of an extension resolve the packages of the host (`n8n-workflow`
 * and the like), as n8n's CLI does with `NODE_PATH`.
 */
function shareModulePaths(): void {
	const paths = (module.paths ?? []).join(delimiter);
	const current = process.env.NODE_PATH;
	if (current?.includes(paths)) return;
	process.env.NODE_PATH = [paths, current].filter(Boolean).join(delimiter);
	const initPaths: unknown = Reflect.get(Module, '_initPaths');
	if (typeof initPaths === 'function') Reflect.apply(initPaths, Module, []);
}

export class HostExtensions {
	private loaders: DirectoryLoader[] = [];

	private loading: Promise<void> | undefined;

	constructor(private readonly folders: ExtensionFolders = extensionFolders()) {}

	/** Loads every extension once. Later calls wait for the first. */
	async load(): Promise<void> {
		this.loading ??= this.loadAll();
		await this.loading;
	}

	/** The node type of an extension (`<package>.<node>` or `CUSTOM.<node>`), if loaded. */
	nodeType(type: string): INodeType | IVersionedNodeType | undefined {
		const dot = type.lastIndexOf('.');
		if (dot <= 0) return undefined;
		const [pkg, name] = [type.slice(0, dot), type.slice(dot + 1)];
		for (const loader of this.loaders) {
			if (loader.packageName !== pkg) continue;
			try {
				return loader.getNode(name).type;
			} catch {
				// Not in this loader: another custom folder can have it.
			}
		}
		return undefined;
	}

	/** The credential type of an extension, if loaded. */
	credentialType(name: string): ICredentialType | undefined {
		for (const loader of this.loaders) {
			try {
				return loader.getCredential(name).type;
			} catch {
				// Not in this loader.
			}
		}
		return undefined;
	}

	/** The types that credential type `name` extends, as declared by its extension. */
	credentialParents(name: string): string[] | undefined {
		for (const loader of this.loaders) {
			const known = loader.known.credentials[name];
			if (known) return known.extends ?? [];
		}
		return undefined;
	}

	private async loadAll(): Promise<void> {
		const loaders: DirectoryLoader[] = [];
		for (const dir of packageFolders(this.folders.packages)) {
			loaders.push(new PackageDirectoryLoader(dir));
		}
		for (const dir of this.folders.custom) {
			if (existsSync(dir)) loaders.push(new CustomDirectoryLoader(dir));
		}
		if (loaders.length === 0) return;
		shareModulePaths();
		for (const loader of loaders) {
			try {
				await loader.loadAll();
				this.loaders.push(loader);
			} catch (error) {
				// As n8n: a package that does not load is left out; the others load.
				process.stderr.write(
					`fallback host: the extension ${loader.packageName} (${loader.directory}) did not load: ${
						error instanceof Error ? error.message : String(error)
					}\n`,
				);
			}
		}
	}
}

let instance: HostExtensions | undefined;

/** The extensions of this process, with the folders of the environment at first use. */
export function hostExtensions(): HostExtensions {
	instance ??= new HostExtensions();
	return instance;
}
