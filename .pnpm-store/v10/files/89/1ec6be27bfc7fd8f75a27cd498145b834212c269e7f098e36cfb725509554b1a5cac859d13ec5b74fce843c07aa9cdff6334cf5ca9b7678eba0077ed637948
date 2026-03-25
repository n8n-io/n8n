const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __zilliz_milvus2_sdk_node = require_rolldown_runtime.__toESM(require("@zilliz/milvus2-sdk-node"));

//#region src/vectorstores/milvus.ts
var milvus_exports = {};
require_rolldown_runtime.__export(milvus_exports, { Milvus: () => Milvus });
const MILVUS_PRIMARY_FIELD_NAME = "langchain_primaryid";
const MILVUS_VECTOR_FIELD_NAME = "langchain_vector";
const MILVUS_TEXT_FIELD_NAME = "langchain_text";
const MILVUS_COLLECTION_NAME_PREFIX = "langchain_col";
const MILVUS_PARTITION_KEY_MAX_LENGTH = 512;
/**
* Default parameters for index searching.
*/
const DEFAULT_INDEX_SEARCH_PARAMS = {
	FLAT: { params: {} },
	IVF_FLAT: { params: { nprobe: 10 } },
	IVF_SQ8: { params: { nprobe: 10 } },
	IVF_PQ: { params: { nprobe: 10 } },
	HNSW: { params: { ef: 10 } },
	RHNSW_FLAT: { params: { ef: 10 } },
	RHNSW_SQ: { params: { ef: 10 } },
	RHNSW_PQ: { params: { ef: 10 } },
	IVF_HNSW: { params: {
		nprobe: 10,
		ef: 10
	} },
	ANNOY: { params: { search_k: 10 } }
};
/**
* Class for interacting with a Milvus database. Extends the VectorStore
* class.
*/
var Milvus = class Milvus extends __langchain_core_vectorstores.VectorStore {
	get lc_secrets() {
		return {
			ssl: "MILVUS_SSL",
			username: "MILVUS_USERNAME",
			password: "MILVUS_PASSWORD"
		};
	}
	_vectorstoreType() {
		return "milvus";
	}
	collectionName;
	partitionName;
	numDimensions;
	autoId;
	primaryField;
	vectorField;
	textField;
	textFieldMaxLength;
	partitionKey;
	partitionKeyMaxLength;
	fields;
	client;
	indexCreateParams;
	indexSearchParams;
	constructor(embeddings, args) {
		super(embeddings, args);
		this.embeddings = embeddings;
		this.collectionName = args.collectionName ?? genCollectionName();
		this.partitionName = args.partitionName;
		this.textField = args.textField ?? MILVUS_TEXT_FIELD_NAME;
		this.autoId = args.autoId ?? true;
		this.primaryField = args.primaryField ?? MILVUS_PRIMARY_FIELD_NAME;
		this.vectorField = args.vectorField ?? MILVUS_VECTOR_FIELD_NAME;
		this.textFieldMaxLength = args.textFieldMaxLength ?? 0;
		this.partitionKey = args.partitionKey;
		this.partitionKeyMaxLength = args.partitionKeyMaxLength ?? MILVUS_PARTITION_KEY_MAX_LENGTH;
		this.fields = [];
		const url = args.url ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("MILVUS_URL");
		const { address = "", username = "", password = "", ssl } = args.clientConfig || {};
		const { indexCreateOptions } = args;
		if (indexCreateOptions) {
			const { metric_type, index_type, params, search_params = {} } = indexCreateOptions;
			this.indexCreateParams = {
				metric_type,
				index_type,
				params
			};
			this.indexSearchParams = {
				...DEFAULT_INDEX_SEARCH_PARAMS[index_type].params,
				...search_params
			};
		} else {
			this.indexCreateParams = {
				index_type: "HNSW",
				metric_type: "L2",
				params: {
					M: 8,
					efConstruction: 64
				}
			};
			this.indexSearchParams = { ...DEFAULT_INDEX_SEARCH_PARAMS.HNSW.params };
		}
		const clientConfig = {
			...args.clientConfig || {},
			address: url || address,
			username: args.username || username,
			password: args.password || password,
			ssl: args.ssl || ssl
		};
		if (!clientConfig.address) throw new Error("Milvus URL address is not provided.");
		this.client = new __zilliz_milvus2_sdk_node.MilvusClient(clientConfig);
	}
	/**
	* Adds documents to the Milvus database.
	* @param documents Array of Document instances to be added to the database.
	* @param options Optional parameter that can include specific IDs for the documents.
	* @returns Promise resolving to void.
	*/
	async addDocuments(documents, options) {
		const texts = documents.map(({ pageContent }) => pageContent);
		await this.addVectors(await this.embeddings.embedDocuments(texts), documents, options);
	}
	/**
	* Adds vectors to the Milvus database.
	* @param vectors Array of vectors to be added to the database.
	* @param documents Array of Document instances associated with the vectors.
	* @param options Optional parameter that can include specific IDs for the documents.
	* @returns Promise resolving to void.
	*/
	async addVectors(vectors, documents, options) {
		if (vectors.length === 0) return;
		await this.ensureCollection(vectors, documents);
		if (this.partitionName !== void 0) await this.ensurePartition();
		const documentIds = options?.ids ?? [];
		const insertDatas = [];
		for (let index = 0; index < vectors.length; index++) {
			const vec = vectors[index];
			const doc = documents[index];
			const data = {
				[this.textField]: doc.pageContent,
				[this.vectorField]: vec
			};
			this.fields.forEach((field) => {
				switch (field) {
					case this.primaryField:
						if (documentIds[index] !== void 0) data[field] = documentIds[index];
						else if (!this.autoId) {
							if (doc.metadata[this.primaryField] === void 0) throw new Error(`The Collection's primaryField is configured with autoId=false, thus its value must be provided through metadata.`);
							data[field] = doc.metadata[this.primaryField];
						}
						break;
					case this.textField:
						data[field] = doc.pageContent;
						break;
					case this.vectorField:
						data[field] = vec;
						break;
					default:
						if (doc.metadata[field] === void 0) throw new Error(`The field "${field}" is not provided in documents[${index}].metadata.`);
						else if (typeof doc.metadata[field] === "object") data[field] = JSON.stringify(doc.metadata[field]);
						else data[field] = doc.metadata[field];
						break;
				}
			});
			insertDatas.push(data);
		}
		const params = {
			collection_name: this.collectionName,
			fields_data: insertDatas
		};
		if (this.partitionName !== void 0) params.partition_name = this.partitionName;
		const insertResp = this.autoId ? await this.client.insert(params) : await this.client.upsert(params);
		if (insertResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error ${this.autoId ? "inserting" : "upserting"} data: ${JSON.stringify(insertResp)}`);
		await this.client.flushSync({ collection_names: [this.collectionName] });
	}
	/**
	* Searches for vectors in the Milvus database that are similar to a given
	* vector.
	* @param query Vector to compare with the vectors in the database.
	* @param k Number of similar vectors to return.
	* @param filter Optional filter to apply to the search.
	* @returns Promise resolving to an array of tuples, each containing a Document instance and a similarity score.
	*/
	async similaritySearchVectorWithScore(query, k, filter) {
		const hasColResp = await this.client.hasCollection({ collection_name: this.collectionName });
		if (hasColResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error checking collection: ${hasColResp}`);
		if (hasColResp.value === false) throw new Error(`Collection not found: ${this.collectionName}, please create collection before search.`);
		const filterStr = filter ?? "";
		await this.grabCollectionFields();
		const loadResp = await this.client.loadCollectionSync({ collection_name: this.collectionName });
		if (loadResp.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error loading collection: ${loadResp}`);
		const outputFields = this.fields.filter((field) => field !== this.vectorField);
		const searchResp = await this.client.search({
			collection_name: this.collectionName,
			search_params: {
				anns_field: this.vectorField,
				topk: k,
				metric_type: this.indexCreateParams.metric_type,
				params: JSON.stringify(this.indexSearchParams)
			},
			output_fields: outputFields,
			vector_type: __zilliz_milvus2_sdk_node.DataType.FloatVector,
			vectors: [query],
			filter: filterStr
		});
		if (searchResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error searching data: ${JSON.stringify(searchResp)}`);
		const results = [];
		searchResp.results.forEach((result) => {
			const fields = {
				pageContent: "",
				metadata: {}
			};
			Object.keys(result).forEach((key) => {
				if (key === this.textField) fields.pageContent = result[key];
				else if (this.fields.includes(key) || key === this.primaryField) if (typeof result[key] === "string") {
					const { isJson, obj } = checkJsonString(result[key]);
					fields.metadata[key] = isJson ? obj : result[key];
				} else fields.metadata[key] = result[key];
			});
			results.push([new __langchain_core_documents.Document(fields), result.score]);
		});
		return results;
	}
	/**
	* Ensures that a collection exists in the Milvus database.
	* @param vectors Optional array of vectors to be used if a new collection needs to be created.
	* @param documents Optional array of Document instances to be used if a new collection needs to be created.
	* @returns Promise resolving to void.
	*/
	async ensureCollection(vectors, documents) {
		const hasColResp = await this.client.hasCollection({ collection_name: this.collectionName });
		if (hasColResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error checking collection: ${JSON.stringify(hasColResp, null, 2)}`);
		if (hasColResp.value === false) {
			if (vectors === void 0 || documents === void 0) throw new Error(`Collection not found: ${this.collectionName}, please provide vectors and documents to create collection.`);
			await this.createCollection(vectors, documents);
		} else await this.grabCollectionFields();
	}
	/**
	* Ensures that a partition exists in the Milvus collection.
	* @returns Promise resolving to void.
	*/
	async ensurePartition() {
		if (this.partitionName === void 0) return;
		const hasPartResp = await this.client.hasPartition({
			collection_name: this.collectionName,
			partition_name: this.partitionName
		});
		if (hasPartResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error checking partition: ${JSON.stringify(hasPartResp, null, 2)}`);
		if (hasPartResp.value === false) await this.client.createPartition({
			collection_name: this.collectionName,
			partition_name: this.partitionName
		});
	}
	/**
	* Creates a collection in the Milvus database.
	* @param vectors Array of vectors to be added to the new collection.
	* @param documents Array of Document instances to be added to the new collection.
	* @returns Promise resolving to void.
	*/
	async createCollection(vectors, documents) {
		const fieldList = [];
		fieldList.push(...createFieldTypeForMetadata(documents, this.primaryField, this.partitionKey));
		if (this.autoId) fieldList.push({
			name: this.primaryField,
			description: "Primary key",
			data_type: __zilliz_milvus2_sdk_node.DataType.Int64,
			is_primary_key: true,
			autoID: true
		});
		else fieldList.push({
			name: this.primaryField,
			description: "Primary key",
			data_type: __zilliz_milvus2_sdk_node.DataType.VarChar,
			is_primary_key: true,
			autoID: false,
			max_length: 65535
		});
		fieldList.push({
			name: this.textField,
			description: "Text field",
			data_type: __zilliz_milvus2_sdk_node.DataType.VarChar,
			type_params: { max_length: this.textFieldMaxLength > 0 ? this.textFieldMaxLength.toString() : getTextFieldMaxLength(documents).toString() }
		}, {
			name: this.vectorField,
			description: "Vector field",
			data_type: __zilliz_milvus2_sdk_node.DataType.FloatVector,
			type_params: { dim: getVectorFieldDim(vectors).toString() }
		});
		if (this.partitionKey) fieldList.push({
			name: this.partitionKey,
			description: "Partition key",
			data_type: __zilliz_milvus2_sdk_node.DataType.VarChar,
			max_length: this.partitionKeyMaxLength,
			is_partition_key: true
		});
		fieldList.forEach((field) => {
			if (!field.autoID) this.fields.push(field.name);
		});
		const createRes = await this.client.createCollection({
			collection_name: this.collectionName,
			fields: fieldList
		});
		if (createRes.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Failed to create collection: ${createRes}`);
		const extraParams = {
			...this.indexCreateParams,
			params: JSON.stringify(this.indexCreateParams.params)
		};
		await this.client.createIndex({
			collection_name: this.collectionName,
			field_name: this.vectorField,
			extra_params: extraParams
		});
	}
	/**
	* Retrieves the fields of a collection in the Milvus database.
	* @returns Promise resolving to void.
	*/
	async grabCollectionFields() {
		if (!this.collectionName) throw new Error("Need collection name to grab collection fields");
		if (this.primaryField && this.vectorField && this.textField && this.fields.length > 0) return;
		const desc = await this.client.describeCollection({ collection_name: this.collectionName });
		desc.schema.fields.forEach((field) => {
			this.fields.push(field.name);
			if (field.autoID && this.autoId) {
				const index = this.fields.indexOf(field.name);
				if (index !== -1) this.fields.splice(index, 1);
			}
			if (field.is_function_output) {
				const index = this.fields.indexOf(field.name);
				if (index !== -1) this.fields.splice(index, 1);
			}
			if (field.is_primary_key) this.primaryField = field.name;
			const dtype = __zilliz_milvus2_sdk_node.DataTypeMap[field.data_type];
			if (dtype === __zilliz_milvus2_sdk_node.DataType.FloatVector || dtype === __zilliz_milvus2_sdk_node.DataType.BinaryVector) this.vectorField = field.name;
			if (dtype === __zilliz_milvus2_sdk_node.DataType.VarChar && field.name === MILVUS_TEXT_FIELD_NAME) this.textField = field.name;
		});
	}
	/**
	* Creates a Milvus instance from a set of texts and their associated
	* metadata.
	* @param texts Array of texts to be added to the database.
	* @param metadatas Array of metadata objects associated with the texts.
	* @param embeddings Embeddings instance used to generate vector embeddings for the texts.
	* @param dbConfig Optional configuration for the Milvus database.
	* @returns Promise resolving to a new Milvus instance.
	*/
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return Milvus.fromDocuments(docs, embeddings, dbConfig);
	}
	/**
	* Creates a Milvus instance from a set of Document instances.
	* @param docs Array of Document instances to be added to the database.
	* @param embeddings Embeddings instance used to generate vector embeddings for the documents.
	* @param dbConfig Optional configuration for the Milvus database.
	* @returns Promise resolving to a new Milvus instance.
	*/
	static async fromDocuments(docs, embeddings, dbConfig) {
		const args = {
			...dbConfig,
			collectionName: dbConfig?.collectionName ?? genCollectionName()
		};
		const instance = new this(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
	/**
	* Creates a Milvus instance from an existing collection in the Milvus
	* database.
	* @param embeddings Embeddings instance used to generate vector embeddings for the documents in the collection.
	* @param dbConfig Configuration for the Milvus database.
	* @returns Promise resolving to a new Milvus instance.
	*/
	static async fromExistingCollection(embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.ensureCollection();
		return instance;
	}
	/**
	* Deletes data from the Milvus database.
	* @param params Object containing a filter to apply to the deletion.
	* @returns Promise resolving to void.
	*/
	async delete(params) {
		const hasColResp = await this.client.hasCollection({ collection_name: this.collectionName });
		if (hasColResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error checking collection: ${hasColResp}`);
		if (hasColResp.value === false) throw new Error(`Collection not found: ${this.collectionName}, please create collection before search.`);
		const { filter, ids } = params;
		if (filter && !ids) {
			const deleteResp = await this.client.deleteEntities({
				collection_name: this.collectionName,
				expr: filter
			});
			if (deleteResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error deleting data: ${JSON.stringify(deleteResp)}`);
		} else if (!filter && ids && ids.length > 0) {
			const deleteResp = await this.client.delete({
				collection_name: this.collectionName,
				ids
			});
			if (deleteResp.status.error_code !== __zilliz_milvus2_sdk_node.ErrorCode.SUCCESS) throw new Error(`Error deleting data with ids: ${JSON.stringify(deleteResp)}`);
		}
	}
};
function createFieldTypeForMetadata(documents, primaryFieldName, partitionKey) {
	const sampleMetadata = documents[0].metadata;
	let textFieldMaxLength = 0;
	let jsonFieldMaxLength = 0;
	const textEncoder = new TextEncoder();
	documents.forEach(({ metadata }) => {
		Object.keys(metadata).forEach((key) => {
			if (!(key in metadata) || typeof metadata[key] !== typeof sampleMetadata[key]) throw new Error("All documents must have same metadata keys and datatype");
			if (typeof metadata[key] === "string") {
				const textLengthInBytes = textEncoder.encode(metadata[key]).length;
				if (textLengthInBytes > textFieldMaxLength) textFieldMaxLength = textLengthInBytes;
			} else if (typeof metadata[key] === "object") {
				const json = JSON.stringify(metadata[key]);
				const jsonLengthInBytes = textEncoder.encode(json).length;
				if (jsonLengthInBytes > jsonFieldMaxLength) jsonFieldMaxLength = jsonLengthInBytes;
			}
		});
	});
	const fields = [];
	for (const [key, value] of Object.entries(sampleMetadata)) {
		const type = typeof value;
		if (key === primaryFieldName || key === partitionKey) {} else if (type === "string") fields.push({
			name: key,
			description: `Metadata String field`,
			data_type: __zilliz_milvus2_sdk_node.DataType.VarChar,
			type_params: { max_length: textFieldMaxLength.toString() }
		});
		else if (type === "number") fields.push({
			name: key,
			description: `Metadata Number field`,
			data_type: __zilliz_milvus2_sdk_node.DataType.Float
		});
		else if (type === "boolean") fields.push({
			name: key,
			description: `Metadata Boolean field`,
			data_type: __zilliz_milvus2_sdk_node.DataType.Bool
		});
		else if (value === null) {} else try {
			fields.push({
				name: key,
				description: `Metadata JSON field`,
				data_type: __zilliz_milvus2_sdk_node.DataType.VarChar,
				type_params: { max_length: jsonFieldMaxLength.toString() }
			});
		} catch {
			throw new Error("Failed to parse metadata field as JSON");
		}
	}
	return fields;
}
function genCollectionName() {
	return `${MILVUS_COLLECTION_NAME_PREFIX}_${uuid.v4().replaceAll("-", "")}`;
}
function getTextFieldMaxLength(documents) {
	let textMaxLength = 0;
	const textEncoder = new TextEncoder();
	for (let i = 0; i < documents.length; i++) {
		const text = documents[i].pageContent;
		const textLengthInBytes = textEncoder.encode(text).length;
		if (textLengthInBytes > textMaxLength) textMaxLength = textLengthInBytes;
	}
	return textMaxLength;
}
function getVectorFieldDim(vectors) {
	if (vectors.length === 0) throw new Error("No vectors found");
	return vectors[0].length;
}
function checkJsonString(value) {
	try {
		const result = JSON.parse(value);
		return {
			isJson: true,
			obj: result
		};
	} catch {
		return {
			isJson: false,
			obj: null
		};
	}
}

//#endregion
exports.Milvus = Milvus;
Object.defineProperty(exports, 'milvus_exports', {
  enumerable: true,
  get: function () {
    return milvus_exports;
  }
});
//# sourceMappingURL=milvus.cjs.map