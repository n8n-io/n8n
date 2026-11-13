/**
 * The credential types of `n8n-nodes-base` and `@n8n/n8n-nodes-langchain`,
 * loaded on demand from the `dist/known/credentials.json` index of each
 * package. The fallback host needs them to sign requests (`authenticate`).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { ICredentialType } from 'n8n-workflow';

import { hostExtensions } from './extensions';
import { langchainRoot } from './node-types';
import { isJsonObject } from './protocol';

const load = createRequire(__filename);

interface KnownCredential {
	className: string;
	sourcePath: string;
	extends?: string[];
}

function isKnownCredential(value: unknown): value is KnownCredential {
	return (
		isJsonObject(value) &&
		typeof value.className === 'string' &&
		typeof value.sourcePath === 'string'
	);
}

function isCredentialType(value: unknown): value is ICredentialType {
	return typeof value === 'object' && value !== null && 'name' in value && 'properties' in value;
}

export class HostCredentialTypes {
	private readonly roots = [dirname(load.resolve('n8n-nodes-base/package.json')), langchainRoot()];

	private known: Array<{ root: string; index: Record<string, unknown> }> | undefined;

	private readonly loaded = new Map<string, ICredentialType>();

	/** The credential type, or undefined when no package has it. */
	get(name: string): ICredentialType | undefined {
		const cached = this.loaded.get(name);
		if (cached) return cached;
		const found = this.find(name);
		// A credential type of a community or custom node package (`extensions.ts`).
		if (!found) return hostExtensions().credentialType(name);
		const exported: unknown = load(join(found.root, found.entry.sourcePath));
		const ctor: unknown =
			typeof exported === 'object' && exported !== null
				? Reflect.get(exported, found.entry.className)
				: undefined;
		if (typeof ctor !== 'function') return undefined;
		const instance: unknown = Reflect.construct(ctor, []);
		if (!isCredentialType(instance)) return undefined;
		this.loaded.set(name, instance);
		return instance;
	}

	/** The types that `name` extends, nearest first, as `CredentialTypes.getParentTypes` gives them. */
	parentTypes(name: string): string[] {
		const parents =
			this.find(name)?.entry.extends ?? hostExtensions().credentialParents(name) ?? [];
		return parents.flatMap((parent) => [parent, ...this.parentTypes(parent)]);
	}

	private find(name: string): { root: string; entry: KnownCredential } | undefined {
		this.known ??= this.roots.map((root) => {
			const index: unknown = load(join(root, 'dist/known/credentials.json'));
			return { root, index: isJsonObject(index) ? index : {} };
		});
		for (const { root, index } of this.known) {
			const entry = index[name];
			if (isKnownCredential(entry)) return { root, entry };
		}
		return undefined;
	}
}
