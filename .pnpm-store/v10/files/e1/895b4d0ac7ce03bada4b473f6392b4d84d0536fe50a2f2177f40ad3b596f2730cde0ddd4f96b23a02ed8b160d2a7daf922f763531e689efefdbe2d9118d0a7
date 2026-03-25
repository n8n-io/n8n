const guessMimetypeFromBase64 = (data) => {
    // Check magic bytes from base64 data
    const bytes = atob(data.substring(0, 20)); // Decode first few bytes
    // PNG: 89 50 4E 47
    if (bytes.charCodeAt(0) === 0x89 &&
        bytes.charCodeAt(1) === 0x50 &&
        bytes.charCodeAt(2) === 0x4e &&
        bytes.charCodeAt(3) === 0x47) {
        return "image/png";
    }
    // JPEG: FF D8 FF
    if (bytes.charCodeAt(0) === 0xff &&
        bytes.charCodeAt(1) === 0xd8 &&
        bytes.charCodeAt(2) === 0xff) {
        return "image/jpeg";
    }
    // GIF: 47 49 46 38
    if (bytes.charCodeAt(0) === 0x47 &&
        bytes.charCodeAt(1) === 0x49 &&
        bytes.charCodeAt(2) === 0x46 &&
        bytes.charCodeAt(3) === 0x38) {
        return "image/gif";
    }
    // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    if (bytes.charCodeAt(0) === 0x52 &&
        bytes.charCodeAt(1) === 0x49 &&
        bytes.charCodeAt(2) === 0x46 &&
        bytes.charCodeAt(3) === 0x46) {
        if (bytes.indexOf("WEBP") !== -1) {
            return "image/webp";
        }
    }
    // PDF: 25 50 44 46 (%PDF)
    if (bytes.charCodeAt(0) === 0x25 &&
        bytes.charCodeAt(1) === 0x50 &&
        bytes.charCodeAt(2) === 0x44 &&
        bytes.charCodeAt(3) === 0x46) {
        return "application/pdf";
    }
    return undefined;
};
export const normalizeFileDataAsDataURL = (fileData, mimeType) => {
    // eslint-disable-next-line no-instanceof/no-instanceof
    if (fileData instanceof URL) {
        return fileData.toString();
    }
    let normalizedFileData;
    if (typeof fileData !== "string") {
        let uint8Array;
        // eslint-disable-next-line no-instanceof/no-instanceof
        if (fileData instanceof Uint8Array) {
            uint8Array = fileData;
        }
        else if (fileData != null &&
            typeof fileData === "object" &&
            "type" in fileData &&
            "data" in fileData &&
            typeof fileData.data === "object" &&
            // eslint-disable-next-line no-instanceof/no-instanceof
            fileData.data instanceof Uint8Array) {
            uint8Array = fileData.data;
            // eslint-disable-next-line no-instanceof/no-instanceof
        }
        else if (fileData instanceof ArrayBuffer) {
            uint8Array = new Uint8Array(fileData);
        }
        if (uint8Array) {
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            normalizedFileData = `data:${mimeType ??
                guessMimetypeFromBase64(base64) ??
                "application/octet-stream"};base64,${base64}`;
        }
        else {
            normalizedFileData = "";
        }
    }
    else {
        if (fileData.startsWith("http://") || fileData.startsWith("https://")) {
            normalizedFileData = fileData;
        }
        else if (!fileData.startsWith("data:")) {
            normalizedFileData = `data:${mimeType ??
                guessMimetypeFromBase64(fileData) ??
                "application/octet-stream"};base64,${fileData}`;
        }
        else {
            normalizedFileData = fileData;
        }
    }
    return normalizedFileData;
};
export const convertMessageToTracedFormat = (message, responseMetadata) => {
    const formattedMessage = {
        ...message,
    };
    if (Array.isArray(message.content)) {
        if (message.role === "assistant") {
            const toolCallBlocks = message.content.filter((block) => {
                return (block != null &&
                    typeof block === "object" &&
                    block.type === "tool-call");
            });
            const toolCalls = toolCallBlocks.map((block) => {
                // AI SDK 4 shim
                let toolArgs = block.input ?? (("args" in block && block.args) || undefined);
                if (typeof toolArgs !== "string") {
                    toolArgs = JSON.stringify(toolArgs);
                }
                return {
                    id: block.toolCallId,
                    type: "function",
                    function: {
                        name: block.toolName,
                        arguments: toolArgs,
                    },
                };
            });
            if (toolCalls.length > 0) {
                formattedMessage.tool_calls = toolCalls;
            }
        }
        const newContent = message.content.map((part) => {
            if (part.type === "file") {
                const { data, mediaType, filename, ...rest } = part;
                return {
                    ...rest,
                    file: {
                        filename,
                        file_data: normalizeFileDataAsDataURL(data, mediaType),
                    },
                };
            }
            else if (part.type === "image") {
                const { image, mediaType, ...rest } = part;
                return {
                    ...rest,
                    type: "image_url",
                    image_url: normalizeFileDataAsDataURL(image, mediaType),
                };
            }
            return part;
        });
        formattedMessage.content = newContent;
    }
    else if (message.content == null && "text" in message) {
        // AI SDK 4 shim
        formattedMessage.content = message.text ?? "";
        if ("toolCalls" in message &&
            Array.isArray(message.toolCalls) &&
            !("tool_calls" in formattedMessage)) {
            formattedMessage.tool_calls = message.toolCalls.map((toolCall) => {
                return {
                    id: toolCall.toolCallId,
                    type: "function",
                    function: { name: toolCall.toolName, arguments: toolCall.args },
                };
            });
        }
    }
    if (responseMetadata != null) {
        formattedMessage.response_metadata = responseMetadata;
    }
    return formattedMessage;
};
