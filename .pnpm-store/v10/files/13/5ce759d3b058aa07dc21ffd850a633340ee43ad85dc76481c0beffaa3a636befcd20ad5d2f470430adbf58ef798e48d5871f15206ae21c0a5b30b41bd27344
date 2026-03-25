import { getFromContainer } from '../container';
/**
 * This metadata interface contains information for custom validators.
 */
export class ConstraintMetadata {
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
        return getFromContainer(this.target);
    }
}
//# sourceMappingURL=ConstraintMetadata.js.map