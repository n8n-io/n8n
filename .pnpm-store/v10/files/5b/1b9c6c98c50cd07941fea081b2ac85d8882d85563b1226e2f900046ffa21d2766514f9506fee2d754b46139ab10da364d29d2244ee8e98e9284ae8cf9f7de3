"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserRequest = exports.CreateUserRequest = exports.User = void 0;
/* eslint-disable camelcase */
const utils_1 = require("./utils");
class User {
    constructor({ user_id, uuid, id, created_at, updated_at, deleted_at, email, first_name, last_name, metadata, }) {
        this.user_id = user_id;
        this.uuid = uuid;
        this.id = id;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.deleted_at = deleted_at;
        this.email = email;
        this.first_name = first_name;
        this.last_name = last_name;
        this.metadata = metadata;
    }
    toDict() {
        return (0, utils_1.toDictFilterEmpty)(this);
    }
}
exports.User = User;
class CreateUserRequest {
    constructor({ user_id, email, first_name, last_name, metadata, }) {
        this.user_id = user_id;
        this.email = email;
        this.first_name = first_name;
        this.last_name = last_name;
        this.metadata = metadata;
    }
    toDict() {
        return (0, utils_1.toDictFilterEmpty)(this);
    }
}
exports.CreateUserRequest = CreateUserRequest;
class UpdateUserRequest {
    constructor({ uuid, user_id, email, first_name, last_name, metadata, }) {
        this.uuid = uuid;
        this.user_id = user_id;
        this.email = email;
        this.first_name = first_name;
        this.last_name = last_name;
        this.metadata = metadata;
    }
    toDict() {
        return (0, utils_1.toDictFilterEmpty)(this);
    }
}
exports.UpdateUserRequest = UpdateUserRequest;
