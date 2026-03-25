/**
 * Return copy of object, only keeping allowlisted properties.
 */
export function pick(o, props) {
    return Object.assign({}, ...props.map((prop) => {
        if (o[prop] !== undefined) {
            return { [prop]: o[prop] };
        }
    }));
}
