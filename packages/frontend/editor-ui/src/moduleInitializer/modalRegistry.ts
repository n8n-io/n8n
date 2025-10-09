import type { ModalDefinition } from '@/moduleInitializer/module.types';

const modals = new Map<string, ModalDefinition>();
const listeners = new Set<(modals: Map<string, ModalDefinition>) => void>();

export function getAll(): Map<string, ModalDefinition> {
	return new Map(modals);
}

function notifyListeners(): void {
	listeners.forEach((listener) => listener(getAll()));
}

export function register(modal: ModalDefinition): void {
	if (modals.has(modal.key)) {
		console.warn(`Modal with key "${modal.key}" is already registered. Skipping.`);
		return;
	}

	modals.set(modal.key, modal);
	notifyListeners();
}

export function unregister(key: string): void {
	if (modals.delete(key)) {
		notifyListeners();
	}
}

export function get(key: string): ModalDefinition | undefined {
	return modals.get(key);
}

export function getKeys(): string[] {
	return Array.from(modals.keys());
}

export function has(key: string): boolean {
	return modals.has(key);
}

export function subscribe(listener: (modals: Map<string, ModalDefinition>) => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
