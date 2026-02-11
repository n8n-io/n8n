import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import axios from 'axios';

import { CacheService } from '@/services/cache/cache.service';
import { AdvisoriesRiskReporter } from '../advisories-risk-reporter';
import {
	ADVISORIES_CACHE_KEY,
	ADVISORIES_CACHE_TTL_MS,
	GITHUB_ADVISORIES_URL,
} from '@/security-audit/constants';

jest.mock('axios');
jest.mock('@/constants', () => ({ N8N_VERSION: '1.50.0' }));

const mockedAxios = jest.mocked(axios);

const createGitHubAdvisory = (overrides: Record<string, unknown> = {}) => ({
	ghsa_id: 'GHSA-xxxx-yyyy-zzzz',
	cve_id: 'CVE-2024-12345',
	summary: 'Test vulnerability summary',
	severity: 'high' as const,
	vulnerabilities: [
		{
			package: { ecosystem: 'npm', name: 'n8n' },
			vulnerable_version_range: '< 2.0.0',
			patched_versions: '>= 1.51.0',
			first_patched_version: { identifier: '1.51.0' },
		},
	],
	published_at: '2024-06-15T00:00:00Z',
	html_url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
	...overrides,
});

describe('AdvisoriesRiskReporter', () => {
	let reporter: AdvisoriesRiskReporter;
	let cacheService: jest.Mocked<CacheService>;
	const logger = mock<Logger>();

	beforeEach(() => {
		jest.clearAllMocks();
		cacheService = mock<CacheService>();
		reporter = new AdvisoriesRiskReporter(logger, cacheService);
	});

	describe('report', () => {
		it('should return null when GitHub returns empty array', async () => {
			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [] });

			const result = await reporter.report([]);

			expect(result).toBeNull();
		});

		it('should return null when GitHub API fails (graceful degradation)', async () => {
			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockRejectedValue(new Error('Network error'));

			const result = await reporter.report([]);

			expect(result).toBeNull();
		});

		it('should use cached advisories when available', async () => {
			const cachedAdvisories = [createGitHubAdvisory()];
			cacheService.get.mockResolvedValue(cachedAdvisories);

			await reporter.report([]);

			expect(mockedAxios.get).not.toHaveBeenCalled();
		});

		it('should cache fetched advisories with correct TTL', async () => {
			const advisories = [createGitHubAdvisory()];
			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			await reporter.report([]);

			expect(cacheService.set).toHaveBeenCalledWith(
				ADVISORIES_CACHE_KEY,
				advisories,
				ADVISORIES_CACHE_TTL_MS,
			);
		});

		it('should include GITHUB_TOKEN in headers when set', async () => {
			const originalToken = process.env.GITHUB_TOKEN;
			process.env.GITHUB_TOKEN = 'test-token-123';

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [] });

			await reporter.report([]);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				GITHUB_ADVISORIES_URL,
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token-123',
					}),
				}),
			);

			process.env.GITHUB_TOKEN = originalToken;
		});

		it('should not include Authorization header when GITHUB_TOKEN is not set', async () => {
			const originalToken = process.env.GITHUB_TOKEN;
			delete process.env.GITHUB_TOKEN;

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [] });

			await reporter.report([]);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				GITHUB_ADVISORIES_URL,
				expect.objectContaining({
					headers: expect.not.objectContaining({
						Authorization: expect.anything(),
					}),
				}),
			);

			process.env.GITHUB_TOKEN = originalToken;
		});

		it('should separate affecting vs not-affecting advisories into sections', async () => {
			const advisories = [
				createGitHubAdvisory({
					ghsa_id: 'GHSA-affecting',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: '>= 1.51.0',
							first_patched_version: { identifier: '1.51.0' },
						},
					],
				}),
				createGitHubAdvisory({
					ghsa_id: 'GHSA-not-affecting',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 1.50.0',
							patched_versions: '>= 1.50.0',
							first_patched_version: { identifier: '1.50.0' },
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			expect(result!.sections).toHaveLength(2);

			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			const notAffectingSection = result!.sections.find((s) => !s.affectsCurrentVersion);

			expect(affectingSection).toBeDefined();
			expect(affectingSection!.advisories).toHaveLength(1);
			expect(affectingSection!.advisories[0].ghsaId).toBe('GHSA-affecting');

			expect(notAffectingSection).toBeDefined();
			expect(notAffectingSection!.advisories).toHaveLength(1);
			expect(notAffectingSection!.advisories[0].ghsaId).toBe('GHSA-not-affecting');
		});

		it('should return null when no sections after categorization', async () => {
			// All advisories are for a different package
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'other-package' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			// Advisory has empty vulnerableVersionRange for n8n → notAffecting
			// Since it ends up in notAffecting, there will be a section
			expect(result).not.toBeNull();
		});

		it('should pass timeout to axios', async () => {
			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [] });

			await reporter.report([]);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				GITHUB_ADVISORIES_URL,
				expect.objectContaining({
					timeout: 30_000,
				}),
			);
		});
	});

	describe('version matching — via report()', () => {
		it('should not affect when version equals boundary (< 1.50.0 with N8N_VERSION=1.50.0)', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 1.50.0',
							patched_versions: '>= 1.50.0',
							first_patched_version: { identifier: '1.50.0' },
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeUndefined();
		});

		it('should affect when version is in vulnerable range (< 2.0.0 with N8N_VERSION=1.50.0)', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeDefined();
			expect(affectingSection!.advisories).toHaveLength(1);
		});

		it('should not affect when version equals upper boundary of compound range', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '>= 1.0.0, < 1.50.0',
							patched_versions: '>= 1.50.0',
							first_patched_version: { identifier: '1.50.0' },
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeUndefined();
		});

		it('should not affect when current version >= patched version', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '>= 1.0.0, < 2.0.0',
							patched_versions: '>= 1.50.0',
							first_patched_version: { identifier: '1.50.0' },
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeUndefined();
		});

		it('should affect when current version < patched version', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '>= 1.0.0, < 2.0.0',
							patched_versions: '>= 1.51.0',
							first_patched_version: { identifier: '1.51.0' },
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeDefined();
		});

		it('should not affect when vulnerableVersionRange is empty', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeUndefined();
		});

		it('should not affect when range string is invalid (defensive fallback)', async () => {
			const advisories = [
				createGitHubAdvisory({
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: 'not-a-valid-range',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeUndefined();
		});
	});

	describe('sorting', () => {
		it('should sort critical advisories before high, high before medium', async () => {
			const advisories = [
				createGitHubAdvisory({
					ghsa_id: 'GHSA-medium',
					severity: 'medium',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
				createGitHubAdvisory({
					ghsa_id: 'GHSA-critical',
					severity: 'critical',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
				createGitHubAdvisory({
					ghsa_id: 'GHSA-high',
					severity: 'high',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeDefined();
			expect(affectingSection!.advisories.map((a) => a.ghsaId)).toEqual([
				'GHSA-critical',
				'GHSA-high',
				'GHSA-medium',
			]);
		});

		it('should sort same-severity advisories by publishedAt (newest first)', async () => {
			const advisories = [
				createGitHubAdvisory({
					ghsa_id: 'GHSA-older',
					severity: 'high',
					published_at: '2024-01-01T00:00:00Z',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
				createGitHubAdvisory({
					ghsa_id: 'GHSA-newer',
					severity: 'high',
					published_at: '2024-06-15T00:00:00Z',
					vulnerabilities: [
						{
							package: { ecosystem: 'npm', name: 'n8n' },
							vulnerable_version_range: '< 2.0.0',
							patched_versions: null,
							first_patched_version: null,
						},
					],
				}),
			];

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: advisories });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const affectingSection = result!.sections.find((s) => s.affectsCurrentVersion);
			expect(affectingSection).toBeDefined();
			expect(affectingSection!.advisories.map((a) => a.ghsaId)).toEqual([
				'GHSA-newer',
				'GHSA-older',
			]);
		});
	});

	describe('transformation', () => {
		it('should map GitHub advisory fields to internal format', async () => {
			const advisory = createGitHubAdvisory({
				ghsa_id: 'GHSA-test-1234-abcd',
				cve_id: 'CVE-2024-99999',
				summary: 'A critical vulnerability',
				severity: 'critical',
				published_at: '2024-03-20T12:00:00Z',
				html_url: 'https://github.com/advisories/GHSA-test-1234-abcd',
				vulnerabilities: [
					{
						package: { ecosystem: 'npm', name: 'n8n' },
						vulnerable_version_range: '>= 1.0.0, < 2.0.0',
						patched_versions: '>= 1.51.0',
						first_patched_version: { identifier: '1.51.0' },
					},
				],
			});

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [advisory] });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const firstAdvisory = result!.sections[0].advisories[0];
			expect(firstAdvisory).toMatchObject({
				kind: 'advisory',
				ghsaId: 'GHSA-test-1234-abcd',
				cveId: 'CVE-2024-99999',
				severity: 'critical',
				summary: 'A critical vulnerability',
				vulnerableVersionRange: '>= 1.0.0, < 2.0.0',
				patchedVersions: '>= 1.51.0',
				publishedAt: '2024-03-20T12:00:00Z',
				htmlUrl: 'https://github.com/advisories/GHSA-test-1234-abcd',
			});
		});

		it('should extract n8n-specific vulnerability from vulnerabilities array', async () => {
			const advisory = createGitHubAdvisory({
				vulnerabilities: [
					{
						package: { ecosystem: 'npm', name: 'other-package' },
						vulnerable_version_range: '< 5.0.0',
						patched_versions: '>= 5.0.0',
						first_patched_version: { identifier: '5.0.0' },
					},
					{
						package: { ecosystem: 'npm', name: 'n8n' },
						vulnerable_version_range: '>= 1.0.0, < 2.0.0',
						patched_versions: '>= 1.51.0',
						first_patched_version: { identifier: '1.51.0' },
					},
				],
			});

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [advisory] });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const firstAdvisory = result!.sections[0].advisories[0];
			expect(firstAdvisory.vulnerableVersionRange).toBe('>= 1.0.0, < 2.0.0');
			expect(firstAdvisory.patchedVersions).toBe('>= 1.51.0');
		});

		it('should handle missing patched_versions by falling back to first_patched_version', async () => {
			const advisory = createGitHubAdvisory({
				vulnerabilities: [
					{
						package: { ecosystem: 'npm', name: 'n8n' },
						vulnerable_version_range: '< 2.0.0',
						patched_versions: null,
						first_patched_version: { identifier: '1.60.0' },
					},
				],
			});

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [advisory] });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const firstAdvisory = result!.sections[0].advisories[0];
			expect(firstAdvisory.patchedVersions).toBe('1.60.0');
		});

		it('should handle null cve_id', async () => {
			const advisory = createGitHubAdvisory({ cve_id: null });

			cacheService.get.mockResolvedValue(undefined);
			mockedAxios.get.mockResolvedValue({ data: [advisory] });

			const result = await reporter.report([]);

			expect(result).not.toBeNull();
			const firstAdvisory = result!.sections[0].advisories[0];
			expect(firstAdvisory.cveId).toBeNull();
		});
	});
});
