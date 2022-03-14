export function isChildOf(parent: Element, child: Element): boolean {
	if (child.parentElement === null) {
		return false;
	}
	if (child.parentElement === parent) {
		return true;
	}

	return isChildOf(parent, child.parentElement);
}

