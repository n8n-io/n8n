export function filterAndHighlightDeep<T>(searchTerm: string, data?: T[]): T[] {
	// Helper function to recursively search and highlight within objects and arrays
	function searchAndHighlight(obj: any): any {
		if (typeof obj === 'string') {
			// If the property is a string, highlight the matches
			return obj.replace(
				new RegExp(searchTerm, 'gi'),
				(match) => `<span class="highlight">${match}</span>`,
			);
		} else if (Array.isArray(obj)) {
			// If the property is an array, recursively search and highlight its elements
			return obj.map((item) => searchAndHighlight(item));
		} else if (typeof obj === 'object') {
			// If the property is an object, recursively search and highlight its properties
			const highlightedObj: any = {};
			for (const key in obj) {
				highlightedObj[key] = searchAndHighlight(obj[key]);
			}
			return highlightedObj;
		} else {
			// If the property is not a string, array, or object, keep it as is
			return obj;
		}
	}

	const filteredAndHighlighted: T[] = data?.filter((item) => {
		// Convert non-string values to strings for search
		const jsonString = JSON.stringify(item);
		return jsonString.toLowerCase().includes(searchTerm.toLowerCase());
	});

	// Highlight the matches within the filtered objects
	const highlightedArray: T[] = filteredAndHighlighted?.map((item) => {
		return searchAndHighlight(item);
	});

	return highlightedArray;
}
