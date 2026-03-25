const { hasOwnProperty } = Object.prototype;

function buildMap(list, caseInsensitive) {
    const map = Object.create(null);

    if (!Array.isArray(list)) {
        return null;
    }

    for (let name of list) {
        if (caseInsensitive) {
            name = name.toLowerCase();
        }

        map[name] = true;
    }

    return map;
}

function buildList(data) {
    if (!data) {
        return null;
    }

    const tags = buildMap(data.tags, true);
    const ids = buildMap(data.ids);
    const classes = buildMap(data.classes);

    if (tags === null &&
        ids === null &&
        classes === null) {
        return null;
    }

    return {
        tags,
        ids,
        classes
    };
}

export function buildIndex(data) {
    let scopes = false;

    if (data.scopes && Array.isArray(data.scopes)) {
        scopes = Object.create(null);

        for (let i = 0; i < data.scopes.length; i++) {
            const list = data.scopes[i];

            if (!list || !Array.isArray(list)) {
                throw new Error('Wrong usage format');
            }

            for (const name of list) {
                if (hasOwnProperty.call(scopes, name)) {
                    throw new Error(`Class can't be used for several scopes: ${name}`);
                }

                scopes[name] = i + 1;
            }
        }
    }

    return {
        whitelist: buildList(data),
        blacklist: buildList(data.blacklist),
        scopes
    };
}
