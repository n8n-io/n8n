import Connection from '../../connection/grpc.js';
import { ConsistencyLevel } from '../../data/index.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { FilterValue } from '../filters/index.js';
import { BatchObjectsReturn, BatchReferencesReturn, DataObject, DeleteManyReturn, NonReferenceInputs, Properties, ReferenceInput, ReferenceInputs, Vectors } from '../types/index.js';
/** The available options to the `data.deleteMany` method.  */
export type DeleteManyOptions<V> = {
    /** Whether to return verbose information about the operation */
    verbose?: V;
    /** Whether to perform a dry run of the operation */
    dryRun?: boolean;
};
/** The available options to the `data.insert` method. */
export type InsertObject<T> = {
    /** The ID of the object to be inserted. If not provided, a new ID will be generated. */
    id?: string;
    /** The properties of the object to be inserted */
    properties?: NonReferenceInputs<T>;
    /** The references of the object to be inserted */
    references?: ReferenceInputs<T>;
    /** The vector(s) of the object to be inserted */
    vectors?: number[] | Vectors;
};
/** The arguments of the `data.referenceX` methods */
export type ReferenceArgs<T> = {
    /** The ID of the object that will have the reference */
    fromUuid: string;
    /** The property of the object that will have the reference */
    fromProperty: string;
    /** The object(s) to reference */
    to: ReferenceInput<T>;
};
/** The available options to the `data.replace` method. */
export type ReplaceObject<T> = {
    /** The ID of the object to be replaced */
    id: string;
    /** The properties of the object to be replaced */
    properties?: NonReferenceInputs<T>;
    /** The references of the object to be replaced */
    references?: ReferenceInputs<T>;
    vectors?: number[] | Vectors;
};
/** The available options to the `data.update` method. */
export type UpdateObject<T> = {
    /** The ID of the object to be updated */
    id: string;
    /** The properties of the object to be updated */
    properties?: Partial<NonReferenceInputs<T>>;
    /** The references of the object to be updated */
    references?: Partial<ReferenceInputs<T>>;
    vectors?: number[] | Vectors;
};
export interface Data<T> {
    deleteById: (id: string) => Promise<boolean>;
    deleteMany: <V extends boolean = false>(where: FilterValue, opts?: DeleteManyOptions<V>) => Promise<DeleteManyReturn<V>>;
    exists: (id: string) => Promise<boolean>;
    /**
     * Insert a single object into the collection.
     *
     * If you don't provide any options to the function, then an empty object will be created.
     *
     * @param {InsertArgs<T> | NonReferenceInputs<T>} [args] The object to insert. If an `id` is provided, it will be used as the object's ID. If not, a new ID will be generated.
     * @returns {Promise<string>} The ID of the inserted object.
     */
    insert: (obj?: InsertObject<T> | NonReferenceInputs<T>) => Promise<string>;
    /**
     * Insert multiple objects into the collection.
     *
     * This object does not perform any batching for you. It sends all objects in a single request to Weaviate.
     *
     * @param {(DataObject<T> | NonReferenceInputs<T>)[]} objects The objects to insert.
     * @returns {Promise<BatchObjectsReturn<T>>} The result of the batch insert.
     */
    insertMany: (objects: (DataObject<T> | NonReferenceInputs<T>)[]) => Promise<BatchObjectsReturn<T>>;
    /**
     * Create a reference between an object in this collection and any other object in Weaviate.
     *
     * @param {ReferenceArgs<P>} args The reference to create.
     * @returns {Promise<void>}
     */
    referenceAdd: <P extends Properties>(args: ReferenceArgs<P>) => Promise<void>;
    /**
     * Create multiple references between an object in this collection and any other object in Weaviate.
     *
     * This method is optimized for performance and sends all references in a single request.
     *
     * @param {ReferenceArgs<P>[]} refs The references to create.
     * @returns {Promise<BatchReferencesReturn>} The result of the batch reference creation.
     */
    referenceAddMany: <P extends Properties>(refs: ReferenceArgs<P>[]) => Promise<BatchReferencesReturn>;
    /**
     * Delete a reference between an object in this collection and any other object in Weaviate.
     *
     * @param {ReferenceArgs<P>} args The reference to delete.
     * @returns {Promise<void>}
     */
    referenceDelete: <P extends Properties>(args: ReferenceArgs<P>) => Promise<void>;
    /**
     * Replace a reference between an object in this collection and any other object in Weaviate.
     *
     * @param {ReferenceArgs<P>} args The reference to replace.
     * @returns {Promise<void>}
     */
    referenceReplace: <P extends Properties>(args: ReferenceArgs<P>) => Promise<void>;
    /**
     * Replace an object in the collection.
     *
     * This is equivalent to a PUT operation.
     *
     * @param {ReplaceOptions<T>} [opts] The object attributes to replace.
     * @returns {Promise<void>}
     */
    replace: (obj: ReplaceObject<T>) => Promise<void>;
    /**
     * Update an object in the collection.
     *
     * This is equivalent to a PATCH operation.
     *
     * @param {UpdateArgs<T>} [opts] The object attributes to replace.
     * @returns {Promise<void>}
     */
    update: (obj: UpdateObject<T>) => Promise<void>;
}
declare const data: <T>(connection: Connection, name: string, dbVersionSupport: DbVersionSupport, consistencyLevel?: ConsistencyLevel, tenant?: string) => Data<T>;
export default data;
