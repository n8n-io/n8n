import type {
	PromotionCredentialMove,
	PromotionDependencyNote,
	PromotionDependencyWarning,
	PromotionDirection,
	PromotionGapDetail,
	PromotionGapState,
	PromotionHardBlock,
	PromotionReferenceTarget,
	PromotionReferenceUsage,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { GapGroupId, GapTargetRow } from '../promotionDependencies';

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

	/** The name of the target. Without access the name can be missing, so the kind stands in. */
	function targetName(target: Pick<PromotionReferenceTarget, 'kind' | 'name'>): string {
		return target.name || i18n.baseText(`promotions.dependencies.target.unnamed.${target.kind}`);
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

	const usageLabel = (usage: PromotionReferenceUsage) =>
		i18n.baseText(`promotions.dependencies.usage.${usage}`);

	/** The fix of one row, when it depends on the target. The group explains the other cases. */
	function rowFix(group: GapGroupId, row: GapTargetRow): string | undefined {
		if (group === 'personal') {
			return i18n.baseText(`promotions.dependencies.fix.personal.${row.target.kind}`);
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

	const warningText = (warning: PromotionDependencyWarning) =>
		i18n.baseText(`promotions.dependencies.warning.${warning.code}`);

	const noteText = (note: PromotionDependencyNote) =>
		i18n.baseText(`promotions.dependencies.note.${note.code}`);

	function hardBlockText(block: PromotionHardBlock): string {
		// A client must treat an unknown code as a block, so it still gets a message.
		const key = HARD_BLOCK_KEYS[block.code] ?? 'promotions.dependencies.hardBlock.unknown';
		return i18n.baseText(key, {
			interpolate: {
				name: targetName(block.target),
				consumer: block.consumer?.name ?? '',
			},
		});
	}

	/** Both credential types of a type mismatch, when the user may see them. */
	function hardBlockDetail(block: PromotionHardBlock): string | undefined {
		const { sourceType, destinationType } = block.detail ?? {};
		if (!sourceType || !destinationType) return undefined;
		return i18n.baseText('promotions.dependencies.hardBlock.types', {
			interpolate: { sourceType, destinationType },
		});
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
		noteText,
		hardBlockText,
		hardBlockDetail,
	};
}
