import type { hoverTooltip } from '@codemirror/view';
import { typescriptWorkerFacet } from './facet';

type HoverSource = Parameters<typeof hoverTooltip>[0];
export const typescriptHoverTooltips: HoverSource = async (view, pos) => {
	const { worker } = view.state.facet(typescriptWorkerFacet);

	const info = await worker.getHoverTooltip(pos);

	if (!info) return null;

	return {
		pos: info.start,
		end: info.end,
		above: true,
		create: () => {
			const div = document.createElement('div');
			div.classList.add('cm-tooltip-lint');
			const wrapper = document.createElement('div');
			wrapper.classList.add('cm-diagnostic');
			div.appendChild(wrapper);
			const text = document.createElement('div');
			text.classList.add('cm-diagnosticText');
			wrapper.appendChild(text);

			if (info.quickInfo?.displayParts) {
				for (const part of info.quickInfo.displayParts) {
					const span = text.appendChild(document.createElement('span'));
					if (
						part.kind === 'keyword' &&
						['string', 'number', 'boolean', 'object'].includes(part.text)
					) {
						span.className = 'ts-primitive';
					} else if (part.kind === 'punctuation' && ['(', ')'].includes(part.text)) {
						span.className = 'ts-text';
					} else {
						span.className = `ts-${part.kind}`;
					}
					span.innerText = part.text;
				}
			}

			const documentation = info.quickInfo?.documentation?.find((doc) => doc.kind === 'text')?.text;
			if (documentation) {
				const docElement = document.createElement('div');
				docElement.classList.add('cm-diagnosticDocs');
				docElement.textContent = documentation;
				wrapper.appendChild(docElement);
			}

			return { dom: div };
		},
	};
};
