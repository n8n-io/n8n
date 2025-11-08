export const reorderItem = <T extends { index: number }>(
	items: T[],
	oldIndex: number,
	newIndex: number,
) => {
	return items.map((item) => {
		if (item.index === oldIndex) return { ...item, index: newIndex };
		if (oldIndex < newIndex && item.index > oldIndex && item.index <= newIndex) {
			return { ...item, index: item.index - 1 };
		}
		if (oldIndex > newIndex && item.index >= newIndex && item.index < oldIndex) {
			return { ...item, index: item.index + 1 };
		}
		return item;
	});
};
