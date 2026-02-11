import { UnexpectedError } from 'n8n-workflow';
import type { INode, IConnections } from 'n8n-workflow';

interface VersionSource {
	nodes: INode[];
	connections: IConnections;
}

interface WorkflowWithVersions {
	activeVersion: VersionSource | null;
	gradualRolloutVersion?: VersionSource | null;
	gradualRolloutPercentage?: number | null;
}

interface ResolvedVersion {
	nodes: INode[];
	connections: IConnections;
	isRolloutVersion: boolean;
}

/**
 * Resolves which workflow version (A or B) should be used for a given execution.
 * If a gradual rollout version is configured with a valid percentage (1-100),
 * randomly selects B version with that probability.
 * Otherwise, always returns the active (A) version.
 */
export function resolveExecutionVersion(workflowData: WorkflowWithVersions): ResolvedVersion {
	const { activeVersion, gradualRolloutVersion, gradualRolloutPercentage } = workflowData;

	if (!activeVersion) {
		throw new UnexpectedError('Active version not found for workflow');
	}

	if (
		gradualRolloutVersion &&
		gradualRolloutPercentage !== null &&
		gradualRolloutPercentage !== undefined &&
		gradualRolloutPercentage > 0 &&
		gradualRolloutPercentage <= 100
	) {
		const random = Math.random() * 100;
		if (random < gradualRolloutPercentage) {
			return {
				nodes: gradualRolloutVersion.nodes,
				connections: gradualRolloutVersion.connections,
				isRolloutVersion: true,
			};
		}
	}

	return {
		nodes: activeVersion.nodes,
		connections: activeVersion.connections,
		isRolloutVersion: false,
	};
}
