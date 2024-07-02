export const getInitials = (label: string): string => {
	const words = label
		.split(' ')
		.filter((word) => word !== '')
		.map((word) => [...new Intl.Segmenter().segment(word)]);

	if (words.length === 0) {
		return '';
	} else if (words.length === 1) {
		// first two segments of the first word
		return (
			words
				.at(0)
				?.slice(0, 2)
				.map((grapheme) => grapheme.segment)
				.join('') ?? ''
		);
	} else {
		// first segment ok the first two words
		return words
			.slice(0, 2)
			.map((word) => word.at(0)?.segment ?? '')
			.join('');
	}
};
