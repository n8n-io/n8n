"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFromContainer = exports.useContainer = void 0;
/**
 * Container to be used by this library for inversion control. If container was not implicitly set then by default
 * container simply creates a new instance of the given class.
 *
 * @deprecated
 */
const defaultContainer = new (class {
    constructor() {
        this.instances = [];
    }
    get(someClass) {
        let instance = this.instances.find((i) => i.type === someClass);
        if (!instance) {
            instance = {
                type: someClass,
                object: new someClass(),
            };
            this.instances.push(instance);
        }
        return instance.object;
    }
})();
let userContainer;
let userContainerOptions;
/**
 * Sets container to be used by this library.
 *
 * @deprecated
 */
function useContainer(iocContainer, options) {
    userContainer = iocContainer;
    userContainerOptions = options;
}
exports.useContainer = useContainer;
/**
 * Gets the IOC container used by this library.
 *
 * @deprecated
 */
function getFromContainer(someClass) {
    if (userContainer) {
        try {
            const instance = userContainer.get(someClass);
            if (instance)
                return instance;
            if (!userContainerOptions || !userContainerOptions.fallback)
                return instance;
        }
        catch (error) {
            if (!userContainerOptions || !userContainerOptions.fallbackOnErrors)
                throw error;
        }
    }
    return defaultContainer.get(someClass);
}
exports.getFromContainer = getFromContainer;

//# sourceMappingURL=container.js.map
