"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterUpdate = void 0;
const globals_1 = require("../../globals");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied after this entity update.
 */
function AfterUpdate() {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.AFTER_UPDATE,
        });
    };
}
exports.AfterUpdate = AfterUpdate;

//# sourceMappingURL=AfterUpdate.js.map
