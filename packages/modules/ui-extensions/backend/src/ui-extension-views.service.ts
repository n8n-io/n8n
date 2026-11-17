import {
	UI_EXTENSION_MAX_PAGES_PER_USER,
	UI_EXTENSION_MAX_VIEWS_PER_USER,
	uiExtensionViewSchema,
	type UiExtensionKind,
	type UiExtensionView,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import './ui-extensions.events';

export type UpsertUiExtensionViewInput = {
	/** Replaces the record with this ID. Without it, a new record is created. */
	viewId?: string;
	/** Defaults to `view`. A replace finds only a record of the same kind. */
	kind?: UiExtensionKind;
	title: string;
	icon?: string;
	source: string;
};

const LIMITS: Record<UiExtensionKind, number> = {
	view: UI_EXTENSION_MAX_VIEWS_PER_USER,
	page: UI_EXTENSION_MAX_PAGES_PER_USER,
};

const NAMES: Record<UiExtensionKind, { one: string; many: string; idParameter: string }> = {
	view: { one: 'side panel view', many: 'side panel views', idParameter: 'viewId' },
	page: { one: 'page', many: 'pages', idParameter: 'pageId' },
};

export class UiExtensionViewLimitError extends UserError {
	constructor(kind: UiExtensionKind = 'view') {
		const { many, idParameter } = NAMES[kind];
		super(
			`You can have at most ${LIMITS[kind]} ${many}. Pass the ${idParameter} of an existing one to replace it.`,
		);
	}
}

export class UiExtensionViewNotFoundError extends UserError {
	constructor(id: string, kind?: UiExtensionKind) {
		const name = kind ? NAMES[kind].one : 'side panel view or page';
		super(`No ${name} with the ID "${id}" exists for this user.`);
	}
}

/**
 * Stores the side panel views and pages of each user as one JSON row in the
 * `settings` table, so the feature needs no migration.
 */
@Service()
export class UiExtensionViewsService {
	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly eventService: EventService,
	) {}

	/** The views and pages of the user. */
	async list(userId: string): Promise<UiExtensionView[]> {
		const row = await this.settingsRepository.findByKey(this.keyFor(userId));
		return this.parse(row?.value, userId);
	}

	/**
	 * Creates a view or a page, or replaces the record with `viewId`. The read,
	 * merge and write run under a write lock, so parallel calls do not lose a
	 * record or pass the limit.
	 */
	async upsert(
		userId: string,
		input: UpsertUiExtensionViewInput,
	): Promise<{ view: UiExtensionView; created: boolean }> {
		const kind = input.kind ?? 'view';
		const key = this.keyFor(userId);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.getOrCreateWithWriteLock(key, '[]', false, ctx);
			const views = this.parse(row.value, userId);

			// A page tool must not replace a view, and the other way round.
			const index =
				input.viewId === undefined
					? -1
					: views.findIndex((view) => view.id === input.viewId && view.kind === kind);
			if (input.viewId !== undefined && index === -1) {
				throw new UiExtensionViewNotFoundError(input.viewId, kind);
			}
			if (index === -1 && views.filter((view) => view.kind === kind).length >= LIMITS[kind]) {
				throw new UiExtensionViewLimitError(kind);
			}

			const parsed = uiExtensionViewSchema.safeParse({
				id: input.viewId ?? randomUUID(),
				kind,
				title: input.title,
				icon: input.icon,
				source: input.source,
				updatedAt: new Date().toISOString(),
			});
			if (!parsed.success) {
				throw new UserError(`The ${NAMES[kind].one} is not valid: ${parsed.error.message}`);
			}
			const view = parsed.data;

			if (index === -1) views.push(view);
			else views[index] = view;

			await this.settingsRepository.upsertByKey(key, JSON.stringify(views), false, ctx);

			return { view, created: index === -1 };
		});

		this.emitChange(userId, result.view, 'saved');
		return result;
	}

	/**
	 * Removes a view or a page of the user. It reads only the row of that user,
	 * so a user can remove only what they added.
	 */
	async remove(userId: string, id: string): Promise<UiExtensionView> {
		const key = this.keyFor(userId);

		const removed = await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.getOrCreateWithWriteLock(key, '[]', false, ctx);
			const views = this.parse(row.value, userId);

			const index = views.findIndex((view) => view.id === id);
			if (index === -1) throw new UiExtensionViewNotFoundError(id);

			const [view] = views.splice(index, 1);
			await this.settingsRepository.upsertByKey(key, JSON.stringify(views), false, ctx);
			return view;
		});

		this.emitChange(userId, removed, 'removed');
		return removed;
	}

	/** Emitted after the transaction, so a listener never sees a change that was rolled back. */
	private emitChange(userId: string, view: UiExtensionView, change: 'saved' | 'removed') {
		this.eventService.emit('ui-extension-changed', {
			userId,
			extensionId: view.id,
			kind: view.kind,
			change,
		});
	}

	private keyFor(userId: string) {
		return `uiExtensions.views.${userId}`;
	}

	/**
	 * A missing or broken value gives no records, and a broken entry is skipped,
	 * so one bad row or entry cannot break the editor or drop the other records.
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
