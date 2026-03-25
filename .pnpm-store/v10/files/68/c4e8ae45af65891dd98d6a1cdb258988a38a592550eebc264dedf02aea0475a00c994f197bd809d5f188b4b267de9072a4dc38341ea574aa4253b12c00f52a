export interface IUser {
    uuid?: string;
    id?: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
}
export declare class User implements IUser {
    uuid?: string;
    id?: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
    constructor({ user_id, uuid, id, created_at, updated_at, deleted_at, email, first_name, last_name, metadata, }: {
        user_id: string;
        uuid?: string;
        id?: number;
        created_at?: Date;
        updated_at?: Date;
        deleted_at?: Date;
        email?: string;
        first_name?: string;
        last_name?: string;
        metadata?: Record<string, any>;
    });
    toDict(): IUser;
}
export interface ICreateUserRequest {
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
}
export declare class CreateUserRequest implements ICreateUserRequest {
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
    constructor({ user_id, email, first_name, last_name, metadata, }: {
        user_id: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        metadata?: Record<string, any>;
    });
    toDict(): ICreateUserRequest;
}
export interface IUpdateUserRequest {
    uuid?: string;
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
}
export declare class UpdateUserRequest implements IUpdateUserRequest {
    uuid?: string;
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
    constructor({ uuid, user_id, email, first_name, last_name, metadata, }: {
        uuid?: string;
        user_id: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        metadata?: Record<string, any>;
    });
    toDict(): IUpdateUserRequest;
}
