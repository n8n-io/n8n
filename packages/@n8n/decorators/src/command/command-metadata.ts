import { Service } from '@n8n/di';

import type { CommandEntry } from './types';

@Service()
export class CommandMetadata {
	private readonly commands: Map<string, CommandEntry> = new Map();

	register(name: string, entry: CommandEntry) {
		this.commands.set(name, entry);
	}

	get(name: string) {
		return this.commands.get(name);
	}

	getEntries() {
		return [...this.commands.entries()];
	}
}
