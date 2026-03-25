import { __export } from "../_virtual/rolldown_runtime.js";
import { DynamicTool } from "@langchain/core/tools";

//#region src/tools/aws_lambda.ts
var aws_lambda_exports = {};
__export(aws_lambda_exports, { AWSLambda: () => AWSLambda });
/**
* Class for invoking AWS Lambda functions within the LangChain framework.
* Extends the DynamicTool class.
*/
var AWSLambda = class extends DynamicTool {
	get lc_namespace() {
		return [...super.lc_namespace, "aws_lambda"];
	}
	get lc_secrets() {
		return {
			accessKeyId: "AWS_ACCESS_KEY_ID",
			secretAccessKey: "AWS_SECRET_ACCESS_KEY"
		};
	}
	lambdaConfig;
	constructor({ name, description,...rest }) {
		super({
			name,
			description,
			func: async (input) => this._func(input)
		});
		this.lambdaConfig = rest;
	}
	/** @ignore */
	async _func(input) {
		const { Client, Invoker } = await LambdaImports();
		const clientConstructorArgs = {};
		if (this.lambdaConfig.region) clientConstructorArgs.region = this.lambdaConfig.region;
		if (this.lambdaConfig.accessKeyId && this.lambdaConfig.secretAccessKey) clientConstructorArgs.credentials = {
			accessKeyId: this.lambdaConfig.accessKeyId,
			secretAccessKey: this.lambdaConfig.secretAccessKey
		};
		const lambdaClient = new Client(clientConstructorArgs);
		return new Promise((resolve) => {
			const payloadUint8Array = new TextEncoder().encode(JSON.stringify(input));
			const command = new Invoker({
				FunctionName: this.lambdaConfig.functionName,
				InvocationType: "RequestResponse",
				Payload: payloadUint8Array
			});
			lambdaClient.send(command).then((response) => {
				const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
				resolve(responseData.body ? responseData.body : "request completed.");
			}).catch((error) => {
				console.error("Error invoking Lambda function:", error);
				resolve("failed to complete request");
			});
		});
	}
};
/**
* Helper function that imports the necessary AWS SDK modules for invoking
* the Lambda function. Returns an object that includes the LambdaClient
* and InvokeCommand classes from the AWS SDK.
*/
async function LambdaImports() {
	try {
		const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
		return {
			Client: LambdaClient,
			Invoker: InvokeCommand
		};
	} catch (e) {
		console.error(e);
		throw new Error("Failed to load @aws-sdk/client-lambda'. Please install it eg. `pnpm install @aws-sdk/client-lambda`.");
	}
}

//#endregion
export { AWSLambda, aws_lambda_exports };
//# sourceMappingURL=aws_lambda.js.map