import { fireEvent, screen } from '@testing-library/vue';
import { useSettingsStore } from '@/stores/settings.store';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import SettingsApiView from './SettingsApiView.vue';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useApiKeysStore } from '@/stores/apiKeys.store';
import { DateTime } from 'luxon';

setActivePinia(createTestingPinia());

const settingsStore = mockedStore(useSettingsStore);
const cloudStore = mockedStore(useCloudPlanStore);
const apiKeysStore = mockedStore(useApiKeysStore);

describe('SettingsApiView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('if user public api is not enabled and user is trialing it should show upgrade call to action', () => {
		settingsStore.isPublicApiEnabled = false;
		cloudStore.userIsTrialing = true;

		renderComponent(SettingsApiView);

		expect(screen.getByText('Upgrade to use API')).toBeInTheDocument();
		expect(
			screen.getByText(
				'To prevent abuse, we limit API access to your workspace during your trial. If this is hindering your evaluation of n8n, please contact',
			),
		).toBeInTheDocument();
		expect(screen.getByText('support@n8n.io')).toBeInTheDocument();

		expect(screen.getByText('Upgrade plan')).toBeInTheDocument();
	});

	it('if user public api enabled and no API keys in account, it should create API key CTA', () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [];

		renderComponent(SettingsApiView);

		expect(screen.getByText('Create an API Key')).toBeInTheDocument();
		expect(screen.getByText('Control n8n programmatically using the')).toBeInTheDocument();
		expect(screen.getByText('n8n API')).toBeInTheDocument();
	});

	it('if user public api enabled and there are API Keys in account, they should be rendered', async () => {
		const dateInTheFuture = DateTime.now().plus({ days: 1 });
		const dateInThePast = DateTime.now().minus({ days: 1 });

		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [
			{
				id: '1',
				label: 'test-key-1',
				createdAt: new Date().toString(),
				updatedAt: new Date().toString(),
				apiKey: '****Atcr',
				expiresAt: null,
			},
			{
				id: '2',
				label: 'test-key-2',
				createdAt: new Date().toString(),
				updatedAt: new Date().toString(),
				apiKey: '****Bdcr',
				expiresAt: dateInTheFuture.toSeconds(),
			},
			{
				id: '3',
				label: 'test-key-3',
				createdAt: new Date().toString(),
				updatedAt: new Date().toString(),
				apiKey: '****Wtcr',
				expiresAt: dateInThePast.toSeconds(),
			},
		];

		renderComponent(SettingsApiView);

		expect(screen.getByText('Never expires')).toBeInTheDocument();
		expect(screen.getByText('****Atcr')).toBeInTheDocument();
		expect(screen.getByText('test-key-1')).toBeInTheDocument();

		expect(
			screen.getByText(`Expires on ${dateInTheFuture.toFormat('ccc, MMM d yyyy')}`),
		).toBeInTheDocument();
		expect(screen.getByText('****Bdcr')).toBeInTheDocument();
		expect(screen.getByText('test-key-2')).toBeInTheDocument();

		expect(screen.getByText('This API key has expired')).toBeInTheDocument();
		expect(screen.getByText('****Wtcr')).toBeInTheDocument();
		expect(screen.getByText('test-key-3')).toBeInTheDocument();
	});

	it('should show delete warning when trying to delete an API key', async () => {
		settingsStore.isPublicApiEnabled = true;
		cloudStore.userIsTrialing = false;
		apiKeysStore.apiKeys = [
			{
				id: '1',
				label: 'test-key-1',
				createdAt: new Date().toString(),
				updatedAt: new Date().toString(),
				apiKey: '****Atcr',
				expiresAt: null,
			},
		];

		renderComponent(SettingsApiView);

		expect(screen.getByText('Never expires')).toBeInTheDocument();
		expect(screen.getByText('****Atcr')).toBeInTheDocument();
		expect(screen.getByText('test-key-1')).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('action-toggle'));
		await fireEvent.click(screen.getByTestId('action-delete'));

		expect(screen.getByText('Delete this API Key?')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Any application using this API Key will no longer have access to n8n. This operation cannot be undone.',
			),
		).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});
});
