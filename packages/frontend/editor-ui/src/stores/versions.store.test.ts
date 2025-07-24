import { createPinia, setActivePinia } from 'pinia';
import { useVersionsStore } from './versions.store';
import { useUsersStore } from './users.store';
import * as versionsApi from '@n8n/rest-api-client/api/versions';
import type { IVersionNotificationSettings } from '@n8n/api-types';
import type { Version, WhatsNewArticle, WhatsNewSection } from '@n8n/rest-api-client/api/versions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from './settings.store';
import { useToast } from '@/composables/useToast';

vi.mock('@/composables/useToast', () => {
	const showToast = vi.fn();
	return {
		useToast: () => {
			return {
				showToast,
			};
		},
	};
});

vi.mock('./users.store');

const settings: IVersionNotificationSettings = {
	enabled: true,
	endpoint: 'https://test.api.n8n.io/api/versions/',
	whatsNewEnabled: true,
	whatsNewEndpoint: 'https://test.api.n8n.io/api/whats-new',
	infoUrl: 'https://test.docs.n8n.io/hosting/installation/updating/',
};

const instanceId = 'test-instance-id';
const currentVersionName = '1.100.0';
const currentVersion: Version = {
	name: currentVersionName,
	nodes: [],
	createdAt: '2025-06-24T00:00:00Z',
	description: 'Latest version description',
	documentationUrl: 'https://docs.n8n.io',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: '',
};

const whatsNewArticle: WhatsNewArticle = {
	id: 1,
	title: 'Test article',
	content: 'Some markdown content here',
	createdAt: '2025-06-19T12:37:54.885Z',
	updatedAt: '2025-06-19T12:41:44.919Z',
	publishedAt: '2025-06-19T12:41:44.914Z',
};

const whatsNew: WhatsNewSection = {
	title: "What's New title",
	calloutText: 'Callout text.',
	footer: "What's new footer",
	items: [whatsNewArticle],
	createdAt: '2025-06-19T12:37:54.885Z',
	updatedAt: '2025-06-19T12:41:44.919Z',
};

const toast = useToast();

