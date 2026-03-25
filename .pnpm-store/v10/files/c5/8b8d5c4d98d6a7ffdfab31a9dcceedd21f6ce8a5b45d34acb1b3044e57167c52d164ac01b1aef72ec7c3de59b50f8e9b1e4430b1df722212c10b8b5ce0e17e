import * as changeCase from "./index.js";
const isObject = (object) => object !== null && typeof object === "object";
function changeKeysFactory(changeCase) {
    return function changeKeys(object, depth = 1, options) {
        if (depth === 0 || !isObject(object))
            return object;
        if (Array.isArray(object)) {
            return object.map((item) => changeKeys(item, depth - 1, options));
        }
        const result = Object.create(Object.getPrototypeOf(object));
        Object.keys(object).forEach((key) => {
            const value = object[key];
            const changedKey = changeCase(key, options);
            const changedValue = changeKeys(value, depth - 1, options);
            result[changedKey] = changedValue;
        });
        return result;
    };
}
export const camelCase = changeKeysFactory(changeCase.camelCase);
export const capitalCase = changeKeysFactory(changeCase.capitalCase);
export const constantCase = changeKeysFactory(changeCase.constantCase);
export const dotCase = changeKeysFactory(changeCase.dotCase);
export const trainCase = changeKeysFactory(changeCase.trainCase);
export const noCase = changeKeysFactory(changeCase.noCase);
export const kebabCase = changeKeysFactory(changeCase.kebabCase);
export const pascalCase = changeKeysFactory(changeCase.pascalCase);
export const pathCase = changeKeysFactory(changeCase.pathCase);
export const sentenceCase = changeKeysFactory(changeCase.sentenceCase);
export const snakeCase = changeKeysFactory(changeCase.snakeCase);
//# sourceMappingURL=keys.js.map