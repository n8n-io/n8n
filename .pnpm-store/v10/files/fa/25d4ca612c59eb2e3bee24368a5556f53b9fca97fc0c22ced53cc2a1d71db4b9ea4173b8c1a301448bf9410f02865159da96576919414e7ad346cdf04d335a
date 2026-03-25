import { __export } from "../_virtual/rolldown_runtime.js";
import { GoogleVertexAIConnection } from "../utils/googlevertexai-connection.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { GoogleAuth } from "google-auth-library";
import * as uuid from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";
import flatten from "flat";

//#region src/vectorstores/googlevertexai.ts
var googlevertexai_exports = {};
__export(googlevertexai_exports, {
	IdDocument: () => IdDocument,
	MatchingEngine: () => MatchingEngine
});
/**
* A Document that optionally includes the ID of the document.
*/
var IdDocument = class extends Document {
	id;
	constructor(fields) {
		super(fields);
		this.id = fields.id;
	}
};
var IndexEndpointConnection = class extends GoogleVertexAIConnection {
	indexEndpoint;
	constructor(fields, caller) {
		super(fields, caller, new GoogleAuth(fields.authOptions));
		this.indexEndpoint = fields.indexEndpoint;
	}
	async buildUrl() {
		const projectId = await this.client.getProjectId();
		const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexEndpoints/${this.indexEndpoint}`;
		return url;
	}
	buildMethod() {
		return "GET";
	}
	async request(options) {
		return this._request(void 0, options);
	}
};
var RemoveDatapointConnection = class extends GoogleVertexAIConnection {
	index;
	constructor(fields, caller) {
		super(fields, caller, new GoogleAuth(fields.authOptions));
		this.index = fields.index;
	}
	async buildUrl() {
		const projectId = await this.client.getProjectId();
		const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexes/${this.index}:removeDatapoints`;
		return url;
	}
	buildMethod() {
		return "POST";
	}
	async request(datapointIds, options) {
		const data = { datapointIds };
		return this._request(data, options);
	}
};
var UpsertDatapointConnection = class extends GoogleVertexAIConnection {
	index;
	constructor(fields, caller) {
		super(fields, caller, new GoogleAuth(fields.authOptions));
		this.index = fields.index;
	}
	async buildUrl() {
		const projectId = await this.client.getProjectId();
		const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexes/${this.index}:upsertDatapoints`;
		return url;
	}
	buildMethod() {
		return "POST";
	}
	async request(datapoints, options) {
		const data = { datapoints };
		return this._request(data, options);
	}
};
var FindNeighborsConnection = class extends GoogleVertexAIConnection {
	indexEndpoint;
	deployedIndexId;
	constructor(params, caller) {
		super(params, caller, new GoogleAuth(params.authOptions));
		this.indexEndpoint = params.indexEndpoint;
		this.deployedIndexId = params.deployedIndexId;
	}
	async buildUrl() {
		const projectId = await this.client.getProjectId();
		const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexEndpoints/${this.indexEndpoint}:findNeighbors`;
		return url;
	}
	buildMethod() {
		return "POST";
	}
	async request(request, options) {
		return this._request(request, options);
	}
};
/**
* A class that represents a connection to a Google Vertex AI Matching Engine
* instance.
*/
var MatchingEngine = class MatchingEngine extends VectorStore {
	/**
	* Docstore that retains the document, stored by ID
	*/
	docstore;
	/**
	* The host to connect to for queries and upserts.
	*/
	apiEndpoint;
	apiVersion = "v1";
	endpoint = "us-central1-aiplatform.googleapis.com";
	location = "us-central1";
	/**
	* The id for the index endpoint
	*/
	indexEndpoint;
	/**
	* The id for the index
	*/
	index;
	/**
	* Explicitly set Google Auth credentials if you cannot get them from google auth application-default login
	* This is useful for serverless or autoscaling environments like Fargate
	*/
	authOptions;
	/**
	* The id for the "deployed index", which is an identifier in the
	* index endpoint that references the index (but is not the index id)
	*/
	deployedIndexId;
	callerParams;
	callerOptions;
	caller;
	indexEndpointClient;
	removeDatapointClient;
	upsertDatapointClient;
	constructor(embeddings, args) {
		super(embeddings, args);
		this.embeddings = embeddings;
		this.docstore = args.docstore;
		this.apiEndpoint = args.apiEndpoint ?? this.apiEndpoint;
		this.deployedIndexId = args.deployedIndexId ?? this.deployedIndexId;
		this.apiVersion = args.apiVersion ?? this.apiVersion;
		this.endpoint = args.endpoint ?? this.endpoint;
		this.location = args.location ?? this.location;
		this.indexEndpoint = args.indexEndpoint ?? this.indexEndpoint;
		this.index = args.index ?? this.index;
		this.authOptions = args.authOptions ?? this.authOptions;
		this.callerParams = args.callerParams ?? this.callerParams;
		this.callerOptions = args.callerOptions ?? this.callerOptions;
		this.caller = new AsyncCaller(this.callerParams || {});
		const indexClientParams = {
			endpoint: this.endpoint,
			location: this.location,
			apiVersion: this.apiVersion,
			indexEndpoint: this.indexEndpoint,
			authOptions: this.authOptions
		};
		this.indexEndpointClient = new IndexEndpointConnection(indexClientParams, this.caller);
		const removeClientParams = {
			endpoint: this.endpoint,
			location: this.location,
			apiVersion: this.apiVersion,
			index: this.index,
			authOptions: this.authOptions
		};
		this.removeDatapointClient = new RemoveDatapointConnection(removeClientParams, this.caller);
		const upsertClientParams = {
			endpoint: this.endpoint,
			location: this.location,
			apiVersion: this.apiVersion,
			index: this.index,
			authOptions: this.authOptions
		};
		this.upsertDatapointClient = new UpsertDatapointConnection(upsertClientParams, this.caller);
	}
	_vectorstoreType() {
		return "googlevertexai";
	}
	async addDocuments(documents) {
		const texts = documents.map((doc) => doc.pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);
		return this.addVectors(vectors, documents);
	}
	async addVectors(vectors, documents) {
		if (vectors.length !== documents.length) throw new Error(`Vectors and metadata must have the same length`);
		const datapoints = vectors.map((vector, idx) => this.buildDatapoint(vector, documents[idx]));
		const options = {};
		const response = await this.upsertDatapointClient.request(datapoints, options);
		if (Object.keys(response?.data ?? {}).length === 0) {
			const idDoc = documents;
			const docsToStore = {};
			idDoc.forEach((doc) => {
				if (doc.id) docsToStore[doc.id] = doc;
			});
			await this.docstore.add(docsToStore);
		}
	}
	cleanMetadata(documentMetadata) {
		function getStringArrays(prefix, m) {
			let ret = {};
			Object.keys(m).forEach((key) => {
				const newPrefix = prefix.length > 0 ? `${prefix}.${key}` : key;
				const val = m[key];
				if (!val) {} else if (Array.isArray(val)) ret[newPrefix] = val.map((v) => `${v}`);
				else if (typeof val === "object") {
					const subArrays = getStringArrays(newPrefix, val);
					ret = {
						...ret,
						...subArrays
					};
				}
			});
			return ret;
		}
		const stringArrays = getStringArrays("", documentMetadata);
		const flatMetadata = flatten(documentMetadata);
		Object.keys(flatMetadata).forEach((key) => {
			Object.keys(stringArrays).forEach((arrayKey) => {
				const matchKey = `${arrayKey}.`;
				if (key.startsWith(matchKey)) delete flatMetadata[key];
			});
		});
		const metadata = {
			...flatMetadata,
			...stringArrays
		};
		return metadata;
	}
	/**
	* Given the metadata from a document, convert it to an array of Restriction
	* objects that may be passed to the Matching Engine and stored.
	* The default implementation flattens any metadata and includes it as
	* an "allowList". Subclasses can choose to convert some of these to
	* "denyList" items or to add additional restrictions (for example, to format
	* dates into a different structure or to add additional restrictions
	* based on the date).
	* @param documentMetadata - The metadata from a document
	* @returns a Restriction[] (or an array of a subclass, from the FilterType)
	*/
	metadataToRestrictions(documentMetadata) {
		const metadata = this.cleanMetadata(documentMetadata);
		const restrictions = [];
		for (const key of Object.keys(metadata)) {
			let valArray;
			const val = metadata[key];
			if (val === null) valArray = null;
			else if (Array.isArray(val) && val.length > 0) valArray = val;
			else valArray = [`${val}`];
			if (valArray) {
				const listType = "allowList";
				const restriction = {
					namespace: key,
					[listType]: valArray
				};
				restrictions.push(restriction);
			}
		}
		return restrictions;
	}
	/**
	* Create an index datapoint for the vector and document id.
	* If an id does not exist, create it and set the document to its value.
	* @param vector
	* @param document
	*/
	buildDatapoint(vector, document) {
		if (!document.id) document.id = uuid.v4();
		const ret = {
			datapointId: document.id,
			featureVector: vector
		};
		const restrictions = this.metadataToRestrictions(document.metadata);
		if (restrictions?.length > 0) ret.restricts = restrictions;
		return ret;
	}
	async delete(params) {
		const options = {};
		await this.removeDatapointClient.request(params.ids, options);
	}
	async similaritySearchVectorWithScore(query, k, filter) {
		const deployedIndexId = await this.getDeployedIndexId();
		const requestQuery = {
			neighborCount: k,
			datapoint: {
				datapointId: `0`,
				featureVector: query
			}
		};
		if (filter) requestQuery.datapoint.restricts = filter;
		const request = {
			deployedIndexId,
			queries: [requestQuery]
		};
		const apiEndpoint = await this.getPublicAPIEndpoint();
		const findNeighborsParams = {
			endpoint: apiEndpoint,
			indexEndpoint: this.indexEndpoint,
			apiVersion: this.apiVersion,
			location: this.location,
			deployedIndexId,
			authOptions: this.authOptions
		};
		const connection = new FindNeighborsConnection(findNeighborsParams, this.caller);
		const options = {};
		const response = await connection.request(request, options);
		const nearestNeighbors = response?.data?.nearestNeighbors ?? [];
		const nearestNeighbor = nearestNeighbors[0];
		const neighbors = nearestNeighbor?.neighbors ?? [];
		const ret = await Promise.all(neighbors.map(async (neighbor) => {
			const id = neighbor?.datapoint?.datapointId;
			const distance = neighbor?.distance;
			let doc;
			try {
				doc = await this.docstore.search(id);
			} catch (xx) {
				console.error(xx);
				console.warn([
					`Document with id "${id}" is missing from the backing docstore.`,
					`This can occur if you clear the docstore without deleting from the corresponding Matching Engine index.`,
					`To resolve this, you should call .delete() with this id as part of the "ids" parameter.`
				].join("\n"));
				doc = new Document({ pageContent: `Missing document ${id}` });
			}
			doc.id ??= id;
			return [doc, distance];
		}));
		return ret;
	}
	/**
	* For this index endpoint, figure out what API Endpoint URL and deployed
	* index ID should be used to do upserts and queries.
	* Also sets the `apiEndpoint` and `deployedIndexId` property for future use.
	* @return The URL
	*/
	async determinePublicAPIEndpoint() {
		const response = await this.indexEndpointClient.request(this.callerOptions);
		const publicEndpointDomainName = response?.data?.publicEndpointDomainName;
		this.apiEndpoint = publicEndpointDomainName;
		const indexPathPattern = /projects\/.+\/locations\/.+\/indexes\/(.+)$/;
		const deployedIndexes = response?.data?.deployedIndexes ?? [];
		const deployedIndex = deployedIndexes.find((index) => {
			const deployedIndexPath = index.index;
			const match = deployedIndexPath.match(indexPathPattern);
			if (match) {
				const [, potentialIndexId] = match;
				if (potentialIndexId === this.index) return true;
			}
			return false;
		});
		if (deployedIndex) this.deployedIndexId = deployedIndex.id;
		return {
			apiEndpoint: this.apiEndpoint,
			deployedIndexId: this.deployedIndexId
		};
	}
	async getPublicAPIEndpoint() {
		return this.apiEndpoint ?? (await this.determinePublicAPIEndpoint()).apiEndpoint;
	}
	async getDeployedIndexId() {
		return this.deployedIndexId ?? (await this.determinePublicAPIEndpoint()).deployedIndexId;
	}
	static async fromTexts(texts, metadatas, embeddings, dbConfig) {
		const docs = texts.map((text, index) => ({
			pageContent: text,
			metadata: Array.isArray(metadatas) ? metadatas[index] : metadatas
		}));
		return this.fromDocuments(docs, embeddings, dbConfig);
	}
	static async fromDocuments(docs, embeddings, dbConfig) {
		const ret = new MatchingEngine(embeddings, dbConfig);
		await ret.addDocuments(docs);
		return ret;
	}
};

//#endregion
export { IdDocument, MatchingEngine, googlevertexai_exports };
//# sourceMappingURL=googlevertexai.js.map