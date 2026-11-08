import { createPinia, setActivePinia } from 'pinia';
import type { ResolvedDependency } from '@n8n/api-types';
import { useDependencyMenu } from '@/app/composables/useDependencyMenu';
import { useUIStore } from '@/app/stores/ui.store';

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: vi.fn().mockReturnValue({ href: '/mock-href' }) }),
}));

const usable: ResolvedDependency = { type: 'credentialId', id: 'cred-1', name: 'Shared Cred' };
const unavailable: ResolvedDependency = {
	type: 'credentialId',
	id: 'cred-2',
	name: 'Personal Cred',
	unavailable: true,
};

describe('useDependencyMenu', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('lists an unavailable dependency by name in a disabled group of its own', () => {
		const { buildDependencyMenuItems } = useDependencyMenu();

		const items = buildDependencyMenuItems([usable, unavailable]);

		expect(items.map(({ id, label, disabled }) => ({ id, label, disabled }))).toEqual([
			{ id: 'header-credentialId', label: 'Credentials', disabled: true },
			{ id: 'credentialId:cred-1', label: 'Shared Cred', disabled: undefined },
			{ id: 'header-unavailable', label: 'Not available to you', disabled: true },
			{ id: 'credentialId:cred-2', label: 'Personal Cred', disabled: true },
		]);
	});

	it('shows only the unavailable group when nothing else is usable', () => {
		const { buildDependencyMenuItems } = useDependencyMenu();

		const items = buildDependencyMenuItems([unavailable]);

		expect(items.map((item) => item.id)).toEqual(['header-unavailable', 'credentialId:cred-2']);
		expect(items[0].divided).toBe(false);
	});

	it('does not resolve an unavailable dependency, so it can never be opened', () => {
		const { resolveDependencyMenuId } = useDependencyMenu();

		expect(resolveDependencyMenuId([unavailable], 'credentialId:cred-2')).toBeUndefined();
		expect(resolveDependencyMenuId([usable], 'credentialId:cred-1')).toEqual(usable);
	});

	it('does not open the credential modal for an unavailable dependency', () => {
		const uiStore = useUIStore();
		const openSpy = vi.spyOn(uiStore, 'openExistingCredential').mockImplementation(() => {});
		const { openDependency } = useDependencyMenu();

		openDependency(unavailable);

		expect(openSpy).not.toHaveBeenCalled();
	});
});
