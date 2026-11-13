import {
	UI_EXTENSION_MAX_VIEWS_PER_USER,
	uiExtensionViewSchema,
	type UiExtensionView,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

export type UpsertUiExtensionViewInput = {
	/** Replaces this view. Without it, a new view is created. */
	viewId?: string;
	title: string;
	icon?: string;
	source: string;
};

export class UiExtensionViewLimitError extends UserError {
	constructor() {
		super(
			`You can have at most ${UI_EXTENSION_MAX_VIEWS_PER_USER} side panel views. Pass the viewId of an existing view to replace it.`,
		);
	}
}

export class UiExtensionViewNotFoundError extends UserError {
	constructor(viewId: string) {
		super(`No side panel view with the ID "${viewId}" exists for this user.`);
	}
}

/**
 * Stores the side panel views of each user as one JSON row in the `settings`
 * table, so the feature needs no migration.
 */
@Service()
export class UiExtensionViewsService {
	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async list(userId: string): Promise<UiExtensionView[]> {
		const row = await this.settingsRepository.findByKey(this.keyFor(userId));
		return this.parse(row?.value, userId);
	}

	/**
	 * Creates a view, or replaces the view with `viewId`. The read, merge and
	 * write run under a write lock, so parallel calls do not lose a view or pass
	 * the limit.
	 */
	async upsert(
		userId: string,
		input: UpsertUiExtensionViewInput,
	): Promise<{ view: UiExtensionView; created: boolean }> {
		const key = this.keyFor(userId);

		return await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.getOrCreateWithWriteLock(key, '[]', false, ctx);
			const views = this.parse(row.value, userId);

			const index =
				input.viewId === undefined ? -1 : views.findIndex((view) => view.id === input.viewId);
			if (input.viewId !== undefined && index === -1) {
				throw new UiExtensionViewNotFoundError(input.viewId);
			}
			if (index === -1 && views.length >= UI_EXTENSION_MAX_VIEWS_PER_USER) {
				throw new UiExtensionViewLimitError();
			}

			const parsed = uiExtensionViewSchema.safeParse({
				id: input.viewId ?? randomUUID(),
				title: input.title,
				icon: input.icon,
				source: input.source,
				updatedAt: new Date().toISOString(),
			});
			if (!parsed.success) {
				throw new UserError(`The side panel view is not valid: ${parsed.error.message}`);
			}
			const view = parsed.data;

			if (index === -1) views.push(view);
			else views[index] = view;

			await this.settingsRepository.upsertByKey(key, JSON.stringify(views), false, ctx);

			return { view, created: index === -1 };
		});
	}

	private keyFor(userId: string) {
		return `uiExtensions.views.${userId}`;
	}

	/**
	 * A missing or broken value gives no views, and a broken entry is skipped, so
	 * one bad row or entry cannot break the editor or drop the other views.
	 */
	private parse(value: string | undefined, userId: string): UiExtensionView[] {
		if (!value) return [];

		let json: unknown;
		try {
			json = JSON.parse(value);
		} catch {
			json = undefined;
		}

		if (!Array.isArray(json)) {
			this.logger.warn('Ignored the stored side panel views because they are not a list', {
				userId,
			});
			return [];
		}

		const views: UiExtensionView[] = [];
		for (const entry of json) {
			const result = uiExtensionViewSchema.safeParse(entry);
			if (result.success) views.push(result.data);
			else this.logger.warn('Skipped a stored side panel view that is not valid', { userId });
		}
		return views;
	}
}
