import type { TrustedKeySource } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import TrustedKeySourcePolicyModal from './TrustedKeySourcePolicyModal.vue';

// N8nDialog teleports out of the tree via Reka UI's DialogPortal, so its
// content is unreachable from the render container. Swap it for an inline
// pass-through; the header and footer wrappers render fine as-is.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'header', 'description', 'size'],
		emits: ['update:open'],
		template: '<div v-if="open" role="dialog"><slot /></div>',
	};
	// Without the real DialogRoot above it, DialogClose has no context to inject.
	const N8nDialogClose = {
		name: 'N8nDialogClose',
		props: ['asChild'],
		template: '<slot />',
	};
	return { ...actual, N8nDialog, N8nDialogClose };
});

const pinia = createTestingPinia();

const renderModal = createComponentRenderer(TrustedKeySourcePolicyModal, { pinia });

function jwksSource(policy: TrustedKeySource['policy'] = null): TrustedKeySource {
	return {
		id: 'sso-source',
		type: 'jwks',
		issuer: 'https://idp.example.com',
		status: 'healthy',
		lastError: null,
		lastRefreshedAt: null,
		managedBy: 'sso-derived',
		policy,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		config: {
			url: 'https://idp.example.com/jwks.json',
			issuer: 'https://idp.example.com',
			inboundAudiences: ['from-env'],
			subjectClaim: 'sub',
		},
	};
}

describe('TrustedKeySourcePolicyModal', () => {
	it('emits only the fields the admin actually set', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, source: jwksSource() },
		});

		await userEvent.type(getByTestId('trusted-key-source-policy-subject-claim'), 'uid');
		await userEvent.click(getByTestId('trusted-key-source-policy-save'));

		// Untouched fields must be absent, not sent as empty — absent is what
		// hands the setting back to the derived config.
		expect(emitted().save).toEqual([['sso-source', { subjectClaim: 'uid' }]]);
	});

	it('emits an empty policy when every override is cleared', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, source: jwksSource({ subjectClaim: 'uid' }) },
		});

		await userEvent.clear(getByTestId('trusted-key-source-policy-subject-claim'));
		await userEvent.click(getByTestId('trusted-key-source-policy-save'));

		expect(emitted().save).toEqual([['sso-source', {}]]);
	});

	it('prefills from the existing policy, not from the derived config', async () => {
		const { getByTestId } = renderModal({
			props: { open: true, source: jwksSource({ subjectClaim: 'uid' }) },
		});

		const input = getByTestId('trusted-key-source-policy-subject-claim');
		// `sub` is the derived value and shows as a placeholder; the field itself
		// holds the override.
		expect(input).toHaveValue('uid');
		expect(input).toHaveAttribute('placeholder', 'sub');
	});

	it('distinguishes "no override" from an explicit false for verified email', async () => {
		const { getByTestId, emitted, rerender } = renderModal({
			props: { open: true, source: jwksSource({ requireVerifiedEmail: false }) },
		});

		await userEvent.click(getByTestId('trusted-key-source-policy-save'));
		expect(emitted().save).toEqual([['sso-source', { requireVerifiedEmail: false }]]);

		// Re-opening on a source with no override must not send `false` back.
		await rerender({ open: true, source: jwksSource() });
		await userEvent.click(getByTestId('trusted-key-source-policy-save'));
		expect(emitted().save?.[1]).toEqual(['sso-source', {}]);
	});
});
