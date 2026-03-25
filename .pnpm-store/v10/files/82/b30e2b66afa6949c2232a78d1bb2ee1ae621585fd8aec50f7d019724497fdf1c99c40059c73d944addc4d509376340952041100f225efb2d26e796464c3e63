export function visit(node, keys, visitorSpec) {
    if (!node || !keys) {
        return;
    }
    const type = node.type;
    const visitor = visitorSpec[type];
    if (typeof visitor === 'function') {
        visitor(node);
    }
    const childFields = keys[type];
    if (!childFields) {
        return;
    }
    for (const fieldName of childFields) {
        for (const item of [node[fieldName]].flat()) {
            if (!item || typeof item !== 'object' || !('type' in item)) {
                continue;
            }
            visit(item, keys, visitorSpec);
        }
    }
    const exit = visitorSpec[`${type}:Exit`];
    if (typeof exit === 'function') {
        exit(node);
    }
}
//# sourceMappingURL=visit.js.map