describe('versions.store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		setActivePinia(createPinia());
	});

	describe('fetchVersions()', () => {
		it('should fetch versions and set current version', async () => {
			vi.spyOn(versionsApi, 'getNextVersions').mockResolvedValue([currentVersion]);

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize(settings);

			await versionsStore.fetchVersions();

			expect(versionsApi.getNextVersions).toHaveBeenCalledWith(
				settings.endpoint,
				currentVersionName,
				instanceId,
			);

			expect(versionsStore.nextVersions).toEqual([]);
			expect(versionsStore.currentVersion).toEqual(currentVersion);
		});

		it('should not fetch versions if not enabled', async () => {
			vi.spyOn(versionsApi, 'getNextVersions');

			const versionsStore = useVersionsStore();
			versionsStore.initialize({
				...settings,
				enabled: false,
			});

			await versionsStore.fetchVersions();

			expect(versionsApi.getNextVersions).not.toHaveBeenCalled();
			expect(versionsStore.nextVersions).toEqual([]);
			expect(versionsStore.currentVersion).toEqual(undefined);
		});
	});

	describe('fetchWhatsNew()', () => {
		it("should fetch What's new articles", async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection').mockResolvedValue(whatsNew);

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize(settings);

			await versionsStore.fetchWhatsNew();

			expect(versionsApi.getWhatsNewSection).toHaveBeenCalledWith(
				settings.whatsNewEndpoint,
				currentVersionName,
				instanceId,
			);

			expect(versionsStore.whatsNewArticles).toEqual([whatsNewArticle]);
		});

		it("should not fetch What's new articles if version notifications are disabled", async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection');

			const versionsStore = useVersionsStore();
			versionsStore.initialize({
				...settings,
				enabled: false,
			});

			await versionsStore.fetchWhatsNew();

			expect(versionsApi.getWhatsNewSection).not.toHaveBeenCalled();
			expect(versionsStore.whatsNewArticles).toEqual([]);
		});

		it("should not fetch What's new articles if not enabled", async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection');

			const versionsStore = useVersionsStore();
			versionsStore.initialize({
				...settings,
				enabled: true,
				whatsNewEnabled: false,
			});

			await versionsStore.fetchWhatsNew();

			expect(versionsApi.getWhatsNewSection).not.toHaveBeenCalled();
			expect(versionsStore.whatsNewArticles).toEqual([]);
		});
	});

	describe('checkForNewVersions()', () => {
		it('should check for new versions', async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection').mockResolvedValue(whatsNew);
			vi.spyOn(versionsApi, 'getNextVersions').mockResolvedValue([currentVersion]);

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize(settings);

			await versionsStore.checkForNewVersions();

			expect(versionsApi.getWhatsNewSection).toHaveBeenCalledWith(
				settings.whatsNewEndpoint,
				currentVersionName,
				instanceId,
			);

			expect(versionsStore.whatsNewArticles).toEqual([whatsNewArticle]);

			expect(versionsApi.getNextVersions).toHaveBeenCalledWith(
				settings.endpoint,
				currentVersionName,
				instanceId,
			);

			expect(versionsStore.nextVersions).toEqual([]);
			expect(versionsStore.currentVersion).toEqual(currentVersion);
		});

		it("should still initialize versions if what's new articles fail", async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection').mockRejectedValueOnce(new Error('oopsie'));
			vi.spyOn(versionsApi, 'getNextVersions').mockResolvedValue([currentVersion]);

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize({
				enabled: true,
				endpoint: 'https://api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://api.n8n.io/api/whats-new',
				infoUrl: 'https://docs.n8n.io/hosting/installation/updating/',
			});

			await versionsStore.checkForNewVersions();

			expect(versionsStore.whatsNewArticles).toEqual([]);
			expect(versionsStore.nextVersions).toEqual([]);
			expect(versionsStore.currentVersion).toEqual(currentVersion);
		});

		it("should still initialize what's new articles if versions fail", async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection').mockResolvedValue(whatsNew);
			vi.spyOn(versionsApi, 'getNextVersions').mockRejectedValueOnce(new Error('oopsie'));

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize({
				enabled: true,
				endpoint: 'https://api.n8n.io/api/versions/',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://api.n8n.io/api/whats-new',
				infoUrl: 'https://docs.n8n.io/hosting/installation/updating/',
			});

			await versionsStore.checkForNewVersions();

			expect(versionsStore.whatsNewArticles).toEqual([whatsNewArticle]);
			expect(versionsStore.nextVersions).toEqual([]);
			expect(versionsStore.currentVersion).toEqual(undefined);
		});

		it('should show toast if important version updates are available', async () => {
			vi.spyOn(versionsApi, 'getWhatsNewSection').mockResolvedValue({ ...whatsNew, items: [] });
			vi.spyOn(versionsApi, 'getNextVersions').mockResolvedValue([
				{
					...currentVersion,
					hasSecurityIssue: true,
					securityIssueFixVersion: '1.100.1',
				},
				{
					...currentVersion,
					name: '1.100.1',
					hasSecurityFix: true,
				},
			]);

			const rootStore = useRootStore();
			rootStore.setVersionCli(currentVersionName);
			rootStore.setInstanceId(instanceId);

			const versionsStore = useVersionsStore();
			versionsStore.initialize(settings);

			await versionsStore.checkForNewVersions();

			expect(versionsStore.nextVersions).toHaveLength(1);
			expect(versionsStore.nextVersions[0].name).toBe('1.100.1');
			expect(toast.showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Critical update available',
					message: expect.stringContaining('Please update to version 1.100.1 or higher.'),
					type: 'warning',
				}),
			);
		});
	});

	describe('setWhatsNewArticleRead()', () => {
		it('should add article ID to read articles', () => {
			const versionsStore = useVersionsStore();

			expect(versionsStore.isWhatsNewArticleRead(1)).toBe(false);
			expect(versionsStore.isWhatsNewArticleRead(2)).toBe(false);

			versionsStore.setWhatsNewArticleRead(1);
			versionsStore.setWhatsNewArticleRead(2);

			expect(versionsStore.isWhatsNewArticleRead(1)).toBe(true);
			expect(versionsStore.isWhatsNewArticleRead(2)).toBe(true);
			expect(versionsStore.isWhatsNewArticleRead(404)).toBe(false);
		});
	});

	describe('hasVersionUpdates', () => {
		it('should return true on stable if there are next versions', () => {
			const settingsStore = useSettingsStore();
			settingsStore.settings.releaseChannel = 'stable';

			const versionsStore = useVersionsStore();
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.100.1',
				},
			];
			versionsStore.currentVersion = currentVersion;

			expect(versionsStore.hasVersionUpdates).toBe(true);
		});

		it('should return false on stable if there are no next versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.nextVersions = [];
			versionsStore.currentVersion = currentVersion;

			expect(versionsStore.hasVersionUpdates).toBe(false);
		});

		it('should return false on beta if there are next versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.100.1',
				},
			];
			versionsStore.currentVersion = currentVersion;

			expect(versionsStore.hasVersionUpdates).toBe(false);
		});
	});

	describe('latestVersion', () => {
		it('should return the latest version from next versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.100.2',
				},
				{
					...currentVersion,
					name: '1.100.1',
				},
			];
			versionsStore.currentVersion = currentVersion;

			expect(versionsStore.latestVersion.name).toBe('1.100.2');
		});

		it('should return current version if no next versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.nextVersions = [];
			versionsStore.currentVersion = currentVersion;

			expect(versionsStore.latestVersion.name).toBe(currentVersionName);
		});
	});

	describe('hasSignificantUpdates', () => {
		beforeEach(() => {
			const settingsStore = useSettingsStore();
			settingsStore.settings.releaseChannel = 'stable';
		});

		it('should return true if current version is behind by at least two minor versions', () => {
			const versionsStore = useVersionsStore();

			versionsStore.currentVersion = currentVersion;
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.102.0',
				},
				{
					...currentVersion,
					name: '1.101.0',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(true);
		});

		it('should return true if current version is behind by at least two minor versions, more exotic versions', () => {
			const versionsStore = useVersionsStore();

			versionsStore.currentVersion = {
				...currentVersion,
				name: '1.100.1+rc.1',
			};

			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.102.0-alpha+20180301',
				},
				{
					...currentVersion,
					name: '1.101.0',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(true);
		});

		it('should return true if current version has security issue', () => {
			const versionsStore = useVersionsStore();

			versionsStore.currentVersion = {
				...currentVersion,
				hasSecurityIssue: true,
			};

			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.101.0',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(true);
		});

		it('should return false if current version is not behind by at least two minor versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.currentVersion = {
				...currentVersion,
				name: '1.101.0',
			};
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.102.0',
				},
				{
					...currentVersion,
					name: '1.101.1',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(false);
		});

		it('should return false if current version is only behind by patch versions', () => {
			const versionsStore = useVersionsStore();
			versionsStore.currentVersion = currentVersion;
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.100.9',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(false);
		});

		it('should return true if current version is behind by a major', () => {
			const versionsStore = useVersionsStore();
			versionsStore.currentVersion = {
				...currentVersion,
				name: '1.100.0',
			};
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '2.0.0',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(true);
		});

		it('should return false if current version is not semver', () => {
			const versionsStore = useVersionsStore();

			versionsStore.currentVersion = {
				...currentVersion,
				name: 'alpha-1',
			};

			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: '1.100.2',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(false);
		});

		it('should return false if latest version is not semver', () => {
			const versionsStore = useVersionsStore();

			versionsStore.currentVersion = currentVersion;
			versionsStore.nextVersions = [
				{
					...currentVersion,
					name: 'alpha-2',
				},
			];

			expect(versionsStore.hasSignificantUpdates).toBe(false);
		});
	});
});

