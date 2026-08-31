import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createPinia, setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';

import { PERSONALIZATION_MODAL_KEY } from './users.constants';

/**
 * `users.store` lives in `@n8n/stores` and opens the personalization modal through
 * an injected opener, so its key and the key the app registers under sit on
 * opposite sides of a package boundary. `openModal` *creates* a missing entry
 * rather than throwing, so a divergence between the two is silent: the survey
 * simply never appears. This drives the real wiring from `init.ts` end to end so
 * that divergence fails here instead. (N8N-126)
 *
 * The complementary check — every key a `<ModalRoot>` renders has a definition
 * backing it — lives in `ui.store.registration.spec.ts`.
 */
describe('PERSONALIZATION_MODAL_KEY', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('opens the modal the app registered when users.store fires its opener', () => {
		const uiStore = useUIStore();
		const usersStore = useUsersStore();

		// Assign the settings ref directly; setSettings() runs extra bootstrap logic
		// (auth cookie handling) that a partial fixture can't satisfy.
		useSettingsStore().settings = {
			// `isPersonalizationSurveyEnabled` requires both flags.
			telemetry: { enabled: true },
			personalizationSurveyEnabled: true,
		} as unknown as FrontendSettings;
		usersStore.usersById['1'] = {
			id: '1',
			firstName: 'John Doe',
			role: 'global:owner',
			isPending: false,
			isDefaultUser: false,
			isPendingUser: false,
			mfaEnabled: false,
		};
		usersStore.currentUserId = '1';

		expect(uiStore.modalsById[PERSONALIZATION_MODAL_KEY].open).toBe(false);

		// Exactly what app bootstrap injects (see `init.ts`).
		usersStore.registerModalOpeners({
			openModal: uiStore.openModal,
			openModalWithData: uiStore.openModalWithData,
		});

		usersStore.showPersonalizationSurvey();

		expect(uiStore.modalsById[PERSONALIZATION_MODAL_KEY].open).toBe(true);
	});
});
