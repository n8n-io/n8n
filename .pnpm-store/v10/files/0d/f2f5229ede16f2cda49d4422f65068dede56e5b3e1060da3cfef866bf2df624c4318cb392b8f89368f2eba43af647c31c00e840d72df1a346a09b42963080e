"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintMetadata = void 0;
const container_1 = require("../container");
/**
 * This metadata interface contains information for custom validators.
 */
class ConstraintMetadata {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(target, name, async = false) {
        this.target = target;
        this.name = name;
        this.async = async;
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Instance of the target custom validation class which performs validation.
     */
    get instance() {
        return (0, container_1.getFromContainer)(this.target);
    }
}
exports.ConstraintMetadata = ConstraintMetadata;
//# sourceMappingURL=ConstraintMetadata.js.map