"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeforeInsert = void 0;
const globals_1 = require("../../globals");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied before this entity insertion.
 */
function BeforeInsert() {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.BEFORE_INSERT,
        });
    };
}
exports.BeforeInsert = BeforeInsert;

//# sourceMappingURL=BeforeInsert.js.map
