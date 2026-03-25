// Originally from: https://www.npmjs.com/package/boolean
export function boolean(value) {
    switch (typeof value) {
        case 'string': {
            return ['true', 't', 'yes', 'y', 'on', '1'].includes(value.trim().toLowerCase());
        }
        case 'number': {
            return value.valueOf() === 1;
        }
        case 'boolean': {
            return value.valueOf();
        }
        default: {
            return false;
        }
    }
}
export function isBooleanable(value) {
    switch (typeof value) {
        case 'string': {
            return [
                'true',
                't',
                'yes',
                'y',
                'on',
                '1',
                'false',
                'f',
                'no',
                'n',
                'off',
                '0',
            ].includes(value.trim().toLowerCase());
        }
        case 'number': {
            return [0, 1].includes(Number(value).valueOf());
        }
        case 'boolean': {
            return true;
        }
        default: {
            return false;
        }
    }
}
