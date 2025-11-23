/**
 * Truncate text to fit within a specified width, adding an ellipsis if necessary.
 * @param text The text to truncate.
 * @param availableWidth The available width for the text in pixels.
 * @param fontSizeInPixels The font size of the text in pixels.
 * @returns The truncated text with ellipsis, or an empty string if the text fits within the available width.
 */
export const truncateTextToFitWidth = (
	text: string,
	availableWidth: number,
	fontSizeInPixels: number,
): string => {
	if (!text || availableWidth <= 0) {
		return '';
	}

	const averageCharWidth = 0.55 * fontSizeInPixels;

	const maxLengthToDisplay = Math.floor(availableWidth / averageCharWidth);

	if (text.length <= maxLengthToDisplay) {
		return '';
	}

	const truncated = text.slice(0, maxLengthToDisplay);
	const lastSpaceIndex = truncated.lastIndexOf(' ');
	return truncated.slice(0, lastSpaceIndex === -1 ? maxLengthToDisplay : lastSpaceIndex) + '...';
};
