export function createDefaultMountingTarget(mountingTarget: string) {
	const mountingTargetNode = document.querySelector(mountingTarget);
	if (!mountingTargetNode) {
		const generatedMountingTargetNode = document.createElement('div');

		if (mountingTarget.startsWith('#')) {
			generatedMountingTargetNode.id = mountingTarget.replace('#', '');
		}

		if (mountingTarget.startsWith('.')) {
			generatedMountingTargetNode.classList.add(mountingTarget.replace('.', ''));
		}

		document.body.appendChild(generatedMountingTargetNode);
	}
}
