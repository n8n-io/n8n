import { assert, UserError } from 'n8n-workflow';
const addColon = (attribute) => (attribute = attribute.charAt(0) === ':' ? attribute : `:${attribute}`);
const addPound = (key) => (key = key.charAt(0) === '#' ? key : `#${key}`);
export function adjustExpressionAttributeValues(eavUi) {
    const eav = {};
    eavUi.forEach(({ attribute, type, value }) => {
        eav[addColon(attribute)] = { [type]: value };
    });
    return eav;
}
export function adjustExpressionAttributeName(eanUi) {
    const ean = {};
    eanUi.forEach(({ key, value }) => {
        ean[addPound(key)] = value;
    });
    return ean;
}
export function adjustPutItem(putItemUi, autoParseNumbers = true) {
    const adjustedPutItem = {};
    Object.entries(putItemUi).forEach(([attribute, value]) => {
        let type;
        if (typeof value === 'boolean') {
            type = 'BOOL';
        }
        else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            type = 'M';
        }
        else if (autoParseNumbers ? !isNaN(Number(value)) : typeof value === 'number') {
            type = 'N';
        }
        else {
            type = 'S';
        }
        adjustedPutItem[attribute] = { [type]: value.toString() };
    });
    return adjustedPutItem;
}
export function simplify(item) {
    const output = {};
    for (const [attribute, value] of Object.entries(item)) {
        const [type, content] = Object.entries(value)[0];
        //nedded as simplify is used in decodeItem
        output[attribute] = decodeAttribute(type, content);
    }
    return output;
}
function decodeAttribute(type, attribute) {
    switch (type) {
        case 'BOOL':
            return Boolean(attribute);
        case 'N':
            return Number(attribute);
        case 'S':
            return String(attribute);
        case 'SS':
        case 'NS':
            return attribute;
        case 'M':
            assert(typeof attribute === 'object' && !Array.isArray(attribute) && attribute !== null, 'Attribute must be an object');
            return simplify(attribute);
        default:
            return null;
    }
}
export function validateJSON(input) {
    try {
        return JSON.parse(input);
    }
    catch (error) {
        throw new UserError('Items must be a valid JSON', { level: 'warning' });
    }
}
export function mapToAttributeValues(item) {
    for (const key of Object.keys(item)) {
        if (!key.startsWith(':')) {
            item[`:${key}`] = item[key];
            delete item[key];
        }
    }
}
export function decodeItem(item) {
    const _item = {};
    for (const entry of Object.entries(item)) {
        const [attribute, value] = entry;
        const [type, content] = Object.entries(value)[0];
        _item[attribute] = decodeAttribute(type, content);
    }
    return _item;
}
//# sourceMappingURL=utils.js.map