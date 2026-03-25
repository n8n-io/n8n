export const hasHeaderWithPrefix = (headerPrefix, headers) => {
    const soughtHeaderPrefix = headerPrefix.toLowerCase();
    for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase().startsWith(soughtHeaderPrefix)) {
            return true;
        }
    }
    return false;
};
