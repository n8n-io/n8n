"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityListenerMetadata = void 0;
/**
 * This metadata contains all information about entity's listeners.
 */
class EntityListenerMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        this.entityMetadata = options.entityMetadata;
        this.embeddedMetadata = options.embeddedMetadata;
        this.target = options.args.target;
        this.propertyName = options.args.propertyName;
        this.type = options.args.type;
    }
    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------
    /**
     * Checks if entity listener is allowed to be executed on the given entity.
     */
    isAllowed(entity) {
        // todo: create in entity metadata method like isInherited?
        return (this.entityMetadata.target === entity.constructor || // todo: .constructor won't work for entity schemas, but there are no entity listeners in schemas since there are no objects, right?
            (typeof this.entityMetadata.target === "function" &&
                entity.constructor.prototype instanceof
                    this.entityMetadata.target)); // todo: also need to implement entity schema inheritance
    }
    /**
     * Executes listener method of the given entity.
     */
    execute(entity) {
        if (!this.embeddedMetadata)
            return entity[this.propertyName]();
        this.callEntityEmbeddedMethod(entity, this.embeddedMetadata.propertyPath.split("."));
    }
    // ---------------------------------------------------------------------
    // Protected Methods
    // ---------------------------------------------------------------------
    /**
     * Calls embedded entity listener method no matter how nested it is.
     */
    callEntityEmbeddedMethod(entity, propertyPaths) {
        const propertyPath = propertyPaths.shift();
        if (!propertyPath || !entity[propertyPath])
            return;
        if (propertyPaths.length === 0) {
            if (Array.isArray(entity[propertyPath])) {
                entity[propertyPath].map((embedded) => embedded[this.propertyName]());
            }
            else {
                entity[propertyPath][this.propertyName]();
            }
        }
        else {
            if (entity[propertyPath])
                this.callEntityEmbeddedMethod(entity[propertyPath], propertyPaths);
        }
    }
}
exports.EntityListenerMetadata = EntityListenerMetadata;

//# sourceMappingURL=EntityListenerMetadata.js.map
