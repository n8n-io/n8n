import CredentialConfig from './CredentialEdit/CredentialConfig.vue';
import { screen } from '@testing-library/vue';
import type { ICredentialDataDecryptedObject, ICredentialType } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { STORES } from '@n8n/stores';

const defaultRenderOptions: RenderOptions = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: false,
						externalSecrets: false,
					},
				},
			},
		},
	}),
	props: {
		isManaged: true,
		mode: 'edit',
		credentialType: {} as ICredentialType,
		credentialProperties: [],
		credentialData: {} as ICredentialDataDecryptedObject,
		credentialPermissions: {
			share: false,
			move: false,
			create: false,
			read: false,
			update: false,
			delete: false,
			list: false,
		},
	},
};

const renderComponent = createComponentRenderer(CredentialConfig, defaultRenderOptions);

describe('CredentialConfig', () => {
	it('should display a warning when isManaged is true', async () => {
		renderComponent();
		expect(
			screen.queryByText('This is a managed credential and cannot be edited.'),
		).toBeInTheDocument();
	});

	it('should not display a warning when isManaged is false', async () => {
		renderComponent({ props: { isManaged: false } }, { merge: true });
		expect(
			screen.queryByText('This is a managed credential and cannot be edited.'),
		).not.toBeInTheDocument();
	});
});
