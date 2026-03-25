import set from "../utils/lodash/set.js";
function extractStringNodes(data, options) {
    const parsedOptions = { ...options, maxDepth: options.maxDepth ?? 10 };
    const queue = [
        [data, 0, ""],
    ];
    const result = [];
    while (queue.length > 0) {
        const task = queue.shift();
        if (task == null)
            continue;
        const [value, depth, path] = task;
        if (typeof value === "object" && value != null) {
            if (depth >= parsedOptions.maxDepth)
                continue;
            for (const [key, nestedValue] of Object.entries(value)) {
                queue.push([nestedValue, depth + 1, path ? `${path}.${key}` : key]);
            }
        }
        else if (Array.isArray(value)) {
            if (depth >= parsedOptions.maxDepth)
                continue;
            for (let i = 0; i < value.length; i++) {
                queue.push([value[i], depth + 1, `${path}[${i}]`]);
            }
        }
        else if (typeof value === "string") {
            result.push({ value, path });
        }
    }
    return result;
}
function deepClone(data) {
    return JSON.parse(JSON.stringify(data));
}
export function createAnonymizer(replacer, options) {
    return (data) => {
        let mutateValue = deepClone(data);
        const nodes = extractStringNodes(mutateValue, {
            maxDepth: options?.maxDepth,
        });
        const processor = Array.isArray(replacer)
            ? (() => {
                const replacers = replacer.map(({ pattern, type, replace }) => {
                    if (type != null && type !== "pattern")
                        throw new Error("Invalid anonymizer type");
                    return [
                        typeof pattern === "string"
                            ? new RegExp(pattern, "g")
                            : pattern,
                        replace ?? "[redacted]",
                    ];
                });
                if (replacers.length === 0)
                    throw new Error("No replacers provided");
                return {
                    maskNodes: (nodes) => {
                        return nodes.reduce((memo, item) => {
                            const newValue = replacers.reduce((value, [regex, replace]) => {
                                const result = value.replace(regex, replace);
                                // make sure we reset the state of regex
                                regex.lastIndex = 0;
                                return result;
                            }, item.value);
                            if (newValue !== item.value) {
                                memo.push({ value: newValue, path: item.path });
                            }
                            return memo;
                        }, []);
                    },
                };
            })()
            : typeof replacer === "function"
                ? {
                    maskNodes: (nodes) => nodes.reduce((memo, item) => {
                        const newValue = replacer(item.value, item.path);
                        if (newValue !== item.value) {
                            memo.push({ value: newValue, path: item.path });
                        }
                        return memo;
                    }, []),
                }
                : replacer;
        const toUpdate = processor.maskNodes(nodes);
        for (const node of toUpdate) {
            if (node.path === "") {
                mutateValue = node.value;
            }
            else {
                set(mutateValue, node.path, node.value);
            }
        }
        return mutateValue;
    };
}
