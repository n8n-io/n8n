import type {
	PromotionCredentialMove,
	PromotionDependencyNote,
	PromotionDependencyWarning,
	PromotionDirection,
	PromotionGapDetail,
	PromotionGapState,
	PromotionHardBlock,
	PromotionReferenceUsage,
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

const WARNING_KEYS = new Map<string, BaseTextKey>([
	['broken-on-source', 'promotions.dependencies.warning.broken-on-source'],
	['legacy-workflow-reference', 'promotions.dependencies.warning.legacy-workflow-reference'],
]);

/**
 * A newer server adds warning codes. The words of a code select the nearest sentence, and any
 * other code gets a generic one, so a warning never shows as a raw key.
 */
const WARNING_FALLBACKS: ReadonlyArray<[pattern: RegExp, key: BaseTextKey]> = [
	[/placeholder/i, 'promotions.dependencies.warning.placeholder'],
	[/data-?table/i, 'promotions.dependencies.warning.dataTable'],
	[/variable/i, 'promotions.dependencies.warning.variable'],
];

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

	function warningText(warning: { code: PromotionDependencyWarning['code'] | (string & {}) }) {
		const key =
			WARNING_KEYS.get(warning.code) ??
			WARNING_FALLBACKS.find(([pattern]) => pattern.test(warning.code))?.[1] ??
			'promotions.dependencies.warning.unknown';
		return i18n.baseText(key);
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

	const noteText = (note: PromotionDependencyNote) =>
		i18n.baseText(`promotions.dependencies.note.${note.code}`);

	/**
	 * Why a credential cannot move to its owner on the branch. `cause` comes from a newer server.
	 * An older one only names the missing permission.
	 */
	function moveForbiddenCause(
		block: PromotionHardBlock,
	): 'missing-move-right' | 'missing-create-right' {
		const { cause, missingPermission } = block.detail ?? {};
		if (cause === 'missing-create-right' || cause === 'missing-move-right') return cause;
		return missingPermission === 'credential:create'
			? 'missing-create-right'
			: 'missing-move-right';
	}

	function hardBlockText(block: PromotionHardBlock): string {
		const interpolate = {
			name: targetName(block.target),
			consumer: block.consumer?.name ?? '',
		};
		if (
			block.code === 'credential-move-forbidden' &&
			moveForbiddenCause(block) === 'missing-create-right'
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

	/** The permission that the user lacks, for a block that a permission causes. */
	function missingPermissionOf(block: PromotionHardBlock): string | undefined {
		const named = block.detail?.missingPermission;
		if (named) return named;
		if (block.code !== 'credential-move-forbidden') return undefined;
		return moveForbiddenCause(block) === 'missing-create-right'
			? 'credential:create'
			: 'credential:move';
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
		const permission = missingPermissionOf(block);
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
		noteText,
		hardBlockText,
		hardBlockDetails,
	};
}