describe('shouldShowWhatsNewCallout', () => {
	let versionsStore: ReturnType<typeof useVersionsStore>;

	const makeArticle = (overrides: Partial<WhatsNewArticle> = {}): WhatsNewArticle => ({
		id: 1,
		title: 'Test',
		content: 'Content',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		publishedAt: new Date().toISOString(),
		...overrides,
	});

	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('returns false if there are no articles', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as any);
		versionsStore = useVersionsStore();
		Object.defineProperty(versionsStore, 'lastDismissedWhatsNewCallout', { get: () => [] });
		versionsStore.whatsNew.items = [];
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(false);
	});

	it('returns true if user has no createdAt and not all articles are dismissed', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as any);
		versionsStore = useVersionsStore();
		Object.defineProperty(versionsStore, 'lastDismissedWhatsNewCallout', { get: () => [] });
		versionsStore.whatsNew.items = [makeArticle()];
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(true);
	});

	it('returns false if all articles are dismissed', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useUsersStore).mockReturnValue({ currentUser: null } as any);
		versionsStore = useVersionsStore();
		versionsStore.whatsNew.items = [makeArticle()];
		versionsStore.dismissWhatsNewCallout();
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(false);
	});

	it('returns true if user createdAt is before article updatedAt', () => {
		const now = Date.now();
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { createdAt: new Date(now - 10000).toISOString() },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
		versionsStore = useVersionsStore();
		Object.defineProperty(versionsStore, 'lastDismissedWhatsNewCallout', { get: () => [] });
		versionsStore.whatsNew.items = [makeArticle({ updatedAt: new Date(now).toISOString() })];
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(true);
	});

	it('returns false if user createdAt is after article updatedAt', () => {
		const now = Date.now();
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { createdAt: new Date(now).toISOString() },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
		versionsStore = useVersionsStore();
		Object.defineProperty(versionsStore, 'lastDismissedWhatsNewCallout', { get: () => [] });
		versionsStore.whatsNew.items = [
			makeArticle({ updatedAt: new Date(now - 10000).toISOString() }),
		];
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(false);
	});

	it('handles missing updatedAt on article', () => {
		vi.mocked(useUsersStore).mockReturnValue({
			currentUser: { createdAt: new Date().toISOString() },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
		versionsStore = useVersionsStore();
		Object.defineProperty(versionsStore, 'lastDismissedWhatsNewCallout', { get: () => [] });
		versionsStore.whatsNew.items = [makeArticle({ updatedAt: undefined })];
		expect(versionsStore.shouldShowWhatsNewCallout()).toBe(false);
	});
});
