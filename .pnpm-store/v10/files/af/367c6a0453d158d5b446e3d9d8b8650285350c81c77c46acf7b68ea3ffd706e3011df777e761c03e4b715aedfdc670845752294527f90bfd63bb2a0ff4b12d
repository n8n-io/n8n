"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterLoad = void 0;
const globals_1 = require("../../globals");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied after entity is loaded.
 */
function AfterLoad() {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.AFTER_LOAD,
        });
    };
}
exports.AfterLoad = AfterLoad;

//# sourceMappingURL=AfterLoad.js.map
