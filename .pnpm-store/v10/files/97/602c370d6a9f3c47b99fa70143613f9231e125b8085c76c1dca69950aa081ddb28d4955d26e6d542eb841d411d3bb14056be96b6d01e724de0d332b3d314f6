exports.setLocation = function setLocation(
    isReplace,
    activeSort,
    isFlat,
    activeFilters,
    fileFilter,
    expandedLines
) {
    const params = [
        activeSort.sortKey,
        activeSort.order,
        isFlat,
        activeFilters.low,
        activeFilters.medium,
        activeFilters.high,
        encodeURIComponent(fileFilter),
        expandedLines.map(encodeURIComponent).join(',')
    ];
    const newUrl = `#${params.join('/')}`;

    if (newUrl === location.hash) {
        return;
    }

    window.history[isReplace ? 'replaceState' : 'pushState'](null, '', newUrl);
};

exports.decodeLocation = function decodeLocation() {
    const items = location.hash.substr(1).split('/');
    if (items.length !== 8) {
        return null;
    }

    try {
        return {
            activeSort: {
                sortKey: items[0],
                order: items[1]
            },
            isFlat: JSON.parse(items[2]),
            activeFilters: {
                low: JSON.parse(items[3]),
                medium: JSON.parse(items[4]),
                high: JSON.parse(items[5])
            },
            fileFilter: decodeURIComponent(items[6]),
            expandedLines: items[7].split(',').map(decodeURIComponent)
        };
    } catch (e) {
        return null;
    }
};
