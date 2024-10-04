// export const getInitials = (label: string): string => {
// 	const words = label
// 		.split(' ')
// 		.filter((word) => word !== '')
// 		.map((word) => [...new Intl.Segmenter().segment(word)]);

// 	if (words.length === 0) {
// 		return '';
// 	} else if (words.length === 1) {
// 		// first two segments of the first word
// 		return (
// 			words
// 				.at(0)
// 				?.slice(0, 2)
// 				.map((grapheme) => grapheme.segment)
// 				.join('') ?? ''
// 		);
// 	} else {
// 		// first segment ok the first two words
// 		return words
// 			.slice(0, 2)
// 			.map((word) => word.at(0)?.segment ?? '')
// 			.join('');
// 	}
// };

export const getInitials = (label: string): string => {
	const isSegmenterSupported = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

	const segmentWord = (word: string): string[] => {
		if (isSegmenterSupported) {
			return [...new Intl.Segmenter().segment(word)].map((s) => s.segment);
		}
		return word.split('');
	};

	const getFirstSegment = (word: string[]): string => word[0] || '';
	const getFirstTwoSegments = (word: string[]): string => word.slice(0, 2).join('');

	const words = label.split(' ').filter(Boolean).map(segmentWord);

	if (words.length === 0) return '';
	if (words.length === 1) return getFirstTwoSegments(words[0]);
	return words.slice(0, 2).map(getFirstSegment).join('');
};
