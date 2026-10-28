import { Service } from '@n8n/di';

import { ImportOrchestrator, type ImportPlan } from './import-orchestrator';
import { N8nPackageParser } from './n8n-package-parser';
import { placeCredentialData } from './package-layout';
import { credentialMissingModeUsesPackageData } from '../entities/credential/credential-missing-mode';
import type { PackageReader } from '../io/package-reader';
import type { BlockingIssue, ImportPlanMode } from '../n8n-packages.types';

@Service()
export class PackageImportPreflight {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly importOrchestrator: ImportOrchestrator,
	) {}

	async prepare(
		plans: ImportPlan[],
		reader: PackageReader,
		apiKeyScopes: string[] | undefined,
	): Promise<ImportPlan[]> {
		const prepared = await this.withCredentialData(plans, reader);
		await this.importOrchestrator.assertNotBlocked(prepared, { apiKeyScopes });
		return prepared;
	}

	/**
	 * Like {@link prepare}, but returns the issues that block the import instead of throwing them.
	 * It does not run the credential update dry run.
	 */
	async check(
		plans: ImportPlan[],
		reader: PackageReader,
		apiKeyScopes: string[] | undefined,
		mode: ImportPlanMode,
	): Promise<{ plans: ImportPlan[]; issues: BlockingIssue[] }> {
		const prepared = await this.withCredentialData(plans, reader);
		const issues = await this.importOrchestrator.blockingIssues(prepared, { apiKeyScopes, mode });
		return { plans: prepared, issues };
	}

	private async withCredentialData(
		plans: ImportPlan[],
		reader: PackageReader,
	): Promise<ImportPlan[]> {
		const missingCredentialIds = new Set(
			plans.flatMap(({ input, credentialPlan }) =>
				credentialMissingModeUsesPackageData(input.credentialRequest.missingMode)
					? [...credentialPlan.stubIds.keys()]
					: [],
			),
		);
		if (missingCredentialIds.size > 0) {
			const bundledCredentials =
				plans
					.map(({ input }) => input.credentialRequest.packageCredentials)
					.find((credentials) => credentials !== undefined) ??
				(await this.packageParser.getCredentials(reader, missingCredentialIds));
			plans = plans.map((plan) => {
				const { input } = plan;
				const { credentialRequest } = input;
				if (!credentialMissingModeUsesPackageData(credentialRequest.missingMode)) return plan;
				return {
					...plan,
					input: {
						...input,
						credentialRequest: {
							...credentialRequest,
							requirements: placeCredentialData({
								requirements: credentialRequest.requirements,
								bundledCredentials,
							}),
						},
					},
				};
			});
		}
		return plans;
	}
}
