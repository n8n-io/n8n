import type { CommandBarEntry } from '../types/command';

const commands = new Map<string, CommandBarEntry>();
const listeners = new Set<(commands: CommandBarEntry[]) => void>();

export function getAll(): CommandBarEntry[] {
	return Array.from(commands.values());
}

function notifyListeners(): void {
	// One array per listener, as `modalRegistry` does: `sort`, `reverse` and
	// `splice` mutate in place, so a shared snapshot lets one subscriber reorder
	// the list for every later one.
	listeners.forEach((listener) => listener(getAll()));
}

export function register(command: CommandBarEntry): void {
	if (commands.has(command.id)) {
		console.warn(`Command with id "${command.id}" is already registered. Skipping.`);
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
