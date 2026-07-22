import { createTestingPinia } from '@pinia/testing';
import { N8nDialog, N8nDialogTitle } from '@n8n/design-system';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

import Modal from './Modal.vue';

const NestedModalHarness = defineComponent({
	components: { Modal, N8nDialog, N8nDialogTitle },
	setup: () => ({ credentialModalName: CREDENTIAL_EDIT_MODAL_KEY }),
	template: `
		<N8nDialog :open="true">
			<N8nDialogTitle>Channel setup</N8nDialogTitle>
			<Modal :name="credentialModalName" append-to-body>
				<template #content>
					<input data-testid="credential-token-input" />
				</template>
			</Modal>
		</N8nDialog>
	`,
});

describe('Modal', () => {
	let wrapper: VueWrapper | undefined;

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.style.pointerEvents = '';
	});

	it('keeps a body-appended modal interactive inside an N8nDialog', async () => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalsById: {
						[CREDENTIAL_EDIT_MODAL_KEY]: { open: true },
					},
					modalStack: [CREDENTIAL_EDIT_MODAL_KEY],
				},
			},
		});

		wrapper = mount(NestedModalHarness, {
			attachTo: document.body,
			global: { plugins: [pinia] },
		});
		await flushPromises();
		await nextTick();

		const input = document.querySelector<HTMLInputElement>(
			'[data-testid="credential-token-input"]',
		);
		const overlay = input?.closest<HTMLElement>('.el-overlay');
		expect(input).not.toBeNull();
		expect(overlay).not.toBeNull();
		if (!input || !overlay) return;

		// AGENT-445: the credential editor is teleported outside the parent dialog.
		input.focus();
		await userEvent.keyboard('test-token');

		expect(input).toHaveFocus();
		expect(input).toHaveValue('test-token');
		expect(overlay).toHaveClass('body-appended-modal-overlay');
	});
});
