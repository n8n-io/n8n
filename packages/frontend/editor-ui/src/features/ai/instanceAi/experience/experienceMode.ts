import {
	experienceModeSchema,
	type ExperienceMode,
	type FrontendModuleSettings,
} from '@n8n/api-types';

/** Today's interface. The editor shows it when experience modes are off. */
const FALLBACK_MODE: ExperienceMode = 'power';

type ExperienceSettings = NonNullable<
	NonNullable<FrontendModuleSettings['instance-ai']>['experience']
>;

/**
 * Applies the module-settings rule that experience modes are on only while the
 * Assistant is on. A local change of the Assistant setting must keep this rule
 * until the next settings fetch.
 */
export function limitExperienceToAssistant(
	experience: ExperienceSettings | undefined,
	assistantEnabled: boolean,
): ExperienceSettings | undefined {
	if (!experience) return undefined;
	return { ...experience, enabled: experience.enabled && assistantEnabled };
}

export interface ExperienceModeInput {
	/** Whether experience modes are on for the instance. */
	enabled: boolean;
	/** The user's saved choice. It comes from the server, so it is validated here. */
	saved?: unknown;
	/** The instance default. It comes from the server, so it is validated here. */
	defaultMode?: unknown;
}

/**
 * Gives the mode to show. With the flag off, the result is always Power.
 * With the flag on, the result is the user's saved mode, else the instance
 * default, else Power.
 */
export function resolveExperienceMode({
	enabled,
	saved,
	defaultMode,
}: ExperienceModeInput): ExperienceMode {
	if (!enabled) return FALLBACK_MODE;

	const savedMode = experienceModeSchema.safeParse(saved);
	if (savedMode.success) return savedMode.data;

	const instanceMode = experienceModeSchema.safeParse(defaultMode);
	return instanceMode.success ? instanceMode.data : FALLBACK_MODE;
}

export function oppositeExperienceMode(mode: ExperienceMode): ExperienceMode {
	return mode === 'simple' ? 'power' : 'simple';
}

/** Saves one mode on the server. It throws when the save fails. */
export type SaveExperienceMode = (mode: ExperienceMode) => Promise<void>;

export interface ExperienceModeSaver {
	/**
	 * Asks to save `mode`. Resolves to true when this is the last request of the
	 * queue and the server saved it. Resolves to false when a later request
	 * replaced it or when a save failed.
	 */
	request: (mode: ExperienceMode, save: SaveExperienceMode) => Promise<boolean>;
}

/**
 * Sends at most one save at a time. While a save runs, it keeps only the latest
 * requested mode and sends it when the running save returns. The server merges
 * user settings with a read and then a write, so two saves at the same time can
 * lose one of them. A failed save stops the queue and drops the queued mode.
 *
 * `onPending` receives the mode to show while a save is queued or running, and
 * null when the queue is empty. The caller then shows the saved value again.
 */
export function createExperienceModeSaver(
	onPending: (mode: ExperienceMode | null) => void,
): ExperienceModeSaver {
	let wanted: ExperienceMode | null = null;
	let lastTicket = 0;
	let queue: Promise<number> | null = null;

	// Resolves to the ticket of the last request, which is the mode the server saved last.
	async function drain(save: SaveExperienceMode): Promise<number> {
		let sent: ExperienceMode | null = null;
		try {
			while (wanted !== null && wanted !== sent) {
				sent = wanted;
				await save(sent);
			}
			return lastTicket;
		} finally {
			wanted = null;
			queue = null;
			onPending(null);
		}
	}

	return {
		async request(mode, save) {
			const ticket = ++lastTicket;
			wanted = mode;
			onPending(mode);
			queue ??= drain(save);
			try {
				return (await queue) === ticket;
			} catch {
				// `save` reports its own error, so each waiting caller only gets false.
				return false;
			}
		},
	};
}
