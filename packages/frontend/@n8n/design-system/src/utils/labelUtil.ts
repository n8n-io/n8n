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
