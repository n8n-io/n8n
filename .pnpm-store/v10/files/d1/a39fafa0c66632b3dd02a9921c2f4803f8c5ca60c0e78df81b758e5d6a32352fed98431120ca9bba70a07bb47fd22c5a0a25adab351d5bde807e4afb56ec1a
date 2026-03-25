/* eslint-disable camelcase */
import { toDictFilterEmpty } from "./utils";
export class User {
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
        return toDictFilterEmpty(this);
    }
}
export class CreateUserRequest {
    constructor({ user_id, email, first_name, last_name, metadata, }) {
        this.user_id = user_id;
        this.email = email;
        this.first_name = first_name;
        this.last_name = last_name;
        this.metadata = metadata;
    }
    toDict() {
        return toDictFilterEmpty(this);
    }
}
export class UpdateUserRequest {
    constructor({ uuid, user_id, email, first_name, last_name, metadata, }) {
        this.uuid = uuid;
        this.user_id = user_id;
        this.email = email;
        this.first_name = first_name;
        this.last_name = last_name;
        this.metadata = metadata;
    }
    toDict() {
        return toDictFilterEmpty(this);
    }
}
