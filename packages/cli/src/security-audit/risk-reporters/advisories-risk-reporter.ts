import { inDevelopment, Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import axios from 'axios';
import * as semver from 'semver';

import { N8N_VERSION } from '@/constants';
import {
	ADVISORIES_CACHE_KEY,
	ADVISORIES_CACHE_TTL_MS,
	ADVISORIES_REPORT,
	GITHUB_ADVISORIES_URL,
} from '@/security-audit/constants';
import type { RiskReporter, Risk } from '@/security-audit/types';
import { CacheService } from '@/services/cache/cache.service';

interface GitHubAdvisory {
	ghsa_id: string;
	cve_id: string | null;
	summary: string;
	severity: 'critical' | 'high' | 'medium' | 'low';
	vulnerabilities: Array<{
		package: {
			ecosystem: string;
			name: string;
		};
		vulnerable_version_range: string;
		patched_versions: string | null;
		first_patched_version: {
			identifier: string;
		} | null;
	}>;
	published_at: string;
	html_url: string;
}

@Service()
export class AdvisoriesRiskReporter implements RiskReporter {
	constructor(
		private readonly logger: Logger,
		private readonly cacheService: CacheService,
	) {}

	async report(): Promise<Risk.AdvisoryReport | null> {
		const advisories = await this.getAdvisories();

		if (advisories === null || advisories.length === 0) {
			return null;
		}

		const advisoryDetails = this.transformAdvisories(advisories);
		const { affecting, notAffecting } = this.categorizeAdvisories(advisoryDetails);

		const sections: Risk.AdvisorySection[] = [];

		if (affecting.length > 0) {
			sections.push({
				title: ADVISORIES_REPORT.SECTIONS.AFFECTING_CURRENT_VERSION,
				description: `${affecting.length} security ${affecting.length === 1 ? 'advisory affects' : 'advisories affect'} your current n8n version (${N8N_VERSION}). Review these advisories and consider updating to a patched version.`,
				recommendation:
					'Update your n8n instance to the latest version to address these security vulnerabilities.',
				advisories: affecting,
				affectsCurrentVersion: true,
			});
		}

		if (notAffecting.length > 0) {
			sections.push({
				title: ADVISORIES_REPORT.SECTIONS.ALL_PUBLISHED,
				description: `${notAffecting.length} additional security ${notAffecting.length === 1 ? 'advisory has' : 'advisories have'} been published for n8n. These do not affect your current version (${N8N_VERSION}).`,
				recommendation:
					'No action required for these advisories. Keep your instance updated to stay protected.',
				advisories: notAffecting,
				affectsCurrentVersion: false,
			});
		}

		if (sections.length === 0) {
			return null;
		}

		return {
			risk: ADVISORIES_REPORT.RISK,
			sections,
		};
	}

	private async getAdvisories(): Promise<GitHubAdvisory[] | null> {
		const cached = await this.cacheService.get<GitHubAdvisory[]>(ADVISORIES_CACHE_KEY);

		if (cached) {
			return cached;
		}

		try {
			const advisories = await this.fetchAdvisoriesFromGitHub();
			await this.cacheService.set(ADVISORIES_CACHE_KEY, advisories, ADVISORIES_CACHE_TTL_MS);
			return advisories;
		} catch (error) {
			if (inDevelopment) {
				this.logger.error(
					'Failed to fetch GitHub security advisories. Skipping advisories report...',
					error instanceof Error ? { message: error.message } : {},
				);
			}

			return null;
		}
	}

	private async fetchAdvisoriesFromGitHub(): Promise<GitHubAdvisory[]> {
		const headers: Record<string, string> = {
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
		};

		const githubToken = process.env.GITHUB_TOKEN;
		if (githubToken) {
			headers.Authorization = `Bearer ${githubToken}`;
		}

		const response = await axios.get<GitHubAdvisory[]>(GITHUB_ADVISORIES_URL, {
			headers,
			timeout: 30_000,
		});

		return response.data;
	}

	private transformAdvisories(advisories: GitHubAdvisory[]): Risk.AdvisoryDetails[] {
		return advisories.map((advisory) => {
			const n8nVulnerability = advisory.vulnerabilities.find(
				(v) => v.package.name === 'n8n' && v.package.ecosystem === 'npm',
			);

			return {
				kind: 'advisory' as const,
				ghsaId: advisory.ghsa_id,
				cveId: advisory.cve_id,
				severity: advisory.severity,
				summary: advisory.summary,
				vulnerableVersionRange: n8nVulnerability?.vulnerable_version_range ?? '',
				patchedVersions:
					n8nVulnerability?.patched_versions ??
					n8nVulnerability?.first_patched_version?.identifier ??
					null,
				publishedAt: advisory.published_at,
				htmlUrl: advisory.html_url,
			};
		});
	}

	private categorizeAdvisories(advisories: Risk.AdvisoryDetails[]): {
		affecting: Risk.AdvisoryDetails[];
		notAffecting: Risk.AdvisoryDetails[];
	} {
		const affecting: Risk.AdvisoryDetails[] = [];
		const notAffecting: Risk.AdvisoryDetails[] = [];

		for (const advisory of advisories) {
			if (this.affectsCurrentVersion(advisory.vulnerableVersionRange, advisory.patchedVersions)) {
				affecting.push(advisory);
			} else {
				notAffecting.push(advisory);
			}
		}

		// Sort by severity (critical first) then by published date (newest first)
		const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

		const sortFn = (a: Risk.AdvisoryDetails, b: Risk.AdvisoryDetails) => {
			const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
			if (severityDiff !== 0) return severityDiff;
			return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
		};

		affecting.sort(sortFn);
		notAffecting.sort(sortFn);

		return { affecting, notAffecting };
	}

	private affectsCurrentVersion(
		vulnerableVersionRange: string,
		patchedVersions: string | null,
	): boolean {
		if (!vulnerableVersionRange) {
			return false;
		}

		try {
			// GitHub uses ranges like ">= 1.0.0, < 2.0.0" or "< 1.113.0"
			// We need to convert to semver-compatible range
			const semverRange = this.convertToSemverRange(vulnerableVersionRange);
			const isInVulnerableRange = semver.satisfies(N8N_VERSION, semverRange);

			if (!isInVulnerableRange) {
				return false;
			}

			// If there's a patched version, check if current version is >= patched
			// If so, we're not affected
			if (patchedVersions) {
				const patchedVersion = this.extractVersion(patchedVersions);
				if (patchedVersion && semver.valid(patchedVersion)) {
					return semver.lt(N8N_VERSION, patchedVersion);
				}
			}

			return true;
		} catch {
			// If we can't parse the range, assume it doesn't affect us
			return false;
		}
	}

	private extractVersion(versionString: string): string | null {
		// Handle various formats: "2.0.0", ">= 2.0.0", "< 2.0.0", etc.
		const match = versionString.match(/(\d+\.\d+\.\d+)/);
		return match ? match[1] : null;
	}

	private convertToSemverRange(githubRange: string): string {
		// GitHub ranges can be comma-separated conditions
		// e.g., ">= 1.0.0, < 2.0.0" should become ">=1.0.0 <2.0.0"
		return githubRange
			.split(',')
			.map((part) => part.trim())
			.join(' ');
	}
}
