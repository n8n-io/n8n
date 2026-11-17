import type {
	PromotionDependencyNote,
	PromotionDependencyWarning,
	PromotionDirection,
	PromotionGapState,
	PromotionHardBlock,
	PromotionReferenceTarget,
	PromotionReferenceUsage,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { GapGroupId, GapTargetRow } from '../promotionDependencies';

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
			return i18n.baseText('promotions.dependencies.fix.not-on-branch', {
				interpolate: { name: targetName(row.target) },
			});
		}
		return undefined;
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
		warningText,
		noteText,
		hardBlockText,
		hardBlockDetail,
	};
}
