const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const __aws_sdk_client_sfn = require_rolldown_runtime.__toESM(require("@aws-sdk/client-sfn"));

//#region src/tools/aws_sfn.ts
var aws_sfn_exports = {};
require_rolldown_runtime.__export(aws_sfn_exports, {
	DescribeExecutionAWSSfnTool: () => DescribeExecutionAWSSfnTool,
	SendTaskSuccessAWSSfnTool: () => SendTaskSuccessAWSSfnTool,
	StartExecutionAWSSfnTool: () => StartExecutionAWSSfnTool
});
/**
* Class for starting the execution of an AWS Step Function.
*/
var StartExecutionAWSSfnTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "StartExecutionAWSSfnTool";
	}
	sfnConfig;
	name;
	description;
	constructor({ name, description,...rest }) {
		super();
		this.name = name;
		this.description = description;
		this.sfnConfig = rest;
	}
	/**
	* Generates a formatted description for the StartExecutionAWSSfnTool.
	* @param name Name of the state machine.
	* @param description Description of the state machine.
	* @returns A formatted description string.
	*/
	static formatDescription(name, description) {
		return `Use to start executing the ${name} state machine. Use to run ${name} workflows. Whenever you need to start (or execute) an asynchronous workflow (or state machine) about ${description} you should ALWAYS use this. Input should be a valid JSON string.`;
	}
	/** @ignore */
	async _call(input) {
		const clientConstructorArgs = getClientConstructorArgs(this.sfnConfig);
		const sfnClient = new __aws_sdk_client_sfn.SFNClient(clientConstructorArgs);
		return new Promise((resolve) => {
			let payload;
			try {
				payload = JSON.parse(input);
			} catch (e) {
				console.error("Error starting state machine execution:", e);
				resolve("failed to complete request");
			}
			const command = new __aws_sdk_client_sfn.StartExecutionCommand({
				stateMachineArn: this.sfnConfig.stateMachineArn,
				input: JSON.stringify(payload)
			});
			sfnClient.send(command).then((response) => resolve(response.executionArn ? response.executionArn : "request completed.")).catch((error) => {
				console.error("Error starting state machine execution:", error);
				resolve("failed to complete request");
			});
		});
	}
};
/**
* Class for checking the status of an AWS Step Function execution.
*/
var DescribeExecutionAWSSfnTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DescribeExecutionAWSSfnTool";
	}
	name = "describe-execution-aws-sfn";
	description = "This tool should ALWAYS be used for checking the status of any AWS Step Function execution (aka. state machine execution). Input to this tool is a properly formatted AWS Step Function Execution ARN (executionArn). The output is a stringified JSON object containing the executionArn, name, status, startDate, stopDate, input, output, error, and cause of the execution.";
	sfnConfig;
	constructor(config) {
		super(config);
		this.sfnConfig = config;
	}
	/** @ignore */
	async _call(input) {
		const clientConstructorArgs = getClientConstructorArgs(this.sfnConfig);
		const sfnClient = new __aws_sdk_client_sfn.SFNClient(clientConstructorArgs);
		const command = new __aws_sdk_client_sfn.DescribeExecutionCommand({ executionArn: input });
		return await sfnClient.send(command).then((response) => response.executionArn ? JSON.stringify({
			executionArn: response.executionArn,
			name: response.name,
			status: response.status,
			startDate: response.startDate,
			stopDate: response.stopDate,
			input: response.input,
			output: response.output,
			error: response.error,
			cause: response.cause
		}) : "{}").catch((error) => {
			console.error("Error describing state machine execution:", error);
			return "failed to complete request";
		});
	}
};
/**
* Class for sending a task success signal to an AWS Step Function
* execution.
*/
var SendTaskSuccessAWSSfnTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "SendTaskSuccessAWSSfnTool";
	}
	name = "send-task-success-aws-sfn";
	description = "This tool should ALWAYS be used for sending task success to an AWS Step Function execution (aka. statemachine exeuction). Input to this tool is a stringify JSON object containing the taskToken and output.";
	sfnConfig;
	constructor(config) {
		super(config);
		this.sfnConfig = config;
	}
	/** @ignore */
	async _call(input) {
		const clientConstructorArgs = getClientConstructorArgs(this.sfnConfig);
		const sfnClient = new __aws_sdk_client_sfn.SFNClient(clientConstructorArgs);
		let payload;
		try {
			payload = JSON.parse(input);
		} catch (e) {
			console.error("Error starting state machine execution:", e);
			return "failed to complete request";
		}
		const command = new __aws_sdk_client_sfn.SendTaskSuccessCommand({
			taskToken: payload.taskToken,
			output: JSON.stringify(payload.output)
		});
		return await sfnClient.send(command).then(() => "request completed.").catch((error) => {
			console.error("Error sending task success to state machine execution:", error);
			return "failed to complete request";
		});
	}
};
/**
* Helper function to construct the AWS SFN client.
*/
function getClientConstructorArgs(config) {
	const clientConstructorArgs = {};
	if (config.region) clientConstructorArgs.region = config.region;
	if (config.accessKeyId && config.secretAccessKey) clientConstructorArgs.credentials = {
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey
	};
	return clientConstructorArgs;
}

//#endregion
exports.DescribeExecutionAWSSfnTool = DescribeExecutionAWSSfnTool;
exports.SendTaskSuccessAWSSfnTool = SendTaskSuccessAWSSfnTool;
exports.StartExecutionAWSSfnTool = StartExecutionAWSSfnTool;
Object.defineProperty(exports, 'aws_sfn_exports', {
  enumerable: true,
  get: function () {
    return aws_sfn_exports;
  }
});
//# sourceMappingURL=aws_sfn.cjs.map