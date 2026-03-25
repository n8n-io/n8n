"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSectionId = exports.isValidSectionId = exports.isValidId = void 0;
const uuid_1 = require("uuid");
const constants_1 = require("../constants");
const isValidId = (id) => /^[a-z0-9]{26}$/.test(id);
exports.isValidId = isValidId;
const isValidSectionId = (sectionId) => sectionId.startsWith(constants_1.ID_PREFIX.SECTION) && (0, exports.isValidId)(sectionId.split("_")[1]);
exports.isValidSectionId = isValidSectionId;
const idGenerator = (prefix = '') => (length = 26) => `${prefix}${(0, uuid_1.v4)().replace(/-/g, "").slice(0, length)}`;
/**
 * Create Section id.
 *
 * @param {number} length
 * @returns {string}
 */
exports.generateSectionId = idGenerator(constants_1.ID_PREFIX.SECTION);
//# sourceMappingURL=id.js.map