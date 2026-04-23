import {
	ClusterCheck,
	ClusterCheckContext,
	ClusterCheckResult,
	IClusterCheck,
} from '@n8n/decorators';

@ClusterCheck()
export class VersionMismatchCheck implements IClusterCheck {
	constructor() {}

	checkDescription = {
		name: 'version-mismatch',
		displayName: 'Version mismatch',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const allInstanceVersions = [...context.currentState.values()].map((i) => i.version);
		const versions = [...new Set<string>(allInstanceVersions)];

		if (versions.length <= 1) {
			// Zero instances or a single version — no mismatch.
			return {};
		}

		return {
			warnings: [
				{
					code: 'cluster.version-mismatch',
					message: `Detected multiple N8N versions in the cluster!: ${versions.join(', ')}`,
					severity: 'error',
					context: {
						versions,
					},
				},
			],
		};
	}
}
