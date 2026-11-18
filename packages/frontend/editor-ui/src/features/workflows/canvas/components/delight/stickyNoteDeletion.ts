// Keep the flight separate from workflow deletion so undo stays immediate.
export function animateStickyNoteDeletion(canvas: HTMLElement | null | undefined, ids: string[]) {
	if (!canvas) return;
	const nodes = canvas.querySelectorAll<HTMLElement>('.vue-flow__node[data-id]');
	for (const node of nodes) {
		if (!ids.includes(node.dataset.id ?? '')) continue;
		const paper = node?.querySelector<HTMLElement>('.canvas-origami[data-deletion-enabled="true"]');
		if (!node?.parentElement || !paper) continue;
		const ghost = node.cloneNode(true);
		if (!(ghost instanceof HTMLElement)) continue;
		const effect = ghost.querySelector<HTMLElement>('.canvas-origami');
		if (!effect) continue;
		ghost.classList.remove('vue-flow__node', 'selected', 'selectable', 'draggable');
		ghost.classList.add('canvas-origami-deletion');
		ghost.inert = true;
		ghost.style.pointerEvents = 'none';
		ghost.setAttribute('aria-hidden', 'true');
		for (const element of [ghost, ...ghost.querySelectorAll('*')]) {
			for (const attribute of ['id', 'data-id', 'data-testid', 'data-test-id']) {
				element.removeAttribute(attribute);
			}
		}
		const duration = effect.classList.contains('is-reduced') ? 650 : 1700;
		effect.style.setProperty('--origami-duration', `${duration}ms`);
		effect.classList.add('is-folding', 'is-deleting');
		node.parentElement.append(ghost);
		setTimeout(() => ghost.remove(), duration);
	}
}
