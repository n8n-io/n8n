import type { EditorState } from '@codemirror/state';
import { tsProjectField } from './typescript-project-field';

export const tsQuickInfo = async (state: EditorState, pos: number) => {
	const rawQuickInfo = await state.field(tsProjectField).getQuickInfo(pos);

	if (!rawQuickInfo) return null;

	return {
		pos,
		create() {
			const container = document.createElement('div');
			const domTop = document.createElement('div');

			domTop.setAttribute('class', 'cm-quickinfo-tooltip');

			if (rawQuickInfo.displayParts) {
				domTop.innerHTML = rawQuickInfo.displayParts.map((p) => p.text).join('');
			}

			container.appendChild(domTop);

			// @TODO: Clean this up

			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			if (rawQuickInfo.documentation && rawQuickInfo.documentation[0]) {
				const domBottom = document.createElement('div');
				domBottom.setAttribute('class', 'cm-quickinfo-tooltip');

				domBottom.textContent = rawQuickInfo.documentation[0].text;
				if (rawQuickInfo.tags?.length) {
					for (const tag of rawQuickInfo.tags) {
						if (tag.name === 'param') {
							if (tag.text) {
								for (const line of tag.text) {
									if (line.kind === 'parameterName') {
										domBottom.innerHTML += `<br><br>@param ${line.text}`;
									} else if (line.kind === 'space') {
										// skip
									} else {
										domBottom.innerHTML += `<br>${line.text}`;
									}
								}
							}
						}
					}
				}

				container.appendChild(domBottom);
			}

			return {
				dom: container,
			};
		},
	};
};
