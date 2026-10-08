import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';

import { renderComponent } from '@/__tests__/render';

import RunTargetPicker from '../RunTargetPicker.vue';

const { pushRoute } = vi.hoisted(() => ({ pushRoute: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: pushRoute }),
}));

const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const CLOUD_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

function link(id: string, name: string, status: LinkedInstanceSummary['status']) {
	return {
		id,
		name,
		baseUrl: 'https://cloud.example.test',
		status,
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
	} satisfies LinkedInstanceSummary;
}

const links = [link(OFFICE_ID, 'Office', 'online'), link(CLOUD_ID, 'Cloud', 'offline')];

function renderPicker(modelValue: RunTarget = { kind: 'local' }) {
	const onUpdate = vi.fn();
	const rendered = renderComponent(RunTargetPicker, {
		props: { modelValue, links, 'onUpdate:modelValue': onUpdate },
	});
	return { ...rendered, onUpdate };
}

async function openMenu(getByRole: ReturnType<typeof renderPicker>['getByRole']) {
	await userEvent.click(getByRole('button', { name: /Runs on:/ }));
}

describe('RunTargetPicker', () => {
	beforeEach(() => {
		pushRoute.mockReset();
	});

	it('shows that the chat runs on this computer by default', () => {
		const { getByRole } = renderPicker();

		expect(getByRole('button', { name: 'Runs on: This computer' })).toBeInTheDocument();
	});

	it('shows the name of the chosen link on the trigger', () => {
		const { getByRole } = renderPicker({ kind: 'linked', instanceId: OFFICE_ID });

		expect(getByRole('button', { name: 'Runs on: Office' })).toBeInTheDocument();
	});

	it('lists this computer and each link under the menu header', async () => {
		const { getByRole, findByRole } = renderPicker();

		await openMenu(getByRole);

		expect(await findByRole('menuitemcheckbox', { name: /This computer/ })).toBeInTheDocument();
		expect(getByRole('menuitemcheckbox', { name: /^Office/ })).toBeInTheDocument();
		expect(getByRole('menuitemcheckbox', { name: /^Cloud · Offline/ })).toBeInTheDocument();
		expect(document.body).toHaveTextContent('Where should this chat run?');
	});

	it('chooses an online link', async () => {
		const { getByRole, findByRole, onUpdate } = renderPicker();

		await openMenu(getByRole);
		await userEvent.click(await findByRole('menuitemcheckbox', { name: /^Office/ }));

		expect(onUpdate).toHaveBeenCalledWith({ kind: 'linked', instanceId: OFFICE_ID });
	});

	it('does not choose a link that is offline, and says what to do', async () => {
		const { getByRole, findByRole, onUpdate } = renderPicker();

		await openMenu(getByRole);
		const offline = await findByRole('menuitemcheckbox', { name: /^Cloud · Offline/ });
		await userEvent.click(offline);

		expect(offline).toHaveTextContent('Check connection');
		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('opens the linked instances settings from the footer', async () => {
		const { getByRole, findByRole } = renderPicker();

		await openMenu(getByRole);
		await userEvent.click(await findByRole('button', { name: 'Link a cloud instance…' }));

		expect(pushRoute).toHaveBeenCalledWith({ name: 'LinkedInstancesSettings' });
	});
});
