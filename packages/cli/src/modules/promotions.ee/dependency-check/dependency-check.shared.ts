import type {
	PromotionDependencyNote,
	PromotionDependencyProject,
	PromotionDependencyReport,
	PromotionDependencyWarning,
	PromotionGap,
	PromotionHardBlock,
	PromotionReferenceConsumer,
	PromotionReferenceTarget,
} from '@n8n/api-types';

import type {
	AccessFact,
	ExpressionReferenceFact,
	FactProject,
	ReferenceFact,
} from './dependency-check.types';

/**
 * Stable for one reference: the consumer, the usage and the target. The preview and the
 * operation compute the same id, so a confirmation can name the gaps that the user saw.
 */
export function gapId(reference: ReferenceFact): string {
	return `${reference.consumer.id}|${reference.usage}|${reference.target.id}`;
}

/** Stable for one credential and one consumer project. */
export function grantId(credentialId: string, projectId: string): string {
	return `${credentialId}|${projectId}`;
}

/** What the check knows about a target, from the source, the destination or the branch. */
export type KnownTarget = {
	name?: string;
	credentialType?: string;
	project?: FactProject | { id: string; name: string };
	/** Whether the user can read the target itself. */
	canRead: boolean;
};

/** The access questions of one check, with the no-leak rules in one place. */
export class Visibility {
	private readonly readable: Set<string>;

	private readonly operable: Set<string>;

	private readonly covered: Set<string>;

	constructor(private readonly access: AccessFact) {
		this.readable = new Set(access.readableProjectIds);
		this.operable = new Set(access.operableProjectIds);
		this.covered = new Set(access.coveredProjectIds);
	}

	canReadProject(projectId: string | undefined): boolean {
		return projectId !== undefined && this.readable.has(projectId);
	}

	canOperateProject(projectId: string | undefined): boolean {
		return projectId !== undefined && this.operable.has(projectId);
	}

	environmentCovers(projectId: string | undefined): boolean {
		return projectId !== undefined && this.covered.has(projectId);
	}

	/** A project for the report. Not set when the user cannot access it. */
	project(
		project: { id: string; name: string } | undefined,
	): PromotionDependencyProject | undefined {
		if (!project || !this.canReadProject(project.id)) return undefined;
		return { id: project.id, name: project.name };
	}

	projectById(projectId: string | undefined): PromotionDependencyProject | undefined {
		if (projectId === undefined) return undefined;
		return this.project(this.access.projects[projectId]);
	}

	/**
	 * The target for the report. Without access to its project, the report holds only what the
	 * node of the consumer holds: the id, the name and the type.
	 */
	target(reference: ReferenceFact, known?: KnownTarget): PromotionReferenceTarget {
		const { kind, id } = reference.target;
		const project = this.project(known?.project);
		const real = project && known?.canRead ? known : undefined;
		const name = real?.name ?? reference.target.name;
		const credentialType = reference.target.credentialType ?? real?.credentialType;
		return {
			kind,
			id,
			...(name !== undefined ? { name } : {}),
			...(credentialType !== undefined ? { credentialType } : {}),
			...(project ? { project } : {}),
		};
	}
}

export function toConsumer(consumer: ReferenceFact['consumer']): PromotionReferenceConsumer {
	return { kind: 'workflow', id: consumer.id, name: consumer.name, projectId: consumer.projectId };
}

export function expressionNotes(references: ExpressionReferenceFact[]): PromotionDependencyNote[] {
	return references.map(({ consumer, usage }) => ({
		consumer: toConsumer(consumer),
		usage,
		code: 'expression-not-checked',
	}));
}

/** Collects the rows of a report. A hard block is listed one time for each code and target. */
export class ReportBuilder {
	readonly gaps: PromotionGap[] = [];

	readonly warnings: PromotionDependencyWarning[] = [];

	readonly notes: PromotionDependencyNote[] = [];

	readonly hardBlocks: PromotionHardBlock[] = [];

	private readonly hardBlockKeys = new Set<string>();

	addHardBlock(block: PromotionHardBlock) {
		const key = `${block.code}|${block.target.kind}|${block.target.id}`;
		if (this.hardBlockKeys.has(key)) return;
		this.hardBlockKeys.add(key);
		this.hardBlocks.push(block);
	}

	hasHardBlock(code: PromotionHardBlock['code'], target: { kind: string; id: string }): boolean {
		return this.hardBlockKeys.has(`${code}|${target.kind}|${target.id}`);
	}

	build(
		rest: Pick<
			PromotionDependencyReport,
			| 'grants'
			| 'credentialMoves'
			| 'deletionCallers'
			| 'keptWorkflows'
			| 'hiddenKeptWorkflowCount'
			| 'credentialHomeChoices'
		>,
	): PromotionDependencyReport {
		// A hard block and a credential without a home stop the operation. A gap does not:
		// the user confirms it.
		const blocked = this.hardBlocks.length > 0 || rest.credentialHomeChoices.length > 0;
		return {
			blocked,
			gaps: this.gaps,
			warnings: this.warnings,
			notes: this.notes,
			hardBlocks: this.hardBlocks,
			...rest,
		};
	}
}

/**
 * A credential id under two project folders of the branch has no clear owner. The detail
 * names a folder only when the user can access its project.
 */
export function ambiguousOwnerBlock(
	visibility: Visibility,
	target: PromotionReferenceTarget,
	folderProjectIds: string[],
	projectName: (projectId: string) => { id: string; name: string } | undefined,
): PromotionHardBlock {
	const visible = folderProjectIds.flatMap(
		(projectId) => visibility.project(projectName(projectId)) ?? [],
	);
	const hidden = folderProjectIds.length - visible.length;
	return {
		code: 'ambiguous-credential-owner',
		target,
		detail: {
			...(visible.length > 0 ? { folders: visible.map(({ name }) => name).join(', ') } : {}),
			...(hidden > 0 ? { hiddenFolderCount: String(hidden) } : {}),
		},
	};
}
