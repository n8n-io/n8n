import { closeCompletion } from '@codemirror/autocomplete';
import { ViewPlugin, type EditorView, type PluginValue } from '@codemirror/view';

import { closeCursorInfoBox } from './InfoBoxTooltip';

export const COMMAND_BAR_OPEN_EVENT = 'n8n:command-bar:open';

export const closeTooltipsOnCommandBarOpen = ViewPlugin.fromClass(
	class implements PluginValue {
		private readonly listener: () => void;

		constructor(view: EditorView) {
			this.listener = () => {
				closeCompletion(view);
				closeCursorInfoBox(view);
			};
			window.addEventListener(COMMAND_BAR_OPEN_EVENT, this.listener);
		}

		destroy() {
			window.removeEventListener(COMMAND_BAR_OPEN_EVENT, this.listener);
		}
	},
);
