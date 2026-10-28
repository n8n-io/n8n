import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

/** A WhatsApp list holds at most 10 rows in total. */
export const WHATSAPP_MAX_LIST_ROWS = 10;

/** A page that has a "More…" row shows one option fewer. */
export const WHATSAPP_PAGE_SIZE = WHATSAPP_MAX_LIST_ROWS - 1;

/** Options beyond this number are dropped, so a bad tool cannot create endless pages. */
export const WHATSAPP_MAX_PAGED_OPTIONS = 50;

const PAGE_VALUE_PREFIX = 'n8n:page:';

const cacheKey = (key: string) => `agents:whatsapp:option-pages:${key}`;

export interface PagedOption {
	label: string;
	value: string;
	description?: string;
}

export interface StoredOptionPages {
	options: PagedOption[];
	/** The label of the list button. */
	label?: string;
	/** The card title of the original question, shown again on later pages. */
	title?: string;
	/** The text of the original question, shown again on later pages. */
	prompt?: string;
}

export interface OptionPage {
	/** The options this page shows, without the "More…" row. */
	options: PagedOption[];
	/** The 0-based index of the first option on this page. */
	start: number;
	/** The page number to open with "More…", or `undefined` on the last page. */
	nextPage?: number;
}

/**
 * Split a list of options into pages of at most 10 rows. A page that is not
 * the last one shows 9 options and leaves the tenth row for "More…". The last
 * page shows up to 10 options.
 */
export function getOptionPage(options: PagedOption[], pageIndex: number): OptionPage {
	const start = pageIndex * WHATSAPP_PAGE_SIZE;
	const remaining = options.length - start;
	if (remaining <= WHATSAPP_MAX_LIST_ROWS) {
		return { options: options.slice(start), start };
	}
	return {
		options: options.slice(start, start + WHATSAPP_PAGE_SIZE),
		start,
		nextPage: pageIndex + 1,
	};
}

/** The value of a "More…" row. It carries no option data, so it is always short. */
export function encodePageValue(key: string, pageIndex: number): string {
	return `${PAGE_VALUE_PREFIX}${key}:${pageIndex}`;
}

export function parsePageValue(
	value: string | undefined,
): { key: string; pageIndex: number } | undefined {
	if (!value?.startsWith(PAGE_VALUE_PREFIX)) return undefined;
	const [key, page] = value.slice(PAGE_VALUE_PREFIX.length).split(':');
	const pageIndex = Number(page);
	if (!key || !Number.isInteger(pageIndex) || pageIndex < 0) return undefined;
	return { key, pageIndex };
}

/**
 * Keeps the full option list of a WhatsApp list that has more than 10 options.
 * WhatsApp cannot edit or delete a message, so each page is a new message.
 * The options can be needed by any main, so this uses the shared cache and
 * not process memory.
 */
@Service()
export class WhatsAppOptionPagesStore {
	constructor(
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
	) {}

	/**
	 * Returns the key that a "More…" row carries, or `undefined` when the write
	 * failed. The options stay valid as long as the suspended run does, so this
	 * uses the checkpoint TTL.
	 */
	async save(pages: StoredOptionPages): Promise<string | undefined> {
		const key = randomBytes(8).toString('hex');
		try {
			await this.cacheService.set(
				cacheKey(key),
				pages,
				this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
			);
			return key;
		} catch (error) {
			this.logger.warn('[WhatsAppOptionPagesStore] Failed to save the option pages', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/** Returns `undefined` when the options expired or the lookup failed. */
	async get(key: string): Promise<StoredOptionPages | undefined> {
		try {
			return await this.cacheService.get<StoredOptionPages>(cacheKey(key));
		} catch (error) {
			this.logger.warn('[WhatsAppIntegration] Failed to read the option pages', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}
