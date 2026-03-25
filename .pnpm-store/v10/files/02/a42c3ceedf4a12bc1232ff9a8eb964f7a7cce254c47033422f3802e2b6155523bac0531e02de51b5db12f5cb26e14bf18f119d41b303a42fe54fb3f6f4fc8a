/*
  @license
	Rollup.js v4.52.4
	Fri, 03 Oct 2025 05:47:35 GMT - commit cd81da74af1d11fda0ee1752cc26f6dc8217e9ca

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
const getLogFilter = filters => {
    if (filters.length === 0)
        return () => true;
    const normalizedFilters = filters.map(filter => filter.split('&').map(subFilter => {
        const inverted = subFilter[0] === '!';
        if (inverted)
            subFilter = subFilter.slice(1);
        const [key, ...value] = subFilter.split(':');
        return { inverted, key: key.split('.'), parts: value.join(':').split('*') };
    }));
    return (log) => {
        nextIntersectedFilter: for (const intersectedFilters of normalizedFilters) {
            for (const { inverted, key, parts } of intersectedFilters) {
                const isFilterSatisfied = testFilter(log, key, parts);
                if (inverted ? isFilterSatisfied : !isFilterSatisfied) {
                    continue nextIntersectedFilter;
                }
            }
            return true;
        }
        return false;
    };
};
const testFilter = (log, key, parts) => {
    let rawValue = log;
    for (let index = 0; index < key.length; index++) {
        if (!rawValue) {
            return false;
        }
        const part = key[index];
        if (!(part in rawValue)) {
            return false;
        }
        rawValue = rawValue[part];
    }
    let value = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
    if (parts.length === 1) {
        return value === parts[0];
    }
    if (!value.startsWith(parts[0])) {
        return false;
    }
    const lastPartIndex = parts.length - 1;
    for (let index = 1; index < lastPartIndex; index++) {
        const part = parts[index];
        const position = value.indexOf(part);
        if (position === -1) {
            return false;
        }
        value = value.slice(position + part.length);
    }
    return value.endsWith(parts[lastPartIndex]);
};

export { getLogFilter };
