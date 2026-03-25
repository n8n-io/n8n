const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const js_yaml = require_rolldown_runtime.__toESM(require("js-yaml"));

//#region src/util/openapi.ts
var OpenAPISpec = class OpenAPISpec {
	constructor(document) {
		this.document = document;
	}
	get baseUrl() {
		return this.document.servers ? this.document.servers[0].url : void 0;
	}
	getPathsStrict() {
		if (!this.document.paths) throw new Error("No paths found in spec");
		return this.document.paths;
	}
	getParametersStrict() {
		if (!this.document.components?.parameters) throw new Error("No parameters found in spec");
		return this.document.components.parameters;
	}
	getSchemasStrict() {
		if (!this.document.components?.schemas) throw new Error("No schemas found in spec.");
		return this.document.components.schemas;
	}
	getRequestBodiesStrict() {
		if (!this.document.components?.requestBodies) throw new Error("No request body found in spec.");
		return this.document.components.requestBodies;
	}
	getPathStrict(path) {
		const pathItem = this.getPathsStrict()[path];
		if (pathItem === void 0) throw new Error(`No path found for "${path}".`);
		return pathItem;
	}
	getReferencedParameter(ref) {
		const refComponents = ref.$ref.split("/");
		const refName = refComponents[refComponents.length - 1];
		if (this.getParametersStrict()[refName] === void 0) throw new Error(`No parameter found for "${refName}".`);
		return this.getParametersStrict()[refName];
	}
	getRootReferencedParameter(ref) {
		let parameter = this.getReferencedParameter(ref);
		while (parameter.$ref !== void 0) parameter = this.getReferencedParameter(parameter);
		return parameter;
	}
	getReferencedSchema(ref) {
		const refComponents = ref.$ref.split("/");
		const refName = refComponents[refComponents.length - 1];
		const schema = this.getSchemasStrict()[refName];
		if (schema === void 0) throw new Error(`No schema found for "${refName}".`);
		return schema;
	}
	getSchema(schema) {
		if (schema.$ref !== void 0) return this.getReferencedSchema(schema);
		return schema;
	}
	getRootReferencedSchema(ref) {
		let schema = this.getReferencedSchema(ref);
		while (schema.$ref !== void 0) schema = this.getReferencedSchema(schema);
		return schema;
	}
	getReferencedRequestBody(ref) {
		const refComponents = ref.$ref.split("/");
		const refName = refComponents[refComponents.length - 1];
		const requestBodies = this.getRequestBodiesStrict();
		if (requestBodies[refName] === void 0) throw new Error(`No request body found for "${refName}"`);
		return requestBodies[refName];
	}
	getRootReferencedRequestBody(ref) {
		let requestBody = this.getReferencedRequestBody(ref);
		while (requestBody.$ref !== void 0) requestBody = this.getReferencedRequestBody(requestBody);
		return requestBody;
	}
	getMethodsForPath(path) {
		const pathItem = this.getPathStrict(path);
		const possibleMethods = [
			"get",
			"put",
			"post",
			"delete",
			"options",
			"head",
			"patch",
			"trace"
		];
		return possibleMethods.filter((possibleMethod) => pathItem[possibleMethod] !== void 0);
	}
	getParametersForPath(path) {
		const pathItem = this.getPathStrict(path);
		if (pathItem.parameters === void 0) return [];
		return pathItem.parameters.map((parameter) => {
			if (parameter.$ref !== void 0) return this.getRootReferencedParameter(parameter);
			return parameter;
		});
	}
	getOperation(path, method) {
		const pathItem = this.getPathStrict(path);
		if (pathItem[method] === void 0) throw new Error(`No ${method} method found for "path".`);
		return pathItem[method];
	}
	getParametersForOperation(operation) {
		if (operation.parameters === void 0) return [];
		return operation.parameters.map((parameter) => {
			if (parameter.$ref !== void 0) return this.getRootReferencedParameter(parameter);
			return parameter;
		});
	}
	getRequestBodyForOperation(operation) {
		const { requestBody } = operation;
		if (requestBody?.$ref !== void 0) return this.getRootReferencedRequestBody(requestBody);
		return requestBody;
	}
	static getCleanedOperationId(operation, path, method) {
		let { operationId } = operation;
		if (operationId === void 0) {
			const updatedPath = path.replaceAll(/[^a-zA-Z0-9]/g, "_");
			operationId = `${updatedPath.startsWith("/") ? updatedPath.slice(1) : updatedPath}_${method}`;
		}
		return operationId.replaceAll(/-/g, "_").replaceAll(/\./g, "_").replaceAll(/\//g, "_");
	}
	static alertUnsupportedSpec(document) {
		const warningMessage = "This may result in degraded performance. Convert your OpenAPI spec to 3.1.0 for better support.";
		const swaggerVersion = document.swagger;
		const openAPIVersion = document.openapi;
		if (openAPIVersion !== void 0 && openAPIVersion !== "3.1.0") console.warn(`Attempting to load an OpenAPI ${openAPIVersion} spec. ${warningMessage}`);
		else if (swaggerVersion !== void 0) console.warn(`Attempting to load a Swagger ${swaggerVersion} spec. ${warningMessage}`);
		else throw new Error(`Attempting to load an unsupported spec:\n\n${JSON.stringify(document, null, 2)}.`);
	}
	static fromObject(document) {
		OpenAPISpec.alertUnsupportedSpec(document);
		return new OpenAPISpec(document);
	}
	static fromString(rawString) {
		let document;
		try {
			document = JSON.parse(rawString);
		} catch {
			document = js_yaml.load(rawString);
		}
		return OpenAPISpec.fromObject(document);
	}
	static async fromURL(url) {
		const response = await fetch(url);
		const rawDocument = await response.text();
		return OpenAPISpec.fromString(rawDocument);
	}
};

//#endregion
exports.OpenAPISpec = OpenAPISpec;
//# sourceMappingURL=openapi.cjs.map