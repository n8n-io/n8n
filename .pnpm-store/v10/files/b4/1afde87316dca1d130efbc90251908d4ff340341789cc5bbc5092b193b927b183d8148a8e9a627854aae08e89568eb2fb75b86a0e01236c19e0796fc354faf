let getPromiseValue = () => 'Promise{…}';
try {
    // @ts-ignore
    const { getPromiseDetails, kPending, kRejected } = process.binding('util');
    if (Array.isArray(getPromiseDetails(Promise.resolve()))) {
        getPromiseValue = (value, options) => {
            const [state, innerValue] = getPromiseDetails(value);
            if (state === kPending) {
                return 'Promise{<pending>}';
            }
            return `Promise${state === kRejected ? '!' : ''}{${options.inspect(innerValue, options)}}`;
        };
    }
}
catch (notNode) {
    /* ignore */
}
export default getPromiseValue;
