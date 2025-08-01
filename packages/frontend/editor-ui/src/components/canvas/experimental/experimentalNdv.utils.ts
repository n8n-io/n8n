import type { INodeUi } from '@/Interface';
import type { I18nClass } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';

export function getNodeSubTitleText(
	node: INodeUi,
	nodeType: INodeTypeDescription,
	includeOperation: boolean,
	t: I18nClass,
) {
	if (node.disabled) {
		return `(${t.baseText('node.disabled')})`;
	}

	const displayName = nodeType.displayName ?? '';

	if (!includeOperation) {
		return displayName;
	}

	const selectedOperation = node.parameters.operation;
	const selectedOperationDisplayName =
		selectedOperation &&
		nodeType.properties
			.find((p) => p.name === 'operation')
			?.options?.find((o) => 'value' in o && o.value === selectedOperation)?.name;

	if (!selectedOperationDisplayName) {
		return displayName;
	}

	return `${displayName}: ${selectedOperationDisplayName}`;
}

export function stopImmediatePropagationIfPanelShouldScroll(event: WheelEvent) {
	debugger;
	if (event.ctrlKey) {
		// If the event is pinch, let it propagate and zoom canvas
		return;
	}

	if (
		event.currentTarget instanceof HTMLElement &&
		event.currentTarget.scrollHeight <= event.currentTarget.offsetHeight
	) {
		// If the settings pane doesn't have to scroll, let it propagate and move the canvas
		return;
	}

	// If the event has larger horizontal element, let it propagate and move the canvas
	if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
		return;
	}

	// Otherwise, let it scroll the pane
	event.stopImmediatePropagation();
}
