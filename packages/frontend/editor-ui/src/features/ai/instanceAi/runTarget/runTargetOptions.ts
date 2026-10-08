import type {
	InstanceAiThreadRunTarget,
	LinkedInstanceStatus,
	LinkedInstanceSummary,
	RunTarget,
} from '@n8n/api-types';

/** Menu item id of "This computer". A link is named by its id, which is a uuid and never this value. */
export const LOCAL_RUN_TARGET_ID = 'local';

/** Menu item id of "Link a cloud instance…". It is not a link, so it never clashes with a uuid. */
export const LINK_CLOUD_MENU_ID = 'link-cloud';

/** Every message of the run target menu. Each key is a key of the i18n catalogue. */
export type RunTargetTextKey =
	| 'instanceAi.automation.place.thisComputer'
	| 'instanceAi.automation.place.otherInstance'
	| 'instanceAi.runTarget.trigger'
	| 'instanceAi.runTarget.local.description'
	| 'instanceAi.runTarget.linked.description'
	| 'instanceAi.runTarget.offline'
	| 'instanceAi.runTarget.refused'
	| 'instanceAi.runTarget.mcpOff'
	| 'instanceAi.runTarget.unchecked'
	| 'instanceAi.runTarget.checkConnection'
	| 'instanceAi.runTarget.linkAgain'
	| 'instanceAi.runTarget.turnOnMcp';

export type RunTargetTranslate = (key: RunTargetTextKey, params?: Record<string, string>) => string;

export interface RunTargetOption {
	/** `LOCAL_RUN_TARGET_ID`, or the id of the link. */
	id: string;
	target: RunTarget;
	label: string;
	description: string;
	/** Only an online link can take a chat. The description then says what the user can do. */
	disabled: boolean;
}

/** The label and the hint of a link that cannot take a chat now. */
const UNAVAILABLE_LINK: Record<
	Exclude<LinkedInstanceStatus, 'online'>,
	{ label: RunTargetTextKey; hint: RunTargetTextKey }
> = {
	offline: { label: 'instanceAi.runTarget.offline', hint: 'instanceAi.runTarget.checkConnection' },
	unauthorised: { label: 'instanceAi.runTarget.refused', hint: 'instanceAi.runTarget.linkAgain' },
	'mcp-disabled': { label: 'instanceAi.runTarget.mcpOff', hint: 'instanceAi.runTarget.turnOnMcp' },
	unknown: {
		label: 'instanceAi.runTarget.unchecked',
		hint: 'instanceAi.runTarget.checkConnection',
	},
};

function linkOption(link: LinkedInstanceSummary, translate: RunTargetTranslate): RunTargetOption {
	const target: RunTarget = { kind: 'linked', instanceId: link.id };
	if (link.status === 'online') {
		return {
			id: link.id,
			target,
			label: link.name,
			description: translate('instanceAi.runTarget.linked.description'),
			disabled: false,
		};
	}
	const unavailable = UNAVAILABLE_LINK[link.status];
	return {
		id: link.id,
		target,
		label: translate(unavailable.label, { name: link.name }),
		description: translate(unavailable.hint),
		disabled: true,
	};
}

/** The menu of the run target picker: this computer first, then each link in the given order. */
export function runTargetOptions(
	links: readonly LinkedInstanceSummary[],
	translate: RunTargetTranslate,
): RunTargetOption[] {
	const local: RunTargetOption = {
		id: LOCAL_RUN_TARGET_ID,
		target: { kind: 'local' },
		label: translate('instanceAi.automation.place.thisComputer'),
		description: translate('instanceAi.runTarget.local.description'),
		disabled: false,
	};
	return [local, ...links.map((link) => linkOption(link, translate))];
}

/** The place that the trigger shows: this computer, or the name of the chosen link. */
export function runTargetPlace(
	target: RunTarget,
	links: readonly LinkedInstanceSummary[],
	translate: RunTargetTranslate,
): string {
	if (target.kind === 'local') return translate('instanceAi.automation.place.thisComputer');
	const link = links.find(({ id }) => id === target.instanceId);
	return link?.name ?? translate('instanceAi.automation.place.otherInstance');
}

/**
 * The name for the header chip, or `undefined` when the chat runs here. A shared chat always
 * runs here, whatever its stored target is.
 */
export function runTargetChipName(
	runTarget: InstanceAiThreadRunTarget | undefined,
	isShared: boolean,
): string | undefined {
	if (isShared || runTarget?.kind !== 'linked') return undefined;
	return runTarget.name;
}

/**
 * A run target for a message payload. It is set only when the user chose one, so the payload
 * carries no empty key.
 */
export function optionalRunTarget(runTarget: RunTarget | undefined): { runTarget?: RunTarget } {
	return runTarget ? { runTarget } : {};
}
