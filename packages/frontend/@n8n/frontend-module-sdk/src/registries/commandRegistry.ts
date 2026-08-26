import type { CommandBarEntry } from '../types/command';

const commands = new Map<string, CommandBarEntry>();
const listeners = new Set<(commands: CommandBarEntry[]) => void>();

export function getAll(): CommandBarEntry[] {
	return Array.from(commands.values());
}

function notifyListeners(): void {
	// One array per listener: `sort`, `reverse` and `splice` mutate in place.
	listeners.forEach((listener) => listener(getAll()));
}

export function register(command: CommandBarEntry): void {
	const existing = commands.get(command.id);
	if (existing) {
		// Same definition replayed by a re-login is a no-op; a different one
		// claiming a taken id is the real collision.
		if (existing !== command) {
			console.warn(`Command with id "${command.id}" is already registered. Skipping.`);
		}
		return;
	}
	commands.set(command.id, command);
	notifyListeners();
}

export function unregister(id: string): void {
	if (commands.delete(id)) {
		notifyListeners();
	}
}

export function get(id: string): CommandBarEntry | undefined {
	return commands.get(id);
}

export function has(id: string): boolean {
	return commands.has(id);
}

export function subscribe(listener: (commands: CommandBarEntry[]) => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Remove all registered commands. Primarily for test isolation.
 */
export function clear(): void {
	commands.clear();
	notifyListeners();
}
