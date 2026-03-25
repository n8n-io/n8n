"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRepository = void 0;
const globals_1 = require("../globals");
/**
 * Used to declare a class as a custom repository.
 * Custom repository can manage some specific entity or just be generic.
 * Custom repository optionally can extend AbstractRepository, Repository or TreeRepository.
 *
 * @deprecated use Repository.extend function to create a custom repository
 */
function EntityRepository(entity) {
    return function (target) {
        (0, globals_1.getMetadataArgsStorage)().entityRepositories.push({
            target: target,
            entity: entity,
        });
    };
}
exports.EntityRepository = EntityRepository;

//# sourceMappingURL=EntityRepository.js.map
