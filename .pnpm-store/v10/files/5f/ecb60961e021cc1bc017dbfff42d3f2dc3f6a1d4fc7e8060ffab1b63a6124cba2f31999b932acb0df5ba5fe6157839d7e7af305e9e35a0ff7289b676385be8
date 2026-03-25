import { WeaviateInvalidInputError } from '../../errors.js';
import ClassExists from '../../schema/classExists.js';
import aggregate, { metrics } from '../aggregate/index.js';
import { backupCollection } from '../backup/collection.js';
import config from '../config/index.js';
import data from '../data/index.js';
import filter from '../filters/index.js';
import generate from '../generate/index.js';
import { Iterator } from '../iterator/index.js';
import query from '../query/index.js';
import sort from '../sort/index.js';
import tenants from '../tenants/index.js';
import multiTargetVector from '../vectors/multiTargetVector.js';
const isString = (value) => typeof value === 'string';
const capitalizeCollectionName = (name) => (name.charAt(0).toUpperCase() + name.slice(1));
const collection = (connection, name, dbVersionSupport, consistencyLevel, tenant) => {
    if (!isString(name)) {
        throw new WeaviateInvalidInputError(`The collection name must be a string, got: ${typeof name}`);
    }
    const capitalizedName = capitalizeCollectionName(name);
    const aggregateCollection = aggregate(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant);
    const queryCollection = query(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant);
    return {
        aggregate: aggregateCollection,
        backup: backupCollection(connection, capitalizedName),
        config: config(connection, capitalizedName, dbVersionSupport, tenant),
        data: data(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        filter: filter(),
        generate: generate(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        metrics: metrics(),
        multiTargetVector: multiTargetVector(),
        name: name,
        query: queryCollection,
        sort: sort(),
        tenants: tenants(connection, capitalizedName, dbVersionSupport),
        exists: () => new ClassExists(connection).withClassName(capitalizedName).do(),
        iterator: (opts) => new Iterator((limit, after) => queryCollection
            .fetchObjects({
            limit,
            after,
            includeVector: opts === null || opts === void 0 ? void 0 : opts.includeVector,
            returnMetadata: opts === null || opts === void 0 ? void 0 : opts.returnMetadata,
            returnProperties: opts === null || opts === void 0 ? void 0 : opts.returnProperties,
            returnReferences: opts === null || opts === void 0 ? void 0 : opts.returnReferences,
        })
            .then((res) => res.objects)),
        length: () => aggregateCollection.overAll().then(({ totalCount }) => totalCount),
        withConsistency: (consistencyLevel) => collection(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        withTenant: (tenant) => collection(connection, capitalizedName, dbVersionSupport, consistencyLevel, typeof tenant === 'string' ? tenant : tenant.name),
    };
};
export default collection;
