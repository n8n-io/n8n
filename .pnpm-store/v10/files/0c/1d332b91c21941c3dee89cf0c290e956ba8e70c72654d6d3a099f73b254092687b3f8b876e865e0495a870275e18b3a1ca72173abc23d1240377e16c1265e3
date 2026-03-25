
//#region src/utils/compat.ts
const formatToMimeType = {
	document(format) {
		switch (format) {
			case "text/csv": return "csv";
			case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return "docx";
			case "text/html": return "html";
			case "text/markdown": return "md";
			case "application/pdf": return "pdf";
			case "text/plain": return "txt";
			case "application/vnd.ms-excel": return "xls";
			case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": return "xlsx";
			default: return format;
		}
	},
	image(format) {
		switch (format) {
			case "image/gif": return "gif";
			case "image/jpeg": return "jpeg";
			case "image/png": return "png";
			case "image/webp": return "webp";
			default: return format;
		}
	},
	video(format) {
		switch (format) {
			case "video/flv": return "flv";
			case "video/mkv": return "mkv";
			case "video/mov": return "mov";
			case "video/mp4": return "mp4";
			case "video/mpeg": return "mpeg";
			case "video/mpg": return "mpg";
			case "video/three_gp": return "three_gp";
			case "video/webm": return "webm";
			case "video/wmv": return "wmv";
			default: return format;
		}
	}
};
function convertCitation(annotation) {
	return {
		sourceContent: [{ text: typeof annotation.citedText === "string" ? annotation.citedText : "" }],
		location: { documentChunk: {
			documentIndex: typeof annotation.source === "string" ? Number(annotation.source) : void 0,
			start: typeof annotation.startIndex === "number" ? annotation.startIndex : void 0,
			end: typeof annotation.endIndex === "number" ? annotation.endIndex : void 0
		} }
	};
}
function convertFromV1ToChatBedrockConverseMessage(message) {
	const modelProvider = message.response_metadata?.model_provider;
	function* iterateContent() {
		for (const block of message.contentBlocks) if (block.type === "text") if (block.annotations?.length) yield { citationsContent: {
			content: [{ text: block.text }],
			citations: block.annotations.map(convertCitation)
		} };
		else yield { text: block.text };
		else if (block.type === "audio") continue;
		else if (block.type === "code_interpreter_call") continue;
		else if (block.type === "code_interpreter_result") continue;
		else if (block.type === "file") {
			const format = formatToMimeType.document(block.mimeType ?? "");
			if (block.data) {
				const bytes = typeof block.data === "string" ? Uint8Array.from(Buffer.from(block.data, "base64")) : block.data;
				yield { document: {
					name: block.id,
					format,
					source: { bytes }
				} };
			} else if (block.fileId && block.fileId.startsWith("s3://")) yield { document: {
				name: block.id,
				format,
				source: { s3Location: { uri: block.fileId } }
			} };
		} else if (block.type === "image") {
			const format = formatToMimeType.image(block.mimeType ?? "");
			if (block.data) {
				const bytes = typeof block.data === "string" ? Uint8Array.from(Buffer.from(block.data, "base64")) : block.data;
				yield { image: {
					format,
					source: { bytes }
				} };
			} else if (block.fileId && block.fileId.startsWith("s3://")) yield { image: {
				format,
				source: { s3Location: { uri: block.fileId } }
			} };
		} else if (block.type === "invalid_tool_call") continue;
		else if (block.type === "reasoning") yield { reasoningContent: { reasoningText: { text: block.reasoning } } };
		else if (block.type === "server_tool_call") continue;
		else if (block.type === "server_tool_call_chunk") continue;
		else if (block.type === "server_tool_call_result") continue;
		else if (block.type === "text-plain") continue;
		else if (block.type === "tool_call") yield { toolUse: {
			toolUseId: block.id,
			name: block.name,
			input: block.args
		} };
		else if (block.type === "tool_call_chunk") continue;
		else if (block.type === "video") {
			const format = formatToMimeType.video(block.mimeType ?? "");
			if (block.data) {
				const bytes = typeof block.data === "string" ? Uint8Array.from(Buffer.from(block.data, "base64")) : block.data;
				yield { video: {
					format,
					source: { bytes }
				} };
			} else if (block.fileId && block.fileId.startsWith("s3://")) yield { video: {
				format,
				source: { s3Location: { uri: block.fileId } }
			} };
		} else if (block.type === "web_search_call") continue;
		else if (block.type === "web_search_result") continue;
		else if (block.type === "non_standard" && modelProvider === "bedrock-converse") yield block;
	}
	return Array.from(iterateContent());
}

//#endregion
exports.convertFromV1ToChatBedrockConverseMessage = convertFromV1ToChatBedrockConverseMessage;
//# sourceMappingURL=compat.cjs.map