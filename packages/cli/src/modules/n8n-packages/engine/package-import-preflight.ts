import { Service } from '@n8n/di';

import { ImportOrchestrator, type ImportPlan } from './import-orchestrator';
import { N8nPackageParser } from './n8n-package-parser';
import { placeCredentialData } from './package-layout';
import { credentialMissingModeUsesPackageData } from '../entities/credential/credential-missing-mode';
import type { PackageReader } from '../io/package-reader';

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
		await this.importOrchestrator.assertNotBlocked(plans, { apiKeyScopes });
		return plans;
	}
}
