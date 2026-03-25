"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractRepository = void 0;
const CustomRepositoryDoesNotHaveEntityError_1 = require("../error/CustomRepositoryDoesNotHaveEntityError");
const globals_1 = require("../globals");
const CustomRepositoryNotFoundError_1 = require("../error/CustomRepositoryNotFoundError");
/**
 * Provides abstract class for custom repositories that do not inherit from original orm Repository.
 * Contains all most-necessary methods to simplify code in the custom repository.
 * All methods are protected thus not exposed and it allows to create encapsulated custom repository.
 *
 * @deprecated use Repository.extend function to create a custom repository
 */
class AbstractRepository {
    // -------------------------------------------------------------------------
    // Protected Accessors
    // -------------------------------------------------------------------------
    /**
     * Gets the original ORM repository for the entity that is managed by this repository.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    get repository() {
        const target = this.getCustomRepositoryTarget(this);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError_1.CustomRepositoryDoesNotHaveEntityError(this.constructor);
        return this.manager.getRepository(target);
    }
    /**
     * Gets the original ORM tree repository for the entity that is managed by this repository.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    get treeRepository() {
        const target = this.getCustomRepositoryTarget(this);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError_1.CustomRepositoryDoesNotHaveEntityError(this.constructor);
        return this.manager.getTreeRepository(target);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new query builder for the repository's entity that can be used to build a SQL query.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    createQueryBuilder(alias) {
        const target = this.getCustomRepositoryTarget(this.constructor);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError_1.CustomRepositoryDoesNotHaveEntityError(this.constructor);
        return this.manager
            .getRepository(target)
            .createQueryBuilder(alias);
    }
    /**
     * Creates a new query builder for the given entity that can be used to build a SQL query.
     */
    createQueryBuilderFor(entity, alias) {
        return this.getRepositoryFor(entity).createQueryBuilder(alias);
    }
    /**
     * Gets the original ORM repository for the given entity class.
     */
    getRepositoryFor(entity) {
        return this.manager.getRepository(entity);
    }
    /**
     * Gets the original ORM tree repository for the given entity class.
     */
    getTreeRepositoryFor(entity) {
        return this.manager.getTreeRepository(entity);
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    /**
     * Gets custom repository's managed entity.
     * If given custom repository does not manage any entity then undefined will be returned.
     */
    getCustomRepositoryTarget(customRepository) {
        const entityRepositoryMetadataArgs = (0, globals_1.getMetadataArgsStorage)().entityRepositories.find((repository) => {
            return (repository.target ===
                (typeof customRepository === "function"
                    ? customRepository
                    : customRepository.constructor));
        });
        if (!entityRepositoryMetadataArgs)
            throw new CustomRepositoryNotFoundError_1.CustomRepositoryNotFoundError(customRepository);
        return entityRepositoryMetadataArgs.entity;
    }
}
exports.AbstractRepository = AbstractRepository;

//# sourceMappingURL=AbstractRepository.js.map
