import { vi, describe, it, expect, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';

const mocks = vi.hoisted(() => ({
	collaboration: null as null | { doc: object },
	currentUser: null as null | { id: string; firstName?: string; lastName?: string; email?: string },
	setCursor: vi.fn(),
	setSelectedNodeIds: vi.fn(),
	// Plain ref-like stub: `vi.hoisted` runs before imports, so `ref` is unavailable here.
	remoteStates: { value: new Map() },
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({ value: { collaboration: mocks.collaboration } }),
}));
vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ currentUser: mocks.currentUser }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@/app/stores/crdt/useWorkflowDocumentAwareness', () => ({
	useWorkflowDocumentAwareness: () => ({
		remoteStates: mocks.remoteStates,
		setCursor: mocks.setCursor,
		setSelectedNodeIds: mocks.setSelectedNodeIds,
	}),
}));

import { getUserCursorColor, useCanvasAwareness } from './useCanvasAwareness';

describe('getUserCursorColor', () => {
	it('is deterministic for the same user id', () => {
		expect(getUserCursorColor('user-123')).toBe(getUserCursorColor('user-123'));
	});

	it('returns a hex color from the palette', () => {
		expect(getUserCursorColor('user-123')).toMatch(/^#[0-9A-F]{6}$/i);
	});

	it('distributes different ids across colors', () => {
		const colors = new Set(
			Array.from({ length: 20 }, (_, index) => getUserCursorColor(`user-${index}`)),
		);
		expect(colors.size).toBeGreaterThan(1);
	});
});

describe('useCanvasAwareness', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.collaboration = { doc: {} };
		mocks.currentUser = { id: 'u1', firstName: 'Ann', lastName: 'Lee', email: 'ann@n8n.io' };
	});

	it('is inert when collaboration is disabled', () => {
		mocks.collaboration = null;

		const api = useCanvasAwareness(ref([]));
		api.setCursor({ x: 1, y: 2 });

		expect(api.hasAwareness).toBe(false);
		expect(api.remoteStates.value.size).toBe(0);
		expect(mocks.setCursor).not.toHaveBeenCalled();
	});

	it('is inert when no user is loaded', () => {
		mocks.currentUser = null;

		const api = useCanvasAwareness(ref([]));

		expect(api.hasAwareness).toBe(false);
		expect(mocks.setSelectedNodeIds).not.toHaveBeenCalled();
	});

	it('broadcasts cursor and selection when collaboration is active', async () => {
		const selectedNodeIds = ref<string[]>([]);
		const api = useCanvasAwareness(selectedNodeIds);

		expect(api.hasAwareness).toBe(true);
		// Immediate watch broadcasts the initial selection.
		expect(mocks.setSelectedNodeIds).toHaveBeenCalledWith([]);

		api.setCursor({ x: 5, y: 6 });
		expect(mocks.setCursor).toHaveBeenCalledWith({ x: 5, y: 6 });

		selectedNodeIds.value = ['a', 'b'];
		await nextTick();
		expect(mocks.setSelectedNodeIds).toHaveBeenCalledWith(['a', 'b']);
	});
});
