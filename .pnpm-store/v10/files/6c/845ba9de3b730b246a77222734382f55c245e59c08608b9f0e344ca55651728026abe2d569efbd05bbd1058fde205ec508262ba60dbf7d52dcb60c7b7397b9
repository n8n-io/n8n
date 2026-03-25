"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterRecover = void 0;
const globals_1 = require("../../globals");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied before this entity soft removal.
 */
function AfterRecover() {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.AFTER_RECOVER,
        });
    };
}
exports.AfterRecover = AfterRecover;

//# sourceMappingURL=AfterRecover.js.map
