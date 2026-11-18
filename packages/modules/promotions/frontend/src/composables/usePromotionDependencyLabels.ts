import type {
	PromotionCredentialMove,
	PromotionDependencyNote,
	PromotionDependencyWarning,
	PromotionDirection,
	PromotionGapDetail,
	PromotionGapState,
	PromotionHardBlock,
	PromotionReferenceUsage,
	PromotionResourceWarning,
} from '@n8n/api-types';
import { useCredentialTypeNames } from './useCredentialTypeNames';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { GapGroupId, GapTargetRow } from '../promotionDependencies';

type TargetKind = 'credential' | 'workflow' | 'dataTable' | 'variable' | 'other';

/** A newer server can send a kind that this client does not know. It then gets a neutral name. */
export function targetKindOf(kind: string): TargetKind {
	if (kind === 'credential' || kind === 'workflow' || kind === 'variable') return kind;
	if (kind === 'dataTable' || kind === 'data-table') return 'dataTable';
	return 'other';
}

const USAGE_KEYS = new Map<string, BaseTextKey>([
	['credential', 'promotions.dependencies.usage.credential'],
	['sub-workflow', 'promotions.dependencies.usage.sub-workflow'],
	['error-workflow', 'promotions.dependencies.usage.error-workflow'],
]);

/** A warning code that this client does not know gets a generic sentence, never a raw key. */
const WARNING_KEYS = new Map<string, BaseTextKey>([
	['broken-on-source', 'promotions.dependencies.warning.broken-on-source'],
	['legacy-workflow-reference', 'promotions.dependencies.warning.legacy-workflow-reference'],
]);

/** Promote: why the reference is broken on the source. Only when the user can read the target. */
const WARNING_CAUSE_KEYS = new Map<string, BaseTextKey>([
	['archived', 'promotions.dependencies.warning.cause.archived'],
	['caller-policy', 'promotions.dependencies.warning.cause.caller-policy'],
	['not-usable', 'promotions.dependencies.warning.cause.not-usable'],
]);

const GAP_DETAIL_KEYS: Record<PromotionGapDetail, BaseTextKey> = {
	'placeholder-on-source': 'promotions.dependencies.detail.placeholder-on-source',
	'sharing-not-licensed': 'promotions.dependencies.detail.sharing-not-licensed',
	'confirmed-gap': 'promotions.dependencies.detail.confirmed-gap',
	'legacy-reference': 'promotions.dependencies.detail.legacy-reference',
	'published-version': 'promotions.dependencies.detail.published-version',
};

const HARD_BLOCK_KEYS: Record<PromotionHardBlock['code'], BaseTextKey> = {
	'credential-type-mismatch': 'promotions.dependencies.hardBlock.credential-type-mismatch',
	'ambiguous-credential-owner': 'promotions.dependencies.hardBlock.ambiguous-credential-owner',
	'instance-credential-missing': 'promotions.dependencies.hardBlock.instance-credential-missing',
	'incompatible-usage-scope': 'promotions.dependencies.hardBlock.incompatible-usage-scope',
	'placeholder-create-forbidden': 'promotions.dependencies.hardBlock.placeholder-create-forbidden',
	'credential-move-forbidden': 'promotions.dependencies.hardBlock.credential-move-forbidden',
};

