import { useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { h } from 'vue';

export interface EngineV2SwitchConfirmation {
	/** The number of groups of findings. */
	count: number;
	/** True when one group or more blocks publishing. */
	hasBlocking: boolean;
	/** True when the workflow has a published version, which keeps its engine. */
	hasPublishedVersion: boolean;
}

/**
 * Asks the user to confirm the switch to engine v2 of a workflow with findings. It is a message
 * box, not a dialog, so it opens above the workflow settings modal. Returns true only for
 * "Switch and fix issues". "Keep Engine v1", Escape and the close icon return false.
 */
export async function confirmEngineV2Switch({
	count,
	hasBlocking,
	hasPublishedVersion,
}: EngineV2SwitchConfirmation): Promise<boolean> {
	const i18n = useI18n();

	const summary = [
		i18n.baseText('engineV2Compatibility.confirm.message', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		}),
		i18n.baseText(
			hasBlocking
				? 'engineV2Compatibility.confirm.message.blocking'
				: 'engineV2Compatibility.confirm.message.warnings',
		),
	].join(' ');

	const message = h('div', { 'data-test-id': 'engine-v2-switch-confirm-message' }, [
		h('p', summary),
		hasPublishedVersion
			? h('p', { style: { marginTop: 'var(--spacing--xs)' } }, [
					i18n.baseText('engineV2Compatibility.confirm.publishedVersion'),
				])
			: null,
	]);

	const action = await useMessage().confirm(
		message,
		i18n.baseText('engineV2Compatibility.confirm.title'),
		{
			confirmButtonText: i18n.baseText('engineV2Compatibility.confirm.switch'),
			cancelButtonText: i18n.baseText('engineV2Compatibility.confirm.keep'),
		},
	);

	return action === 'confirm';
}
