'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.extractWebhookLastNodeResponse = extractWebhookLastNodeResponse;
const di_1 = require('@n8n/di');
const get_1 = __importDefault(require('lodash/get'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
async function extractWebhookLastNodeResponse(context, responseDataType, lastNodeTaskData) {
	if (responseDataType === 'firstEntryJson') {
		return extractFirstEntryJsonFromTaskData(context, lastNodeTaskData);
	}
	if (responseDataType === 'firstEntryBinary') {
		return await extractFirstEntryBinaryFromTaskData(context, lastNodeTaskData);
	}
	if (responseDataType === 'noData') {
		return (0, n8n_workflow_1.createResultOk)({
			type: 'static',
			body: undefined,
			contentType: undefined,
		});
	}
	return extractAllEntriesJsonFromTaskData(lastNodeTaskData);
}
function extractFirstEntryJsonFromTaskData(context, lastNodeTaskData) {
	if (lastNodeTaskData.data.main[0][0] === undefined) {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError('No item to return was found'),
		);
	}
	let lastNodeFirstJsonItem = lastNodeTaskData.data.main[0][0].json;
	const responsePropertyName =
		context.evaluateSimpleWebhookDescriptionExpression('responsePropertyName');
	if (responsePropertyName !== undefined) {
		lastNodeFirstJsonItem = (0, get_1.default)(lastNodeFirstJsonItem, responsePropertyName);
	}
	const responseContentType =
		context.evaluateSimpleWebhookDescriptionExpression('responseContentType');
	return (0, n8n_workflow_1.createResultOk)({
		type: 'static',
		body: lastNodeFirstJsonItem,
		contentType: responseContentType,
	});
}
async function extractFirstEntryBinaryFromTaskData(context, lastNodeTaskData) {
	const lastNodeFirstJsonItem = lastNodeTaskData.data.main[0][0];
	if (lastNodeFirstJsonItem === undefined) {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError('No item was found to return'),
		);
	}
	if (lastNodeFirstJsonItem.binary === undefined) {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError('No binary data was found to return'),
		);
	}
	const responseBinaryPropertyName = context.evaluateSimpleWebhookDescriptionExpression(
		'responseBinaryPropertyName',
		undefined,
		'data',
	);
	if (responseBinaryPropertyName === undefined) {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError("No 'responseBinaryPropertyName' is set"),
		);
	} else if (typeof responseBinaryPropertyName !== 'string') {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError("'responseBinaryPropertyName' is not a string"),
		);
	}
	const binaryData = lastNodeFirstJsonItem.binary[responseBinaryPropertyName];
	if (binaryData === undefined) {
		return (0, n8n_workflow_1.createResultError)(
			new n8n_workflow_1.OperationalError(
				`The binary property '${responseBinaryPropertyName}' which should be returned does not exist`,
			),
		);
	}
	if (binaryData.id) {
		const stream = await di_1.Container.get(n8n_core_1.BinaryDataService).getAsStream(
			binaryData.id,
		);
		return (0, n8n_workflow_1.createResultOk)({
			type: 'stream',
			stream,
			contentType: binaryData.mimeType,
		});
	} else {
		return (0, n8n_workflow_1.createResultOk)({
			type: 'static',
			body: Buffer.from(binaryData.data, n8n_workflow_1.BINARY_ENCODING),
			contentType: binaryData.mimeType,
		});
	}
}
function extractAllEntriesJsonFromTaskData(lastNodeTaskData) {
	const data = [];
	for (const entry of lastNodeTaskData.data.main[0]) {
		data.push(entry.json);
	}
	return (0, n8n_workflow_1.createResultOk)({
		type: 'static',
		body: data,
		contentType: undefined,
	});
}
//# sourceMappingURL=webhook-last-node-response-extractor.js.map