/** The texts of the dependency report. */
export function usePromotionDependencyLabels() {
	const i18n = useI18n();
	const { credentialTypeName } = useCredentialTypeNames();

	/** The name of the target. Without access the name can be missing, so the kind stands in. */
	function targetName(target: { kind: string; name?: string }): string {
		return (
			target.name ||
			i18n.baseText(`promotions.dependencies.target.unnamed.${targetKindOf(target.kind)}`)
		);
	}

	function groupTitle(group: GapGroupId, direction: PromotionDirection): string {
		if (group === 'other-project' || group === 'read-only-project') {
			return i18n.baseText(`promotions.dependencies.group.${group}.title.${direction}`);
		}
		return i18n.baseText(`promotions.dependencies.group.${group}.title`);
	}

	function groupDescription(group: GapGroupId, direction: PromotionDirection): string {
		if (
			group === 'same-project' ||
			group === 'other-project' ||
			group === 'read-only-project' ||
			group === 'no-access'
		) {
			return i18n.baseText(`promotions.dependencies.group.${group}.description.${direction}`);
		}
		return i18n.baseText(`promotions.dependencies.group.${group}.description`);
	}

	const stateLabel = (state: PromotionGapState) =>
		i18n.baseText(`promotions.dependencies.state.${state}`);

	/** A usage that this client does not know reads "Used by". */
	const usageLabel = (usage: PromotionReferenceUsage | (string & {})) =>
		i18n.baseText(USAGE_KEYS.get(usage) ?? 'promotions.dependencies.usage.credential');

	/** The fix of one row, when it depends on the target. The group explains the other cases. */
	function rowFix(group: GapGroupId, row: GapTargetRow): string | undefined {
		if (group === 'personal') {
			return i18n.baseText(`promotions.dependencies.fix.personal.${row.target.kind}`);
		}
		// The sentences of the spec. Each row carries its own, so a row reads alone.
		if (group === 'outside-environment') {
			return i18n.baseText('promotions.dependencies.fix.outside-environment');
		}
		if (group === 'archived-on-destination') {
			return i18n.baseText('promotions.dependencies.fix.archived-on-destination');
		}
		if (group === 'not-on-branch') {
			// Without a name, the sentence names the kind: "This workflow is not on the branch."
			return row.target.name
				? i18n.baseText('promotions.dependencies.fix.not-on-branch', {
						interpolate: { name: row.target.name },
					})
				: i18n.baseText(`promotions.dependencies.fix.not-on-branch.unnamed.${row.target.kind}`);
		}
		return undefined;
	}

	/** A client can ignore a detail that it does not know, so an unknown value gives no text. */
	function detailText(detail: PromotionGapDetail): string | undefined {
		const key = GAP_DETAIL_KEYS[detail];
		return key ? i18n.baseText(key) : undefined;
	}

	/** Why a credential keeps its owner. A managed and an end-user credential never move. */
	function credentialNotMovedText(move: PromotionCredentialMove): string {
		const interpolate = { credential: move.credential.name, project: move.toProject.name };
		if (move.blockedReason === 'managed' || move.blockedReason === 'end-user') {
			return i18n.baseText('promotions.dependencies.moves.stays', { interpolate });
		}
		if (move.blockedReason === 'missing-create-right') {
			return i18n.baseText('promotions.dependencies.moves.noCreateRight', { interpolate });
		}
		return i18n.baseText('promotions.dependencies.moves.refused', { interpolate });
	}

	function warningText(warning: Pick<PromotionDependencyWarning, 'code' | 'cause'>) {
		const text = i18n.baseText(
			WARNING_KEYS.get(warning.code) ?? 'promotions.dependencies.warning.unknown',
		);
		const cause = warning.cause && WARNING_CAUSE_KEYS.get(warning.cause);
		return cause ? `${text} ${i18n.baseText(cause)}` : text;
	}

	/** One sentence for a warning of a result: it names the consumer and the target. */
	function warningSentence(warning: PromotionDependencyWarning): string {
		return i18n.baseText('promotions.dependencies.warning.sentence', {
			interpolate: {
				consumer: warning.consumer.name,
				target: targetName(warning.target),
				text: warningText(warning),
			},
		});
	}

	/** The name of a data table or a variable of another project. A table can have no name. */
	const resourceName = ({ resource }: PromotionResourceWarning) =>
		resource.name || i18n.baseText(`promotions.dependencies.target.unnamed.${resource.kind}`);

	/** "This data table belongs to project Ops. The operation does not copy it." */
	function resourceWarningText({ resource }: PromotionResourceWarning): string {
		return resource.project
			? i18n.baseText(`promotions.dependencies.resourceWarning.${resource.kind}.inProject`, {
					interpolate: { project: resource.project.name },
				})
			: i18n.baseText(`promotions.dependencies.resourceWarning.${resource.kind}`);
	}

	/** One sentence for a result: it names the consumer and the resource. */
	function resourceWarningSentence(warning: PromotionResourceWarning): string {
		return i18n.baseText(
			`promotions.dependencies.resourceWarning.${warning.resource.kind}.sentence`,
			{
				interpolate: {
					consumer: warning.consumer.name,
					name: resourceName(warning),
					text: resourceWarningText(warning),
				},
			},
		);
	}

	const noteText = (note: PromotionDependencyNote) =>
		i18n.baseText(`promotions.dependencies.note.${note.code}`);

	function hardBlockText(block: PromotionHardBlock): string {
		const interpolate = {
			name: targetName(block.target),
			consumer: block.consumer?.name ?? '',
		};
		// A placeholder must get its home, and the user cannot create a credential there.
		if (
			block.code === 'credential-move-forbidden' &&
			block.detail?.cause === 'missing-create-right'
		) {
			const project = block.detail?.project;
			return project
				? i18n.baseText(
						'promotions.dependencies.hardBlock.credential-move-forbidden.missing-create-right',
						{ interpolate: { ...interpolate, project } },
					)
				: i18n.baseText(
						'promotions.dependencies.hardBlock.credential-move-forbidden.missing-create-right.noProject',
						{ interpolate },
					);
		}
		// A client must treat an unknown code as a block, so it still gets a message.
		const key = HARD_BLOCK_KEYS[block.code] ?? 'promotions.dependencies.hardBlock.unknown';
		return i18n.baseText(key, { interpolate });
	}

	/** More about a hard block, one line for each fact that the user may see. */
	function hardBlockDetails(block: PromotionHardBlock): string[] {
		const { sourceType, destinationType, hiddenFolderCount } = block.detail ?? {};
		// One string today. A newer server can send the names as a list.
		const rawFolders: unknown = block.detail?.folders;
		const folders = Array.isArray(rawFolders)
			? rawFolders.filter((name): name is string => typeof name === 'string').join(', ')
			: typeof rawFolders === 'string'
				? rawFolders
				: '';
		const lines: string[] = [];
		if (sourceType && destinationType) {
			lines.push(
				i18n.baseText('promotions.dependencies.hardBlock.types', {
					interpolate: {
						sourceType: credentialTypeName(sourceType),
						destinationType: credentialTypeName(destinationType),
					},
				}),
			);
		}
		// The project folders of the branch that hold the same credential.
		if (folders) {
			lines.push(
				i18n.baseText('promotions.dependencies.hardBlock.folders', { interpolate: { folders } }),
			);
		}
		const hidden = Number(hiddenFolderCount ?? 0);
		if (hidden > 0) {
			lines.push(
				i18n.baseText('promotions.dependencies.hardBlock.hiddenFolders', {
					adjustToNumber: hidden,
					interpolate: { count: String(hidden) },
				}),
			);
		}
		const permission = block.detail?.missingPermission;
		if (permission) {
			lines.push(
				i18n.baseText('promotions.dependencies.hardBlock.missingPermission', {
					interpolate: { permission },
				}),
			);
		}
		return lines;
	}

	return {
		targetName,
		groupTitle,
		groupDescription,
		stateLabel,
		usageLabel,
		rowFix,
		detailText,
		credentialNotMovedText,
		warningText,
		warningSentence,
		resourceName,
		resourceWarningText,
		resourceWarningSentence,
		noteText,
		hardBlockText,
		hardBlockDetails,
	};
}
