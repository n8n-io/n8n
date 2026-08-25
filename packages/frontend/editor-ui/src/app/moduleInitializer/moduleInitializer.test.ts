import { createPinia, setActivePinia } from 'pinia';
import { assertUniqueRouteNames, modalRegistry } from '@n8n/frontend-module-sdk';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import router from '@/app/router';
import { VIEWS } from '@/app/constants';
import { modules } from '@/app/modules.manifest';
import { registerModuleModals } from '@/app/moduleInitializer/moduleInitializer';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
} from '@/features/core/dataTable/constants';

describe('registerModuleModals', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it('registers a module-owned modal from its descriptor', () => {
		registerModuleModals();

		expect(modalRegistry.has(ADD_DATA_TABLE_MODAL_KEY)).toBe(true);
	});

	it.each([DOWNLOAD_DATA_TABLE_MODAL_KEY, IMPORT_CSV_MODAL_KEY])(
		'declares %s as an ad-hoc prefix, so per-row keys are not treated as unregistered',
		(prefix) => {
			registerModuleModals();

			expect(modalRegistry.isAdHocKey(`${prefix}-some-table-id`)).toBe(true);
		},
	);

	it('leaves a key that matches no declared prefix unknown', () => {
		registerModuleModals();

		expect(modalRegistry.isAdHocKey('aModalNobodyRegistered')).toBe(false);
	});

	// Post-login registration runs again after a re-login in the same page
	// session, so replaying it must stay silent and lossless.
	it('replays registration without warning and keeps every modal', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		registerModuleModals();
		const keysAfterFirstRun = modalRegistry.getKeys();

		registerModuleModals();

		expect(consoleSpy).not.toHaveBeenCalled();
		expect(modalRegistry.getKeys()).toEqual(keysAfterFirstRun);

		consoleSpy.mockRestore();
	});
});

/**
 * `registerModuleRoutes` runs this guard against the real router before it adds
 * anything, so these exercise the shipped manifest rather than a stand-in.
 */
describe('module route names against the shell', () => {
	it('does not collide with any route the shell registers', () => {
		expect(() => assertUniqueRouteNames(modules, router)).not.toThrow();
	});

	it('rejects a module that claims a shell route name', () => {
		const squatter: FrontendModuleDescription = {
			id: 'squatter',
			name: 'Squatter',
			description: '',
			icon: 'box',
			routes: [{ path: '/squat', name: VIEWS.WORKFLOWS, component: { render: () => null } }],
		};

		expect(() => assertUniqueRouteNames([squatter], router)).toThrow(
			`Duplicate route name "${VIEWS.WORKFLOWS}" declared by module "squatter" — already taken by the app shell.`,
		);
	});
});
