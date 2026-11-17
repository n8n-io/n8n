import type { PromotionDependencyReport, PromotionEnvironmentChangesProject } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type { PackageDirectoryInventory } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { ImportSelection } from '@/modules/n8n-packages/n8n-packages.types';

import type { PromotionOperationInput } from './promotions.types';
import type { SelectivePushOptions } from './working-copy-updater';

/** What the dependency check of a Promote can read. */
export type PromoteDependencyContext = {
	user: User;
	input: PromotionOperationInput;
	/** The projects of the changes view, with the right of the user in each. */
	projects: readonly PromotionEnvironmentChangesProject[];
	/** The items that the Promote writes. Not set for the preview, which lists every change. */
	selection?: readonly SelectivePushOptions[];
};

/** What the dependency check of an Apply can read. */
export type ApplyDependencyContext = {
	user: User;
	input: PromotionOperationInput;
	/** The plan of the whole Apply, across its projects. */
	plan: PackageImportPlan;
	/** The package at the commit that the Apply reads. */
	inventory: PackageDirectoryInventory;
	/** Not set for a whole-instance Apply. */
	selection?: ImportSelection;
};

/**
 * The one place where promotion asks for a dependency report and compares it with the
 * confirmation of the user. The previews and the operations across projects call it.
 *
 * The check engine is not connected yet. Each report method returns `undefined`, so the
 * previews carry no report and the operations never stop on gaps.
 */
@Service()
export class PromotionDependencyGate {
	/** Connect the Promote check here. */
	async promoteReport(
		_context: PromoteDependencyContext,
	): Promise<PromotionDependencyReport | undefined> {
		return undefined;
	}

	/** Connect the Apply check here. */
	async applyReport(
		_context: ApplyDependencyContext,
	): Promise<PromotionDependencyReport | undefined> {
		return undefined;
	}

	/**
	 * True when the operation must write nothing and return `gaps-changed`: the report has a hard
	 * block, the environment is strict and gaps exist, or the gaps differ from the confirmed ones.
	 */
	mustStop(report: PromotionDependencyReport, confirmedGapIds: readonly string[] = []): boolean {
		if (report.blocked) return true;
		const confirmed = new Set(confirmedGapIds);
		return (
			report.gaps.length !== confirmed.size || report.gaps.some(({ id }) => !confirmed.has(id))
		);
	}
}
