import { ref, type Ref } from 'vue';

import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiPanelStore } from '../instanceAiPanel.store';
import type { ProactiveOffer } from '../instanceAiPanel.types';
import {
	INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY,
	INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS,
} from '../constants';

function readDismissedKeys(): Set<string> {
	try {
		const raw = localStorage.getItem(INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY);
		if (!raw) return new Set();
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((value): value is string => typeof value === 'string'));
	} catch {
		return new Set();
	}
}

function writeDismissedKeys(keys: Set<string>): void {
	localStorage.setItem(INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY, JSON.stringify([...keys]));
}

/** Shared across every trigger + the bubble host so accept/dismiss stay in sync. */
const activeOffer = ref<ProactiveOffer | null>(null);
const offeredKeys = new Set<string>();
const dismissedKeys = readDismissedKeys();

let dwellTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOffer: ProactiveOffer | null = null;
let interactionCleanups: Array<() => void> = [];

function clearInteractionListeners(): void {
	for (const cleanup of interactionCleanups) cleanup();
	interactionCleanups = [];
}

function clearDwell(): void {
	if (dwellTimer !== null) {
		clearTimeout(dwellTimer);
		dwellTimer = null;
	}
	clearInteractionListeners();
	pendingOffer = null;
}

function clearActiveOffer(): void {
	clearDwell();
	activeOffer.value = null;
}

/**
 * Shared restraint rules for every proactive Instance AI offer trigger.
 * Triggers call `raise(offer)`; the bubble host reads `activeOffer` and wires
 * accept / dismiss back through this composable. Accept opens the panel with a
 * prefilled draft — the user still has to send. State is module-scoped so every
 * caller shares one offer pipeline.
 */
export function useInstanceAiProactiveOffer(): {
	activeOffer: Ref<ProactiveOffer | null>;
	raise: (offer: ProactiveOffer) => void;
	accept: () => Promise<boolean>;
	dismiss: () => void;
	clear: () => void;
} {
	const panelStore = useInstanceAiPanelStore();
	const instanceAiStore = useInstanceAiStore();
	const instanceAiAvailable = useInstanceAiAvailable();

	function isStreaming(): boolean {
		const threadId = panelStore.activeThreadId;
		if (!threadId) return false;
		const runtime = instanceAiStore.getRuntime(threadId);
		return Boolean(runtime?.isStreaming || runtime?.isSendingMessage);
	}

	function isSuppressed(): boolean {
		return panelStore.isOpen || isStreaming();
	}

	function showOffer(offer: ProactiveOffer): void {
		if (!instanceAiAvailable.value || isSuppressed()) return;
		if (dismissedKeys.has(offer.key) || offeredKeys.has(offer.key)) return;

		offeredKeys.add(offer.key);
		activeOffer.value = offer;
	}

	function scheduleDwell(offer: ProactiveOffer): void {
		clearDwell();
		pendingOffer = offer;

		const onInteract = () => {
			if (!pendingOffer) return;
			scheduleDwell(pendingOffer);
		};

		window.addEventListener('pointerdown', onInteract, true);
		window.addEventListener('keydown', onInteract, true);
		interactionCleanups.push(
			() => window.removeEventListener('pointerdown', onInteract, true),
			() => window.removeEventListener('keydown', onInteract, true),
		);

		dwellTimer = setTimeout(() => {
			const ready = pendingOffer;
			clearDwell();
			if (ready) showOffer(ready);
		}, INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
	}

	function raise(offer: ProactiveOffer): void {
		if (!instanceAiAvailable.value) return;
		if (dismissedKeys.has(offer.key) || offeredKeys.has(offer.key)) return;
		if (activeOffer.value?.key === offer.key) return;
		if (pendingOffer?.key === offer.key) return;
		if (isSuppressed()) return;

		scheduleDwell(offer);
	}

	async function accept(): Promise<boolean> {
		const offer = activeOffer.value;
		if (!offer) return false;
		activeOffer.value = null;
		return await panelStore.openWithSeed(offer);
	}

	function dismiss(): void {
		const offer = activeOffer.value ?? pendingOffer;
		clearActiveOffer();
		if (!offer) return;
		dismissedKeys.add(offer.key);
		offeredKeys.add(offer.key);
		writeDismissedKeys(dismissedKeys);
	}

	return {
		activeOffer,
		raise,
		accept,
		dismiss,
		clear: clearActiveOffer,
	};
}

/** Test-only: reset module state between cases. */
export function resetInstanceAiProactiveOfferStateForTests(): void {
	clearActiveOffer();
	offeredKeys.clear();
	dismissedKeys.clear();
	try {
		localStorage.removeItem(INSTANCE_AI_PROACTIVE_DISMISSED_STORAGE_KEY);
	} catch {
		// ignore
	}
}

/** Test-only: reload dismissed keys from localStorage after seeding it. */
export function reloadInstanceAiProactiveDismissalsForTests(): void {
	dismissedKeys.clear();
	for (const key of readDismissedKeys()) {
		dismissedKeys.add(key);
	}
}
