export const parsePath = (path) => {
    const hashIndex = path.indexOf('#');
    const queryIndex = path.indexOf('?');
    const hasHash = hashIndex !== -1;
    const hash = hasHash ? path.slice(hashIndex) : '';
    const hasQuery = queryIndex !== -1 && (!hasHash || queryIndex < hashIndex);
    const query = hasQuery
        ? path.slice(queryIndex, hasHash ? hashIndex : undefined)
        : '';
    const pathname = hasQuery
        ? path.slice(0, queryIndex)
        : hasHash
            ? path.slice(0, hashIndex)
            : path;
    return { pathname, query, hash };
};
export const stringifyPath = ({ pathname, query, hash }) => pathname + query + hash;
//# sourceMappingURL=parse-path.js.map